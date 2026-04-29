import amqp from "amqplib";
import { SimpleQueueType } from "../internal/pubsub/declare.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import {
  AckType,
  subscribeMsgPack,
} from "../internal/pubsub/subscribe.js";
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
import { writeLog, type GameLog } from "../internal/gamelogic/logs.js";

async function main() {
  console.log("Starting Peril server...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("Connected to RabbitMQ");

  await subscribeMsgPack<GameLog>(
    conn,
    ExchangePerilTopic,
    GameLogSlug,
    `${GameLogSlug}.*`,
    SimpleQueueType.Durable,
    async (log) => {
      try {
        await writeLog(log);
        process.stdout.write("> ");
        return AckType.Ack;
      } catch (err) {
        console.error("writeLog failed:", err);
        return AckType.NackRequeue;
      }
    },
  );
  console.log(`Subscribed to ${GameLogSlug} on ${ExchangePerilTopic}`);

  const ch = await conn.createConfirmChannel();

  // Used to run the server from a non-interactive source, like the multiserver.sh file
  if (!process.stdin.isTTY) {
    console.log("Non-interactive mode: skipping command input.");
    return;
  }

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
