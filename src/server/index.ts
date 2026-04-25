import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish.js";
import {
  ExchangePerilDirect,
  PauseKey,
} from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";

async function main() {
  console.log("Starting Peril server...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("Connected to RabbitMQ");

  const ch = await conn.createConfirmChannel();
  const state: PlayingState = { isPaused: true };
  await publishJSON(ch, ExchangePerilDirect, PauseKey, state);
  console.log(`Published pause message to ${ExchangePerilDirect}/${PauseKey}`);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => resolve());
  });

  console.log("Shutting down Peril server...");
  await conn.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
