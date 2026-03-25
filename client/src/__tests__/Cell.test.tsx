import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Cell from '../components/Cell';

describe('Cell', () => {
  it('renders empty when value is null', () => {
    render(<Cell value={null} onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('');
  });

  it('renders the symbol when given a value', () => {
    render(<Cell value="X" onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('X');
  });

  it('is not disabled for an empty cell', () => {
    render(<Cell value={null} onClick={() => {}} />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('is disabled when the cell is occupied', () => {
    render(<Cell value="O" onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when an empty cell is clicked', async () => {
    const onClick = vi.fn();
    render(<Cell value={null} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when an occupied cell is clicked', async () => {
    const onClick = vi.fn();
    render(<Cell value="X" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
