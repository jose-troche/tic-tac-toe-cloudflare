export type Player = "X" | "O";
export type ViewerRole = Player | "spectator";

export type Cell = Player | null;

export type GameStatus = "active" | "won" | "draw" | "expired";

export interface GameState {
  gameId: string;
  xToken: string;
  oToken: string;
  spectatorToken: string;
  board: Cell[];
  nextPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface PublicGameState {
  gameId: string;
  board: Cell[];
  nextPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  viewer: ViewerRole;
}

export interface CreateGameResult {
  gameId: string;
  xUrl: string;
  oUrl: string;
  spectatorUrl: string;
}

export interface MoveResult {
  game: PublicGameState;
}

export const GAME_TTL_MS = 1000 * 60 * 60 * 24 * 2;
export const FINISHED_GAME_TTL_MS = 1000 * 60 * 60 * 24;

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export function createEmptyBoard(): Cell[] {
  return Array.from<Cell>({ length: 9 }).fill(null);
}

export function toPublicGameState(
  game: GameState,
  token?: string | null,
): PublicGameState {
  return toPublicGameStateForViewer(game, getViewerRole(game, token));
}

export function toPublicGameStateForViewer(
  game: GameState,
  viewer: ViewerRole,
): PublicGameState {
  return {
    gameId: game.gameId,
    board: game.board,
    nextPlayer: game.nextPlayer,
    status: game.status,
    winner: game.winner,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    expiresAt: game.expiresAt,
    viewer,
  };
}

export function getViewerRole(
  game: GameState,
  token?: string | null,
): ViewerRole {
  if (token && token === game.xToken) {
    return "X";
  }

  if (token && token === game.oToken) {
    return "O";
  }

  return "spectator";
}

export function isValidCellIndex(cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < 9;
}

export function getWinner(board: Cell[]): Player | null {
  for (const [a, b, c] of WINNING_LINES) {
    const candidate = board[a];

    if (candidate && candidate === board[b] && candidate === board[c]) {
      return candidate;
    }
  }

  return null;
}

export function isBoardFull(board: Cell[]): boolean {
  return board.every((cell) => cell !== null);
}

export function nextPlayer(player: Player): Player {
  return player === "X" ? "O" : "X";
}
