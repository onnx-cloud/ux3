# @ux3/plugin-replay

Replay and session inspection plugin for UX3, built on top of plugin-store storage adapters.

## Features

- Capture FSM transitions and runtime events
- Replay saved sessions for debugging
- Session inspection panels and trace export
- Persistent replay storage integration
- Live trace buffering and snapshots

## Installation

```bash
npm install @ux3/plugin-replay
```

## Basic Usage

```ts
import ReplayPlugin from '@ux3/plugin-replay';

const app = initializeApp({
  plugins: [ReplayPlugin],
});
```

## Plugin Usage

- Register the plugin in your UX3 app.
- Use the replay service to record and replay event sessions.
- Configure storage via the plugin registry when needed.

## API

- `app.utils.replay.saveSession(name)` — persist the current event session.
- `app.utils.replay.listSessions()` — list stored replay sessions.
- `app.utils.replay.replaySession(id)` — replay a saved session.
- `app.utils.replay.deleteSession(id)` — delete a saved session.
- `app.utils.replay.clearBuffer()` — clear the live event buffer.

## Example

```ts
await app.utils.replay.saveSession('trace-2026-05-14');
const sessions = await app.utils.replay.listSessions();
console.log(sessions);

await app.utils.replay.replaySession(sessions[0].id);
```

## Notes

- The plugin patches UX3 state machines to intercept events for replay.
- Pair with `@ux3/plugin-store` for durable session storage.
