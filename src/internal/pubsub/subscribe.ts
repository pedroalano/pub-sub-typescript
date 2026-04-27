import type amqp from "amqplib";
import { declareAndBind, SimpleQueueType } from "./declare.js";

export enum AckType {
  Ack,
  NackRequeue,
  NackDiscard,
}

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => AckType,
): Promise<void> {
  const [ch, queue] = await declareAndBind(
    conn,
    exchange,
    queueName,
    key,
    queueType,
  );
  await ch.consume(queue.queue, (message: amqp.ConsumeMessage | null) => {
    if (!message) return;
    const data = JSON.parse(message.content.toString()) as T;
    const ackType = handler(data);
    switch (ackType) {
      case AckType.Ack:
        console.log("Ack");
        ch.ack(message);
        break;
      case AckType.NackRequeue:
        console.log("NackRequeue");
        ch.nack(message, false, true);
        break;
      case AckType.NackDiscard:
        console.log("NackDiscard");
        ch.nack(message, false, false);
        break;
    }
  });
}
