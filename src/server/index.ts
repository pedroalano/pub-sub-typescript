import amqp from "amqplib";
import {
  declareAndBind,
  SimpleQueueType,
} from "../internal/pubsub/declare.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import {
  ExchangePerilDirect,
  ExchangePerilTopic,
  GameLogSlug,
  PauseKey,
} from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";
import {
  getInput,
  printServerHelp,
} from "../internal/gamelogic/gamelogic.js";

async function main() {
  console.log("Starting Peril server...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("Connected to RabbitMQ");

  await declareAndBind(
    conn,
    ExchangePerilTopic,
    GameLogSlug,
    `${GameLogSlug}.*`,
    SimpleQueueType.Durable,
  );
  console.log(`Declared durable queue ${GameLogSlug} bound to ${ExchangePerilTopic}`);

  const ch = await conn.createConfirmChannel();
  printServerHelp();

  while (true) {
    const words = await getInput("> ");
    if (words.length === 0 || words[0] === "") continue;
    const cmd = words[0];
    if (cmd === "pause") {
      console.log("Sending pause message...");
      const state: PlayingState = { isPaused: true };
      await publishJSON(ch, ExchangePerilDirect, PauseKey, state);
    } else if (cmd === "resume") {
      console.log("Sending resume message...");
      const state: PlayingState = { isPaused: false };
      await publishJSON(ch, ExchangePerilDirect, PauseKey, state);
    } else if (cmd === "quit") {
      console.log("Exiting...");
      break;
    } else {
      console.log(`Unknown command: ${cmd}`);
    }
  }

  await conn.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
