import type { GameState, PlayingState } from "../internal/gamelogic/gamestate.js";
import type { ArmyMove } from "../internal/gamelogic/gamedata.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { AckType } from "../internal/pubsub/subscribe.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => AckType {
  return (ps: PlayingState) => {
    handlePause(gs, ps);
    process.stdout.write("> ");
    return AckType.Ack;
  };
}

export function handlerMove(gs: GameState): (move: ArmyMove) => AckType {
  return (move: ArmyMove) => {
    const outcome = handleMove(gs, move);
    process.stdout.write("> ");
    switch (outcome) {
      case MoveOutcome.Safe:
      case MoveOutcome.MakeWar:
        return AckType.Ack;
      case MoveOutcome.SamePlayer:
      default:
        return AckType.NackDiscard;
    }
  };
}
