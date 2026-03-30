import { renderGamePage } from "./frontend/gamePage";
import { renderHomePage } from "./frontend/homePage";
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
