import { useGameStore } from '../store/gameStore';

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('setMatch', () => {
  it('sets status to playing, stores roomId and mySymbol, resets board and turn', () => {
    useGameStore.getState().setMatch('room-1', 'X');
    const s = useGameStore.getState();
    expect(s.status).toBe('playing');
    expect(s.roomId).toBe('room-1');
    expect(s.mySymbol).toBe('X');
    expect(s.turn).toBe('X');
    expect(s.board).toEqual(Array(9).fill(null));
    expect(s.result).toBeNull();
  });
});

describe('applyBoard', () => {
  it('updates board and turn', () => {
    useGameStore.getState().setMatch('room-1', 'X');
    const newBoard = ['X', null, null, null, null, null, null, null, null];
    useGameStore.getState().applyBoard(newBoard, 'O');
    const s = useGameStore.getState();
    expect(s.board).toEqual(newBoard);
    expect(s.turn).toBe('O');
  });
});

describe('setResult', () => {
  it('sets result and changes status to over', () => {
    useGameStore.getState().setMatch('room-1', 'X');
    useGameStore.getState().setResult('X_WINS');
    const s = useGameStore.getState();
    expect(s.result).toBe('X_WINS');
    expect(s.status).toBe('over');
  });
});

describe('reset', () => {
  it('restores the initial state', () => {
    useGameStore.getState().setMatch('room-1', 'O');
    useGameStore.getState().reset();
    const s = useGameStore.getState();
    expect(s.status).toBe('idle');
    expect(s.mySymbol).toBeNull();
    expect(s.roomId).toBeNull();
    expect(s.board).toEqual(Array(9).fill(null));
  });
});
