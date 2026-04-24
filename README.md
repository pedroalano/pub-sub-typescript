# Peril

TypeScript pub/sub learning project built on top of RabbitMQ. Starter code from Boot.dev's [Learn Pub/Sub](https://www.boot.dev/courses/learn-pub-sub-rabbitmq-typescript) course.

## Overview

Peril is a distributed real-time strategy game used as a vehicle for exploring AMQP messaging patterns. A single `server` coordinates game-wide events (pause, game logs), while multiple `client` instances represent players commanding units across six continents (`americas`, `europe`, `africa`, `asia`, `australia`, `antarctica`). Units move, overlap, and resolve wars based on rank-based power levels.

RabbitMQ brokers every cross-process interaction — unit movement, war declarations, pause control, and game logs — via a mix of direct and topic exchanges.

## Tech Stack

- **Language**: TypeScript 4.4 (ESM, ES2022, `strict`)
- **Runtime**: Node.js 16+
- **Broker**: RabbitMQ 3.13 (run via Docker)
- **AMQP client**: [`amqplib`](https://www.npmjs.com/package/amqplib) 0.10
- **Runner**: [`tsx`](https://www.npmjs.com/package/tsx) for direct TS execution

## Project Layout

```
src/
├── client/
│   └── index.ts              # Client entry point
├── server/
│   └── index.ts              # Server entry point
├── internal/
│   ├── gamelogic/            # Game rules (moves, wars, spawning, logs, pause)
│   │   ├── gamedata.ts       # Core types: Location, Unit, Player, ArmyMove, RecognitionOfWar
│   │   ├── gamestate.ts      # Client-side GameState class
│   │   ├── move.ts           # Unit movement + overlap detection
│   │   ├── war.ts            # Combat resolution by power level
│   │   ├── spawn.ts
│   │   ├── pause.ts
│   │   └── logs.ts
│   └── routing/
│       └── routing.ts        # Exchange + routing-key constants
└── scripts/
    ├── rabbit.sh             # Docker lifecycle for peril_rabbitmq
    └── multiserver.sh        # Spawn N server instances
```

## Prerequisites

- Node.js 16+ and npm
- Docker (for the RabbitMQ container)

## Getting Started

```bash
npm install
npm run rabbit:start     # boots peril_rabbitmq container
npm run server           # in one terminal
npm run client           # in another
```

Management UI: <http://localhost:15672> (default creds: `guest` / `guest`).

## Scripts

| Command | Action |
|---|---|
| `npm run server` | Start server (`tsx src/server/index.ts`) |
| `npm run client` | Start client (`tsx src/client/index.ts`) |
| `npm run build` | Compile TypeScript (`tsc`) |
| `npm run rabbit:start` | Create or start `peril_rabbitmq` Docker container |
| `npm run rabbit:stop` | Stop container |
| `npm run rabbit:logs` | Follow container logs |
| `./src/scripts/multiserver.sh <N>` | Launch N server instances, `Ctrl+C` to kill all |

## RabbitMQ Topology

Defined in `src/internal/routing/routing.ts`:

**Exchanges**

- `peril_direct` — direct routing (pause, per-client targeted messages)
- `peril_topic` — topic routing (army moves, war, game logs)

**Routing key / queue prefixes**

- `army_moves` — unit movement events
- `war` — war declarations / recognitions
- `pause` — game pause + resume control
- `game_logs` — server-aggregated game event log

**Ports**

- `5672` — AMQP
- `15672` — management UI

## Game Mechanics

Unit ranks and combat power (`src/internal/gamelogic/war.ts`):

| Rank | Power |
|---|---|
| `infantry` | 1 |
| `cavalry` | 5 |
| `artillery` | 10 |

Wars trigger when units from different players overlap on the same location. Higher total power wins; defeated units are removed from the map.

Client commands include `move`, `spawn`, `status`, `spam`, `pause` / `resume`, `help`, `quit`.

## Status

Entry points (`src/server/index.ts`, `src/client/index.ts`) currently log startup only — AMQP wiring is built up progressively as the Boot.dev course exercises are completed.
