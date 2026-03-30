import { GameDurableObject, type Env } from "./game/GameDurableObject";
import type { CreateGameResult } from "./lib/game";
import { createGameId } from "./lib/ids";

export { GameDurableObject };

interface GamePrivateState {
  gameId: string;
  xToken: string;
  oToken: string;
  spectatorToken: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/") {
        return html(renderHomePage());
      }

      if (
        request.method === "GET" &&
        (url.pathname.startsWith("/p/") || url.pathname.startsWith("/s/"))
      ) {
        return html(renderGamePage());
      }

      if (request.method === "POST" && url.pathname === "/api/games") {
        return handleCreateGame(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname.startsWith("/api/games/") &&
        url.pathname.endsWith("/live")
      ) {
        return handleLiveConnection(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname.startsWith("/api/games/") &&
        url.pathname.endsWith("/move")
      ) {
        return handleMove(request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname.startsWith("/api/games/") &&
        url.pathname.endsWith("/rematch")
      ) {
        return handleRematch(request, env);
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/games/")) {
        return handleGetGame(request, env);
      }

      return json({ error: "Not found." }, 404);
    } catch (error) {
      console.error("Unhandled worker error", error);
      return json({ error: "Internal server error." }, 500);
    }
  },
};

async function handleCreateGame(
  request: Request,
  env: Env,
): Promise<Response> {
  const result = await createGameUrls(new URL(request.url).origin, env);

  if (!result) {
    return json({ error: "Unable to create game." }, 500);
  }

  return json(result, 201);
}

async function handleGetGame(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const gameId = getGameIdFromApiPath(url.pathname);

  if (!gameId) {
    return json({ error: "Missing game id." }, 400);
  }

  const token = url.searchParams.get("token");
  const stub = getGameStub(env, gameId);

  return stub.fetch("https://game.internal", {
    method: "POST",
    body: JSON.stringify({
      type: "get",
      token,
    }),
  });
}

async function handleMove(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const gameId = getGameIdFromActionPath(url.pathname, "move");

  if (!gameId) {
    return json({ error: "Missing game id." }, 400);
  }

  if (!hasJsonContentType(request)) {
    return json({ error: "Move request must use application/json." }, 415);
  }

  const body = (await request.json().catch(() => null)) as
    | { token?: string; cell?: number }
    | null;

  if (!body?.token || typeof body.cell !== "number") {
    return json({ error: "Move request must include token and cell." }, 400);
  }

  const stub = getGameStub(env, gameId);

  return stub.fetch("https://game.internal", {
    method: "POST",
    body: JSON.stringify({
      type: "move",
      payload: {
        token: body.token,
        cell: body.cell,
      },
    }),
  });
}

async function handleRematch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const gameId = getGameIdFromActionPath(url.pathname, "rematch");

  if (!gameId) {
    return json({ error: "Missing game id." }, 400);
  }

  const existing = await getGameSnapshot(env, gameId);

  if (!existing) {
    return json({ error: "Game not found." }, 404);
  }

  const result = await createGameUrls(url.origin, env);

  if (!result) {
    return json({ error: "Unable to create rematch." }, 500);
  }

  return json(result, 201);
}

async function handleLiveConnection(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return json({ error: "Expected a WebSocket upgrade request." }, 426);
  }

  const url = new URL(request.url);
  const gameId = getGameIdFromActionPath(url.pathname, "live");

  if (!gameId) {
    return json({ error: "Missing game id." }, 400);
  }

  const stub = getGameStub(env, gameId);
  const proxyUrl = `https://game.internal/live${url.search}`;

  return stub.fetch(new Request(proxyUrl, request));
}

async function createGameUrls(
  origin: string,
  env: Env,
): Promise<CreateGameResult | null> {
  const gameId = createGameId();
  const stub = getGameStub(env, gameId);
  const objectResponse = await stub.fetch("https://game.internal", {
    method: "POST",
    body: JSON.stringify({
      type: "create",
      payload: { gameId },
    }),
  });

  if (!objectResponse.ok) {
    return null;
  }

  const game = await objectResponse.json<GamePrivateState>();
  return buildUrls(origin, game);
}

async function getGameSnapshot(
  env: Env,
  gameId: string,
): Promise<Response | null> {
  const stub = getGameStub(env, gameId);
  const response = await stub.fetch("https://game.internal", {
    method: "POST",
    body: JSON.stringify({
      type: "get",
    }),
  });

  return response.ok ? response : null;
}

function buildUrls(origin: string, game: GamePrivateState): CreateGameResult {
  return {
    gameId: game.gameId,
    xUrl: `${origin}/p/${game.gameId}/${game.xToken}`,
    oUrl: `${origin}/p/${game.gameId}/${game.oToken}`,
    spectatorUrl: `${origin}/s/${game.gameId}/${game.spectatorToken}`,
  };
}

function getGameStub(env: Env, gameId: string) {
  const objectId = env.GAME_ROOM.idFromName(gameId);
  return env.GAME_ROOM.get(objectId);
}

function getGameIdFromApiPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 3 ? parts[2] : null;
}

function getGameIdFromActionPath(
  pathname: string,
  action: "move" | "rematch" | "live",
): string | null {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 4 && parts[3] === action ? parts[2] : null;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

function html(markup: string, status = 200): Response {
  return new Response(markup, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  return contentType?.includes("application/json") ?? false;
}

function renderHomePage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tic-Tac-Toe</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4eadf;
        --panel: rgba(255, 250, 243, 0.9);
        --ink: #1e293b;
        --muted: #5f6c7b;
        --accent: #c2410c;
        --accent-strong: #9a3412;
        --accent-alt: #0f766e;
        --border: rgba(222, 203, 182, 0.95);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Georgia, serif;
        background:
          radial-gradient(circle at top left, rgba(194, 65, 12, 0.18), transparent 32%),
          radial-gradient(circle at bottom right, rgba(15, 118, 110, 0.16), transparent 28%),
          linear-gradient(180deg, #fbf5ee 0%, var(--bg) 100%);
        color: var(--ink);
        min-height: 100vh;
        padding: 24px;
      }

      main {
        max-width: 1040px;
        margin: 0 auto;
      }

      .shell {
        display: grid;
        gap: 20px;
      }

      .panel {
        width: 100%;
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 28px;
        padding: 32px;
        box-shadow: 0 24px 70px rgba(31, 41, 51, 0.12);
        backdrop-filter: blur(10px);
      }

      h1 {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: clamp(2.8rem, 9vw, 5.6rem);
        line-height: 0.95;
      }

      p {
        font-size: 1.05rem;
        line-height: 1.6;
      }

      .eyebrow {
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.78rem;
        margin-bottom: 12px;
      }

      .lead {
        max-width: 48rem;
        color: #334155;
      }

      .primary {
        border: 0;
        border-radius: 999px;
        padding: 14px 22px;
        font: inherit;
        font-weight: 700;
        background: var(--accent);
        color: white;
        cursor: pointer;
      }

      .primary:hover {
        background: var(--accent-strong);
      }

      .result-grid {
        display: grid;
        gap: 16px;
        margin-top: 22px;
      }

      .link-card {
        display: grid;
        gap: 12px;
        padding: 18px;
        border-radius: 22px;
        background: #fff;
        border: 1px solid var(--border);
      }

      .link-card strong {
        font-size: 1.1rem;
      }

      .link-card p {
        margin: 0;
        color: var(--muted);
      }

      .link-row {
        display: grid;
        gap: 10px;
      }

      .link-box {
        padding: 14px 16px;
        border-radius: 18px;
        background: #f9f4ee;
        border: 1px solid var(--border);
        font-size: 0.95rem;
        word-break: break-word;
      }

      .button-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .secondary {
        border: 1px solid #d7c2ac;
        border-radius: 999px;
        padding: 12px 18px;
        font: inherit;
        font-weight: 700;
        color: var(--ink);
        background: white;
        cursor: pointer;
      }

      .secondary:hover {
        border-color: #bfa386;
      }

      .tips {
        display: grid;
        gap: 12px;
      }

      .tip {
        padding: 16px 18px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.76);
        border: 1px solid var(--border);
      }

      .tip strong {
        display: block;
        margin-bottom: 6px;
      }

      .message {
        margin-top: 16px;
        min-height: 1.5em;
        color: var(--accent-alt);
        font-weight: 700;
      }

      @media (min-width: 900px) {
        .shell {
          grid-template-columns: 1.2fr 0.8fr;
          align-items: start;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="shell">
        <section class="panel">
          <div class="eyebrow">Cloudflare Tic-Tac-Toe</div>
          <h1>Start a match, share a link, watch it live.</h1>
          <p class="lead">Each game now gets three URLs: one for X, one for O, and one read-only spectator link. Players receive live board updates from the backend, so both sides stay in sync without browser polling.</p>
          <button class="primary" id="create-game">Start a new game</button>
          <div class="message" id="message" aria-live="polite"></div>

          <section class="result-grid" id="result" hidden>
            <article class="link-card">
              <strong>Play as X</strong>
              <p>Use this private link to take the first move.</p>
              <div class="link-row">
                <div class="link-box" id="x-url"></div>
                <div class="button-row">
                  <button class="secondary" type="button" data-copy-target="x-url">Copy X link</button>
                  <button class="secondary" type="button" data-open-target="x-url">Open X board</button>
                </div>
              </div>
            </article>

            <article class="link-card">
              <strong>Share with O</strong>
              <p>Send this private link to your opponent.</p>
              <div class="link-row">
                <div class="link-box" id="o-url"></div>
                <div class="button-row">
                  <button class="secondary" type="button" data-copy-target="o-url">Copy O link</button>
                  <button class="secondary" type="button" data-open-target="o-url">Open O board</button>
                </div>
              </div>
            </article>

            <article class="link-card">
              <strong>Spectator view</strong>
              <p>Anyone with this link can watch the game unfold in real time.</p>
              <div class="link-row">
                <div class="link-box" id="spectator-url"></div>
                <div class="button-row">
                  <button class="secondary" type="button" data-copy-target="spectator-url">Copy spectator link</button>
                  <button class="secondary" type="button" data-open-target="spectator-url">Open spectator view</button>
                </div>
              </div>
            </article>
          </section>
        </section>

        <aside class="panel tips">
          <div class="tip">
            <strong>Live updates</strong>
            The board now stays synchronized with a live connection to the backend instead of browser polling.
          </div>
          <div class="tip">
            <strong>Private player links</strong>
            X and O links still act as lightweight private keys. Anyone with one of those links can play that side.
          </div>
          <div class="tip">
            <strong>Quick rematches</strong>
            When a match ends, either player or a spectator can spin up the next round from the game page.
          </div>
        </aside>
      </div>
    </main>
    <script type="module">
      const button = document.getElementById("create-game");
      const result = document.getElementById("result");
      const message = document.getElementById("message");
      const xUrl = document.getElementById("x-url");
      const oUrl = document.getElementById("o-url");
      const spectatorUrl = document.getElementById("spectator-url");

      for (const copyButton of document.querySelectorAll("[data-copy-target]")) {
        copyButton.addEventListener("click", async () => {
          const target = document.getElementById(copyButton.dataset.copyTarget);
          if (!target?.textContent) {
            return;
          }

          await navigator.clipboard.writeText(target.textContent);
          const label = copyButton.textContent;
          copyButton.textContent = "Copied";
          setTimeout(() => {
            copyButton.textContent = label;
          }, 1200);
        });
      }

      for (const openButton of document.querySelectorAll("[data-open-target]")) {
        openButton.addEventListener("click", () => {
          const target = document.getElementById(openButton.dataset.openTarget);
          if (target?.textContent) {
            window.location.href = target.textContent;
          }
        });
      }

      button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Creating...";
        message.textContent = "";

        try {
          const response = await fetch("/api/games", { method: "POST" });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Unable to create a game.");
          }

          result.hidden = false;
          xUrl.textContent = data.xUrl;
          oUrl.textContent = data.oUrl;
          spectatorUrl.textContent = data.spectatorUrl;
          message.textContent = "Game created. Open a player board, send one link, and the spectator view will update live.";
        } catch (error) {
          message.textContent = error.message || "Unable to create a game right now.";
        } finally {
          button.disabled = false;
          button.textContent = "Start a new game";
        }
      });
    </script>
  </body>
</html>`;
}

function renderGamePage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tic-Tac-Toe Game</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f3efe5;
        --paper: rgba(255, 250, 242, 0.94);
        --ink: #1f2933;
        --muted: #5f6c7b;
        --x: #0f766e;
        --o: #c2410c;
        --line: #d9c7b4;
        --shadow: rgba(27, 31, 35, 0.15);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Georgia, serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(15, 118, 110, 0.16), transparent 34%),
          radial-gradient(circle at bottom right, rgba(194, 65, 12, 0.14), transparent 28%),
          linear-gradient(180deg, #faf6ef 0%, var(--bg) 100%);
        padding: 20px;
      }

      main {
        max-width: 960px;
        margin: 0 auto;
        display: grid;
        gap: 20px;
      }

      .shell {
        display: grid;
        gap: 20px;
      }

      .panel {
        background: var(--paper);
        border: 1px solid rgba(217, 199, 180, 0.9);
        border-radius: 28px;
        box-shadow: 0 24px 60px var(--shadow);
        padding: 24px;
        backdrop-filter: blur(10px);
      }

      h1, h2, p {
        margin-top: 0;
      }

      h1 {
        font-size: clamp(2.2rem, 7vw, 4rem);
        line-height: 0.95;
        margin-bottom: 12px;
      }

      .eyebrow {
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.78rem;
        margin-bottom: 12px;
      }

      .board {
        display: grid;
        grid-template-columns: repeat(3, minmax(84px, 1fr));
        gap: 12px;
      }

      .cell {
        aspect-ratio: 1;
        border: 0;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: inset 0 0 0 1px var(--line);
        font-family: inherit;
        font-size: clamp(2rem, 12vw, 4rem);
        font-weight: 700;
        color: var(--ink);
        cursor: pointer;
        transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
      }

      .cell:hover:enabled {
        transform: translateY(-2px);
        box-shadow: inset 0 0 0 1px var(--line), 0 12px 24px rgba(31, 41, 51, 0.08);
      }

      .cell:disabled {
        cursor: default;
      }

      .cell.x {
        color: var(--x);
      }

      .cell.o {
        color: var(--o);
      }

      .status {
        font-size: 1.15rem;
        line-height: 1.5;
        color: var(--ink);
        min-height: 2.5em;
      }

      .meta {
        display: grid;
        gap: 12px;
        color: var(--muted);
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.74);
        border: 1px solid var(--line);
        width: fit-content;
      }

      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      button.copy,
      button.rematch {
        border: 0;
        border-radius: 999px;
        padding: 12px 18px;
        font: inherit;
        font-weight: 700;
        color: white;
        background: #1f2933;
        cursor: pointer;
      }

      button.rematch {
        background: #0f766e;
      }

      button.rematch[hidden] {
        display: none;
      }

      code {
        font-size: 0.95rem;
        word-break: break-all;
      }

      .error {
        color: #9f1239;
        min-height: 1.5em;
      }

      .result-banner {
        display: none;
        padding: 16px 18px;
        border-radius: 20px;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid var(--line);
      }

      .result-banner.visible {
        display: block;
      }

      .result-banner.win {
        color: var(--x);
        background: rgba(15, 118, 110, 0.1);
      }

      .result-banner.loss {
        color: var(--o);
        background: rgba(194, 65, 12, 0.1);
      }

      .result-banner.draw {
        color: #475569;
      }

      .rematch-panel {
        display: none;
        gap: 12px;
        margin-top: 16px;
        padding: 18px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.74);
        border: 1px solid var(--line);
      }

      .rematch-panel.visible {
        display: grid;
      }

      .rematch-card {
        padding: 14px;
        border-radius: 18px;
        background: white;
        border: 1px solid var(--line);
      }

      .rematch-card strong {
        display: block;
        margin-bottom: 8px;
      }

      .link-box {
        margin: 8px 0 12px;
        padding: 12px 14px;
        border-radius: 16px;
        background: #f9f4ee;
        border: 1px solid var(--line);
        word-break: break-word;
      }

      .live-indicator {
        color: #0f766e;
        font-weight: 700;
      }

      @media (min-width: 860px) {
        .shell {
          grid-template-columns: 1.2fr 0.8fr;
          align-items: start;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="shell">
        <section class="panel">
          <div class="eyebrow">Cloudflare Tic-Tac-Toe</div>
          <h1>Take your turn from any device.</h1>
          <p id="status" class="status">Loading game...</p>
          <div id="result-banner" class="result-banner" aria-live="polite"></div>
          <div class="board" id="board" aria-label="Tic-tac-toe board"></div>
          <p id="error" class="error" aria-live="polite"></p>
        </section>

        <aside class="panel meta">
          <div>
            <h2>Your link</h2>
            <p>This URL identifies your view of the game. Players can make moves, while the spectator link stays read-only.</p>
            <div class="pill"><span>Role</span> <strong id="viewer-role">...</strong></div>
          </div>

          <div>
            <h2>Game ID</h2>
            <code id="game-id">...</code>
          </div>

          <div>
            <h2>State</h2>
            <div class="pill"><span>Turn</span> <strong id="next-player">...</strong></div>
            <div class="pill"><span>Updated</span> <strong id="updated-at">...</strong></div>
            <div class="pill"><span>Expires</span> <strong id="expires-at">...</strong></div>
            <div class="pill"><span>Live</span> <strong id="live-state" class="live-indicator">Connecting...</strong></div>
          </div>

          <div class="actions">
            <button class="copy" id="copy-link" type="button">Copy my link</button>
            <button class="rematch" id="rematch-button" type="button" hidden>Start rematch</button>
          </div>

          <section id="rematch-panel" class="rematch-panel" aria-live="polite">
            <h2>New match links</h2>
            <div class="rematch-card">
              <strong>X</strong>
              <div class="link-box" id="rematch-x"></div>
              <button class="copy" type="button" data-copy-target="rematch-x">Copy X link</button>
            </div>
            <div class="rematch-card">
              <strong>O</strong>
              <div class="link-box" id="rematch-o"></div>
              <button class="copy" type="button" data-copy-target="rematch-o">Copy O link</button>
            </div>
            <div class="rematch-card">
              <strong>Spectator</strong>
              <div class="link-box" id="rematch-spectator"></div>
              <button class="copy" type="button" data-copy-target="rematch-spectator">Copy spectator link</button>
            </div>
            <button class="rematch" id="open-rematch" type="button">Open my next view</button>
          </section>
        </aside>
      </div>
    </main>
    <script type="module">
      const statusEl = document.getElementById("status");
      const boardEl = document.getElementById("board");
      const errorEl = document.getElementById("error");
      const viewerRoleEl = document.getElementById("viewer-role");
      const gameIdEl = document.getElementById("game-id");
      const nextPlayerEl = document.getElementById("next-player");
      const updatedAtEl = document.getElementById("updated-at");
      const expiresAtEl = document.getElementById("expires-at");
      const copyButton = document.getElementById("copy-link");
      const resultBannerEl = document.getElementById("result-banner");
      const rematchButton = document.getElementById("rematch-button");
      const rematchPanel = document.getElementById("rematch-panel");
      const rematchXEl = document.getElementById("rematch-x");
      const rematchOEl = document.getElementById("rematch-o");
      const rematchSpectatorEl = document.getElementById("rematch-spectator");
      const openRematchButton = document.getElementById("open-rematch");
      const liveStateEl = document.getElementById("live-state");

      const segments = window.location.pathname.split("/").filter(Boolean);
      const routeType = segments[0];
      const gameId = segments[1];
      const token = segments[2] || "";
      let game = null;
      let socket = null;
      let reconnectTimer = null;
      let submitting = false;
      let rematch = null;

      for (const copyTargetButton of document.querySelectorAll("[data-copy-target]")) {
        copyTargetButton.addEventListener("click", async () => {
          const target = document.getElementById(copyTargetButton.dataset.copyTarget);
          if (!target?.textContent) {
            return;
          }

          await navigator.clipboard.writeText(target.textContent);
          const label = copyTargetButton.textContent;
          copyTargetButton.textContent = "Copied";
          setTimeout(() => {
            copyTargetButton.textContent = label;
          }, 1200);
        });
      }

      if (!gameId || !token) {
        statusEl.textContent = "This game link is invalid.";
        liveStateEl.textContent = "Unavailable";
      } else {
        gameIdEl.textContent = gameId;
        copyButton.addEventListener("click", async () => {
          await navigator.clipboard.writeText(window.location.href);
          copyButton.textContent = "Copied";
          setTimeout(() => {
            copyButton.textContent = "Copy my link";
          }, 1200);
        });

        rematchButton.addEventListener("click", createRematch);
        openRematchButton.addEventListener("click", () => {
          if (!rematch) {
            return;
          }

          const nextUrl = game?.viewer === "X"
            ? rematch.xUrl
            : game?.viewer === "O"
              ? rematch.oUrl
              : rematch.spectatorUrl;
          window.location.href = nextUrl;
        });

        awaitInitialState();
      }

      async function awaitInitialState() {
        await loadGame();
        connectLive();
      }

      async function loadGame() {
        try {
          const response = await fetch("/api/games/" + gameId + "?token=" + encodeURIComponent(token));
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Unable to load game.");
          }

          game = data;
          errorEl.textContent = "";
          render();
        } catch (error) {
          errorEl.textContent = error.message || "Unable to load game.";
        }
      }

      function connectLive() {
        if (socket) {
          socket.close();
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const url = protocol + "//" + window.location.host + "/api/games/" + gameId + "/live?token=" + encodeURIComponent(token);
        liveStateEl.textContent = "Connecting...";
        socket = new WebSocket(url);

        socket.addEventListener("open", () => {
          liveStateEl.textContent = "Connected";
        });

        socket.addEventListener("message", (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "state") {
              game = payload.game;
              errorEl.textContent = "";
              render();
            }
          } catch (error) {
            console.error("Invalid live payload", error);
          }
        });

        socket.addEventListener("close", () => {
          liveStateEl.textContent = "Reconnecting...";
          socket = null;
          reconnectTimer = setTimeout(() => {
            loadGame();
            connectLive();
          }, 1500);
        });

        socket.addEventListener("error", () => {
          liveStateEl.textContent = "Interrupted";
        });
      }

      async function makeMove(cell) {
        if (!game || submitting) {
          return;
        }

        submitting = true;
        errorEl.textContent = "";
        render();

        try {
          const response = await fetch("/api/games/" + gameId + "/move", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({ token, cell })
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Unable to make move.");
          }

          game = data;
          render();
        } catch (error) {
          errorEl.textContent = error.message || "Unable to make move.";
        } finally {
          submitting = false;
          render();
        }
      }

      async function createRematch() {
        rematchButton.disabled = true;
        errorEl.textContent = "";

        try {
          const response = await fetch("/api/games/" + gameId + "/rematch", {
            method: "POST"
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Unable to create rematch.");
          }

          rematch = data;
          rematchXEl.textContent = data.xUrl;
          rematchOEl.textContent = data.oUrl;
          rematchSpectatorEl.textContent = data.spectatorUrl;
          rematchPanel.classList.add("visible");
        } catch (error) {
          errorEl.textContent = error.message || "Unable to create rematch.";
        } finally {
          rematchButton.disabled = false;
        }
      }

      function render() {
        if (!game) {
          return;
        }

        viewerRoleEl.textContent = routeType === "s" ? "spectator" : game.viewer;
        nextPlayerEl.textContent = game.nextPlayer;
        updatedAtEl.textContent = new Date(game.updatedAt).toLocaleString();
        expiresAtEl.textContent = new Date(game.expiresAt).toLocaleString();
        statusEl.textContent = getStatusText(game);
        renderResultBanner(game);
        rematchButton.hidden = game.status === "active";

        boardEl.replaceChildren(...game.board.map((value, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "cell" + (value ? " " + value.toLowerCase() : "");
          button.textContent = value || "";
          button.disabled = !canPlayCell(index);
          button.setAttribute("aria-label", value ? "Cell " + (index + 1) + " contains " + value : "Play cell " + (index + 1));
          button.addEventListener("click", () => makeMove(index));
          return button;
        }));
      }

      function renderResultBanner(game) {
        resultBannerEl.className = "result-banner";
        resultBannerEl.textContent = "";

        if (game.status === "won") {
          const won = game.viewer !== "spectator" && game.winner === game.viewer;
          resultBannerEl.classList.add("visible", won ? "win" : "loss");
          resultBannerEl.textContent = won
            ? "Match complete. You won."
            : game.winner + " won this match.";
          return;
        }

        if (game.status === "draw") {
          resultBannerEl.classList.add("visible", "draw");
          resultBannerEl.textContent = "Match complete. Nobody found a winning line.";
        }
      }

      function canPlayCell(index) {
        return Boolean(
          game &&
          !submitting &&
          game.status === "active" &&
          game.viewer !== "spectator" &&
          routeType === "p" &&
          game.viewer === game.nextPlayer &&
          game.board[index] === null
        );
      }

      function getStatusText(game) {
        if (game.status === "won") {
          return game.winner === game.viewer
            ? "You won this round."
            : game.winner + " won this round.";
        }

        if (game.status === "draw") {
          return "The board is full. This game ended in a draw.";
        }

        if (routeType === "s" || game.viewer === "spectator") {
          return game.nextPlayer + " is up next.";
        }

        if (game.viewer === game.nextPlayer) {
          return "Your turn. Pick an open square.";
        }

        return "Waiting for " + game.nextPlayer + " to move.";
      }

      window.addEventListener("beforeunload", () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        if (socket) {
          socket.close();
        }
      });
    </script>
  </body>
</html>`;
}
