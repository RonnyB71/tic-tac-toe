import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Board from '../components/Board';

function emptyBoard() {
  return Array(9).fill(null);
}

describe('Board', () => {
  it('renders 9 cells', () => {
    render(<Board board={emptyBoard()} onCellClick={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(9);
  });

  it('passes the correct index to onCellClick', async () => {
    const onCellClick = vi.fn();
    render(<Board board={emptyBoard()} onCellClick={onCellClick} />);
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[4]);
    expect(onCellClick).toHaveBeenCalledWith(4);
  });

  it('renders cell values from the board array', () => {
    const board = ['X', 'O', null, null, 'X', null, null, null, 'O'];
    render(<Board board={board} onCellClick={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('X');
    expect(buttons[1]).toHaveTextContent('O');
    expect(buttons[4]).toHaveTextContent('X');
    expect(buttons[8]).toHaveTextContent('O');
  });

  it('disables occupied cells', () => {
    const board = ['X', null, null, null, null, null, null, null, null];
    render(<Board board={board} onCellClick={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).not.toBeDisabled();
  });
});
