import { create } from 'zustand';

export type Board = (string | null)[];
export type MatchStatus = 'idle' | 'queuing' | 'playing' | 'over';

interface GameState {
  board: Board;
  turn: 'X' | 'O';
  mySymbol: 'X' | 'O' | null;
  roomId: string | null;
  status: MatchStatus;
  result: string | null;
  // actions
  setMatch: (roomId: string, mySymbol: 'X' | 'O') => void;
  applyBoard: (board: Board, turn: 'X' | 'O') => void;
  setResult: (result: string) => void;
  reset: () => void;
}

const initialState = {
  board: Array(9).fill(null) as Board,
  turn: 'X' as const,
  mySymbol: null,
  roomId: null,
  status: 'idle' as const,
  result: null,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setMatch: (roomId, mySymbol) =>
    set({ roomId, mySymbol, status: 'playing', board: Array(9).fill(null), turn: 'X', result: null }),
  applyBoard: (board, turn) => set({ board, turn }),
  setResult: (result) => set({ result, status: 'over' }),
  reset: () => set(initialState),
}));
