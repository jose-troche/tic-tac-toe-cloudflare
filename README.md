# Tic-Tac-Toe on Cloudflare

A two-player tic-tac-toe web app built with TypeScript, Cloudflare Workers, and Durable Objects.

Each match gets:
- one private URL for player `X`
- one private URL for player `O`
- one read-only spectator URL
- persistent server-side state so either player can continue from another device
- live updates for all open viewers

Finished and abandoned games expire automatically to stay friendly to Cloudflare's free tier.

## Stack

- Cloudflare Workers
- Durable Objects with SQLite-backed storage
- TypeScript
- Inline HTML/CSS/JS for the first version of the UI

## Project Layout

- `src/index.ts`: Worker routes and UI rendering
- `src/game/GameDurableObject.ts`: per-game state and move validation
- `src/lib/game.ts`: shared game types and pure helpers
- `src/lib/ids.ts`: id and token generation
- `wrangler.jsonc`: Cloudflare Worker and Durable Object config

## Local Development

Install dependencies:

```bash
npm install
```

Type-check:

```bash
npm run check
```

Run locally with Wrangler:

```bash
npx wrangler dev
```

Then open the local URL printed by Wrangler, usually `http://localhost:8787`.

## Deploy to Cloudflare

1. Authenticate with Cloudflare:

```bash
npx wrangler login
```

2. Deploy the worker:

```bash
npx wrangler deploy
```

Wrangler will create the Worker and apply the Durable Object migration defined in `wrangler.jsonc`.

## How the App Works

1. A visitor opens `/` and creates a game.
2. The Worker creates a unique game id and routes the request to a Durable Object for that match.
3. The Durable Object stores:
   - the board
   - whose turn it is
   - X and O private tokens
   - timestamps and expiry
4. The app returns two shareable URLs:
   - `/p/:gameId/:xToken`
   - `/p/:gameId/:oToken`
   - `/s/:gameId/:spectatorToken`
5. Players use those URLs to load state and submit moves.
6. Open viewers subscribe to live updates through a WebSocket connection routed through the Durable Object.
7. When a match finishes, the game page can create a rematch and return a fresh set of links.

## Retention

- active games expire after 48 hours
- finished games expire after 24 hours

Cleanup is handled with Durable Object alarms.

## Notes

- This app uses private links instead of user accounts.
- Anyone with a player URL can act as that side.
- Anyone with the spectator URL can watch the match without making moves.

## Nice Next Steps

- add a spectator URL
- add a rematch flow
- add live updates with WebSockets or Server-Sent Events
- split frontend assets into dedicated files if the UI grows
