import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useGameStore, Board as BoardType } from '../store/gameStore';
import Board from '../components/Board';

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const { board, turn, mySymbol, status, result, applyBoard, setResult } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('move:broadcast', ({ board, turn }: { board: BoardType; turn: 'X' | 'O' }) => {
      console.log('[Game] move:broadcast received', { board, turn });
      applyBoard(board, turn);
    });
    socket.on('game:over', ({ board, result }: { board: BoardType; result: string }) => {
      applyBoard(board, turn);
      setResult(result);
    });
    socket.on('game:cancelled', () => {
      navigate('/lobby');
    });
    return () => {
      socket.off('move:broadcast');
      socket.off('game:over');
      socket.off('game:cancelled');
    };
  }, [applyBoard, setResult, turn, navigate]);

  function handleCellClick(position: number) {
    console.log('[Game] cell clicked', { position, status, turn, mySymbol, cellValue: board[position] });
    if (status !== 'playing' || turn !== mySymbol || board[position]) {
      console.log('[Game] move blocked by guard');
      return;
    }
    console.log('[Game] emitting move:make', { roomId, position });
    socket.emit('move:make', { roomId, position });
  }

  return (
    <div>
      <h1>Game</h1>
      {status === 'playing' && <p>{turn === mySymbol ? 'Your turn' : "Opponent's turn"}</p>}
      {status === 'over' && (
        <>
          <p>
            {result === 'DRAW' ? 'Draw!' :
             result === `${mySymbol}_WINS` ? 'You win!' : 'You lose!'}
          </p>
          <button onClick={() => navigate('/lobby')}>Back to Lobby</button>
        </>
      )}
      <Board board={board} onCellClick={handleCellClick} />
    </div>
  );
}
