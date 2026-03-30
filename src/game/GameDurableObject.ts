import {
  FINISHED_GAME_TTL_MS,
  GAME_TTL_MS,
  type GameState,
  type ViewerRole,
  createEmptyBoard,
  getViewerRole,
  getWinner,
  isBoardFull,
  isValidCellIndex,
  nextPlayer,
  toPublicGameState,
  toPublicGameStateForViewer,
} from "../lib/game";
import { createPlayerToken } from "../lib/ids";

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

interface CreateGameRequest {
  gameId: string;
}

interface MoveGameRequest {
  token: string;
  cell: number;
}

type InternalRequest =
  | {
      type: "create";
      payload: CreateGameRequest;
    }
  | {
      type: "get";
      token?: string | null;
    }
  | {
      type: "move";
      payload: MoveGameRequest;
    };

export class GameDurableObject {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
      return this.handleWebSocket(request);
    }

    const body = (await request.json().catch(() => null)) as InternalRequest | null;

    if (!body || typeof body !== "object" || !("type" in body)) {
      return json({ error: "Invalid game operation payload." }, 400);
    }

    switch (body.type) {
      case "create":
        return this.handleCreate(body.payload);
      case "get":
        return this.handleGet(body.token);
      case "move":
        return this.handleMove(body.payload);
      default:
        return json({ error: "Unsupported game operation." }, 400);
    }
  }

  private async handleCreate(payload: CreateGameRequest): Promise<Response> {
    const existing = await this.loadState();

    if (existing) {
      return json(existing, 200);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + GAME_TTL_MS);

    const nextState: GameState = {
      gameId: payload.gameId,
      xToken: createPlayerToken(),
      oToken: createPlayerToken(),
      spectatorToken: createPlayerToken(),
      board: createEmptyBoard(),
      nextPlayer: "X",
      status: "active",
      winner: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await this.ctx.storage.put("game", nextState);
    await this.ctx.storage.setAlarm(expiresAt);
    this.broadcastGameState(nextState);

    return json(nextState, 201);
  }

  private async handleGet(token?: string | null): Promise<Response> {
    const game = await this.loadState();

    if (!game) {
      return json({ error: "Game not found." }, 404);
    }

    return json(toPublicGameState(game, token));
  }

  private async handleMove(payload: MoveGameRequest): Promise<Response> {
    const game = await this.loadState();

    if (!game) {
      return json({ error: "Game not found." }, 404);
    }

    if (game.status !== "active") {
      return json({ error: "Game is already over." }, 409);
    }

    if (!isValidCellIndex(payload.cell)) {
      return json({ error: "Cell must be between 0 and 8." }, 400);
    }

    const viewer = getViewerRole(game, payload.token);

    if (viewer === "spectator") {
      return json({ error: "Invalid player token." }, 403);
    }

    if (viewer !== game.nextPlayer) {
      return json({ error: `It is ${game.nextPlayer}'s turn.` }, 409);
    }

    if (game.board[payload.cell] !== null) {
      return json({ error: "Cell is already occupied." }, 409);
    }

    const board = [...game.board];
    board[payload.cell] = viewer;

    const now = new Date();
    const winner = getWinner(board);
    const draw = !winner && isBoardFull(board);
    const expiresAt = new Date(
      now.getTime() + (winner || draw ? FINISHED_GAME_TTL_MS : GAME_TTL_MS),
    );
    const nextState: GameState = {
      ...game,
      board,
      nextPlayer: winner || draw ? game.nextPlayer : nextPlayer(viewer),
      status: winner ? "won" : draw ? "draw" : "active",
      winner,
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await this.ctx.storage.put("game", nextState);
    await this.ctx.storage.setAlarm(expiresAt);
    this.broadcastGameState(nextState);

    return json(toPublicGameState(nextState, payload.token));
  }

  async alarm(): Promise<void> {
    const game = await this.loadState();

    if (!game) {
      return;
    }

    const expired = Date.now() >= new Date(game.expiresAt).getTime();

    if (expired || game.status !== "active") {
      await this.ctx.storage.deleteAll();
    }
  }

  private loadState(): Promise<GameState | undefined> {
    return this.ctx.storage.get<GameState>("game");
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const game = await this.loadState();

    if (!game) {
      return json({ error: "Game not found." }, 404);
    }

    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const viewer = getViewerRole(game, token);
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ viewer });
    server.send(
      JSON.stringify({
        type: "state",
        game: toPublicGameStateForViewer(game, viewer),
      }),
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void {}

  webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): void {
    ws.close(code, reason);
    if (!wasClean) {
      console.warn("WebSocket closed unexpectedly", { code, reason });
    }
  }

  private broadcastGameState(game: GameState): void {
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as
        | { viewer?: ViewerRole }
        | null;
      const viewer = attachment?.viewer ?? "spectator";

      try {
        socket.send(
          JSON.stringify({
            type: "state",
            game: toPublicGameStateForViewer(game, viewer),
          }),
        );
      } catch (error) {
        console.warn("Unable to broadcast game state", error);
      }
    }
  }
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
