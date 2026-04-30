import type amqp from "amqplib";
import { decode } from "@msgpack/msgpack";
import { declareAndBind, SimpleQueueType } from "./declare.js";

export enum AckType {
  Ack,
  NackRequeue,
  NackDiscard,
}

export async function subscribe<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  routingKey: string,
  simpleQueueType: SimpleQueueType,
  handler: (data: T) => Promise<AckType> | AckType,
  deserializer: (data: Buffer) => T,
): Promise<void> {
  const [ch, queue] = await declareAndBind(
    conn,
    exchange,
    queueName,
    routingKey,
    simpleQueueType,
  );
  await ch.prefetch(10);
  await ch.consume(queue.queue, async (message: amqp.ConsumeMessage | null) => {
    if (!message) return;
    const data = deserializer(message.content);
    const ackType = await handler(data);
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

export function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => Promise<AckType> | AckType,
): Promise<void> {
  return subscribe<T>(
    conn,
    exchange,
    queueName,
    key,
    queueType,
    handler,
    (buf) => JSON.parse(buf.toString()) as T,
  );
}

export function subscribeMsgPack<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => Promise<AckType> | AckType,
): Promise<void> {
  return subscribe<T>(
    conn,
    exchange,
    queueName,
    key,
    queueType,
    handler,
    (buf) => decode(buf) as T,
  );
}
