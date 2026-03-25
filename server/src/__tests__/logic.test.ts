import { checkResult, isValidMove, applyMove, emptyBoard } from '../game/logic';

describe('checkResult', () => {
  it('returns null for an empty board', () => {
    expect(checkResult(emptyBoard())).toBeNull();
  });

  it('detects row wins', () => {
    const board = ['X', 'X', 'X', null, null, null, null, null, null];
    expect(checkResult(board)).toBe('X_WINS');

    const board2 = [null, null, null, 'O', 'O', 'O', null, null, null];
    expect(checkResult(board2)).toBe('O_WINS');

    const board3 = [null, null, null, null, null, null, 'X', 'X', 'X'];
    expect(checkResult(board3)).toBe('X_WINS');
  });

  it('detects column wins', () => {
    const board = ['X', null, null, 'X', null, null, 'X', null, null];
    expect(checkResult(board)).toBe('X_WINS');

    const board2 = [null, 'O', null, null, 'O', null, null, 'O', null];
    expect(checkResult(board2)).toBe('O_WINS');
  });

  it('detects diagonal wins', () => {
    const board = ['X', null, null, null, 'X', null, null, null, 'X'];
    expect(checkResult(board)).toBe('X_WINS');

    const board2 = [null, null, 'O', null, 'O', null, 'O', null, null];
    expect(checkResult(board2)).toBe('O_WINS');
  });

  it('detects a draw', () => {
    // X O X / O X X / O X O — no winner, all filled
    const board = ['X', 'O', 'X', 'O', 'X', 'X', 'O', 'X', 'O'];
    expect(checkResult(board)).toBe('DRAW');
  });

  it('returns null for an in-progress board', () => {
    const board = ['X', 'O', null, null, 'X', null, null, null, null];
    expect(checkResult(board)).toBeNull();
  });
});

describe('isValidMove', () => {
  const board = emptyBoard();

  it('accepts a valid move', () => {
    expect(isValidMove(board, 0, 'X', 'X')).toBe(true);
  });

  it('rejects an out-of-bounds position', () => {
    expect(isValidMove(board, -1, 'X', 'X')).toBe(false);
    expect(isValidMove(board, 9, 'X', 'X')).toBe(false);
  });

  it('rejects an occupied cell', () => {
    const occupied = ['X', null, null, null, null, null, null, null, null];
    expect(isValidMove(occupied, 0, 'O', 'O')).toBe(false);
  });

  it('rejects a move when it is not the player\'s turn', () => {
    expect(isValidMove(board, 0, 'O', 'X')).toBe(false);
  });
});

describe('applyMove', () => {
  it('places the symbol at the given position', () => {
    const board = applyMove(emptyBoard(), 4, 'X');
    expect(board[4]).toBe('X');
  });

  it('does not mutate the original board', () => {
    const original = emptyBoard();
    applyMove(original, 0, 'X');
    expect(original[0]).toBeNull();
  });

  it('leaves other cells unchanged', () => {
    const board = applyMove(emptyBoard(), 0, 'X');
    expect(board.filter((c) => c !== null)).toHaveLength(1);
  });
});
