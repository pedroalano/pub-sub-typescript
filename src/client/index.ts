import amqp from "amqplib";
import {
  clientWelcome,
  commandStatus,
  getInput,
  printClientHelp,
  printQuit,
} from "../internal/gamelogic/gamelogic.js";
import { GameState, type PlayingState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { SimpleQueueType } from "../internal/pubsub/declare.js";
import { subscribeJSON } from "../internal/pubsub/subscribe.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import {
  ArmyMovesPrefix,
  ExchangePerilDirect,
  ExchangePerilTopic,
  PauseKey,
} from "../internal/routing/routing.js";
import type { ArmyMove } from "../internal/gamelogic/gamedata.js";
import { handlerMove, handlerPause } from "./handlers.js";

async function main() {
  console.log("Starting Peril client...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("Connected to RabbitMQ");

  const username = await clientWelcome();

  const gs = new GameState(username);

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
    handlerMove(gs),
  );

  const publishCh = await conn.createConfirmChannel();

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
        console.log("Spamming not allowed yet!");
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
