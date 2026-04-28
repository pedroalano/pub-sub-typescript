import type { ConfirmChannel } from "amqplib";
import type { GameState, PlayingState } from "../internal/gamelogic/gamestate.js";
import type { ArmyMove, RecognitionOfWar } from "../internal/gamelogic/gamedata.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handleWar, WarOutcome } from "../internal/gamelogic/war.js";
import { AckType } from "../internal/pubsub/subscribe.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import {
  ExchangePerilTopic,
  WarRecognitionsPrefix,
} from "../internal/routing/routing.js";
import { publishGameLog } from "./index.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => AckType {
  return (ps: PlayingState) => {
    handlePause(gs, ps);
    process.stdout.write("> ");
    return AckType.Ack;
  };
}

export function handlerMove(
  gs: GameState,
  publishCh: ConfirmChannel,
  username: string,
): (move: ArmyMove) => Promise<AckType> {
  return async (move: ArmyMove) => {
    const outcome = handleMove(gs, move);
    process.stdout.write("> ");
    switch (outcome) {
      case MoveOutcome.Safe:
        return AckType.Ack;
      case MoveOutcome.MakeWar: {
        const rw: RecognitionOfWar = {
          attacker: move.player,
          defender: gs.getPlayerSnap(),
        };
        try {
          await publishJSON(
            publishCh,
            ExchangePerilTopic,
            `${WarRecognitionsPrefix}.${username}`,
            rw,
          );
          return AckType.Ack;
        } catch (err) {
          console.error("Failed to publish war recognition:", err);
          return AckType.NackRequeue;
        }
      }
      case MoveOutcome.SamePlayer:
      default:
        return AckType.NackDiscard;
    }
  };
}

export function handlerWar(
  gs: GameState,
  publishCh: ConfirmChannel,
): (rw: RecognitionOfWar) => Promise<AckType> {
  return async (rw: RecognitionOfWar) => {
    const resolution = handleWar(gs, rw);
    process.stdout.write("> ");
    switch (resolution.result) {
      case WarOutcome.NotInvolved:
        return AckType.NackRequeue;
      case WarOutcome.NoUnits:
        return AckType.NackDiscard;
      case WarOutcome.OpponentWon:
      case WarOutcome.YouWon: {
        const message = `${resolution.winner} won a war against ${resolution.loser}`;
        try {
          await publishGameLog(publishCh, rw.attacker.username, message);
          return AckType.Ack;
        } catch (err) {
          console.error("Failed to publish game log:", err);
          return AckType.NackRequeue;
        }
      }
      case WarOutcome.Draw: {
        const message = `A war between ${resolution.attacker} and ${resolution.defender} resulted in a draw`;
        try {
          await publishGameLog(publishCh, rw.attacker.username, message);
          return AckType.Ack;
        } catch (err) {
          console.error("Failed to publish game log:", err);
          return AckType.NackRequeue;
        }
      }
      default:
        console.error("Unknown war outcome:", resolution);
        return AckType.NackDiscard;
    }
  };
}
