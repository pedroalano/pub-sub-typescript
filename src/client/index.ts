import amqp from "amqplib";
import { clientWelcome } from "../internal/gamelogic/gamelogic.js";
import {
  declareAndBind,
  SimpleQueueType,
} from "../internal/pubsub/declare.js";
import {
  ExchangePerilDirect,
  PauseKey,
} from "../internal/routing/routing.js";

async function main() {
  console.log("Starting Peril client...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("Connected to RabbitMQ");

  const username = await clientWelcome();

  const [, queue] = await declareAndBind(
    conn,
    ExchangePerilDirect,
    `${PauseKey}.${username}`,
    PauseKey,
    SimpleQueueType.Transient,
  );
  console.log(`Queue ${queue.queue} declared and bound to ${ExchangePerilDirect}`);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => resolve());
  });

  console.log("Shutting down Peril client...");
  await conn.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
