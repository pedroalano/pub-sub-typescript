import amqp, { type ConfirmChannel } from "amqplib";
import {
  clientWelcome,
  commandStatus,
  getInput,
  getMaliciousLog,
  printClientHelp,
  printQuit,
} from "../internal/gamelogic/gamelogic.js";
import { GameState, type PlayingState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { SimpleQueueType } from "../internal/pubsub/declare.js";
import { subscribeJSON } from "../internal/pubsub/subscribe.js";
import { publishJSON, publishMsgPack } from "../internal/pubsub/publish.js";
import type { GameLog } from "../internal/gamelogic/logs.js";
import {
  ArmyMovesPrefix,
  ExchangePerilDirect,
  ExchangePerilTopic,
  GameLogSlug,
  PauseKey,
  WarRecognitionsPrefix,
} from "../internal/routing/routing.js";
import type { ArmyMove, RecognitionOfWar } from "../internal/gamelogic/gamedata.js";
import { handlerMove, handlerPause, handlerWar } from "./handlers.js";

export function publishGameLog(
  ch: ConfirmChannel,
  username: string,
  message: string,
): Promise<void> {
  const log: GameLog = {
    username,
    message,
    currentTime: new Date(),
  };
  return publishMsgPack(
    ch,
    ExchangePerilTopic,
    `${GameLogSlug}.${username}`,
    log,
  );
}

async function main() {
  console.log("Starting Peril client...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("Connected to RabbitMQ");

  const username = await clientWelcome();

  const gs = new GameState(username);

  const publishCh = await conn.createConfirmChannel();

  await subscribeJSON<PlayingState>(
    conn,
    ExchangePerilDirect,
    `${PauseKey}.${username}`,
    PauseKey,
    SimpleQueueType.Transient,
    handlerPause(gs),
  );

  await subscribeJSON<ArmyMove>(
    conn,
    ExchangePerilTopic,
    `${ArmyMovesPrefix}.${username}`,
    `${ArmyMovesPrefix}.*`,
    SimpleQueueType.Transient,
    handlerMove(gs, publishCh, username),
  );

  await subscribeJSON<RecognitionOfWar>(
    conn,
    ExchangePerilTopic,
    WarRecognitionsPrefix,
    `${WarRecognitionsPrefix}.*`,
    SimpleQueueType.Durable,
    handlerWar(gs, publishCh),
  );

  while (true) {
    const words = await getInput("> ");
    if (words.length === 0 || words[0] === "") continue;
    const cmd = words[0];
    try {
      if (cmd === "spawn") {
        commandSpawn(gs, words);
      } else if (cmd === "move") {
        const move = commandMove(gs, words);
        await publishJSON(
          publishCh,
          ExchangePerilTopic,
          `${ArmyMovesPrefix}.${username}`,
          move,
        );
        console.log("Move published successfully");
      } else if (cmd === "status") {
        await commandStatus(gs);
      } else if (cmd === "help") {
        printClientHelp();
      } else if (cmd === "spam") {
        if (words.length < 2) {
          console.log("Usage: spam <n>");
          continue;
        }
        const arg = words[1] ?? "";
        const n = parseInt(arg, 10);
        if (!Number.isFinite(n) || n <= 0) {
          console.log(`Invalid spam count: ${arg}`);
          continue;
        }
        for (let i = 0; i < n; i++) {
          await publishGameLog(publishCh, username, getMaliciousLog());
        }
        console.log(`Spammed ${n} logs`);
      } else if (cmd === "quit") {
        printQuit();
        break;
      } else {
        console.log(`Unknown command: ${cmd}`);
      }
    } catch (err) {
      console.log((err as Error).message);
    }
  }

  console.log("Shutting down Peril client...");
  await conn.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
