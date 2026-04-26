import type amqp from "amqplib";
import { declareAndBind, SimpleQueueType } from "./declare.js";

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => void,
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
    handler(data);
    ch.ack(message);
  });
}
