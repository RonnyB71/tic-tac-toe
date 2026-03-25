import Cell from './Cell';
import type { Board as BoardType } from '../store/gameStore';

interface Props {
  board: BoardType;
  onCellClick: (index: number) => void;
}

export default function Board({ board, onCellClick }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 100px)', gap: '4px' }}>
      {board.map((value, i) => (
        <Cell key={i} value={value} onClick={() => onCellClick(i)} />
      ))}
    </div>
  );
}
