import type { ConfirmChannel } from "amqplib";

export function publishJSON<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T,
): Promise<void> {
  const buf = Buffer.from(JSON.stringify(value));
  return new Promise((resolve, reject) => {
    ch.publish(
      exchange,
      routingKey,
      buf,
      { contentType: "application/json" },
      (err) => (err ? reject(err) : resolve()),
    );
  });
}
