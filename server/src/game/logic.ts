export type Board = (string | null)[];
export type GameResult = 'X_WINS' | 'O_WINS' | 'DRAW' | null;

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

export function checkResult(board: Board): GameResult {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] === 'X' ? 'X_WINS' : 'O_WINS';
    }
  }
  if (board.every((cell) => cell !== null)) return 'DRAW';
  return null;
}

export function isValidMove(board: Board, position: number, symbol: 'X' | 'O', currentTurn: 'X' | 'O'): boolean {
  if (position < 0 || position > 8) return false;
  if (board[position] !== null) return false;
  if (symbol !== currentTurn) return false;
  return true;
}

export function applyMove(board: Board, position: number, symbol: 'X' | 'O'): Board {
  const next = [...board];
  next[position] = symbol;
  return next;
}

export function emptyBoard(): Board {
  return Array(9).fill(null);
}
