import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket, connectSocket } from '../socket';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';

interface ActiveGame {
  roomId: string;
  symbol: 'X' | 'O';
}

export default function Lobby() {
  const { status, setMatch, reset } = useGameStore();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);

  useEffect(() => {
    function checkActive() {
      socket.emit('lobby:check_active');
    }

    socket.on('lobby:active_game', (game: ActiveGame) => setActiveGame(game));

    socket.on('match:found', ({ roomId, mySymbol }: { roomId: string; mySymbol: 'X' | 'O' }) => {
      console.log('[Lobby] match:found received', { roomId, mySymbol });
      setMatch(roomId, mySymbol);
      navigate(`/game/${roomId}`);
    });

    if (socket.connected) {
      checkActive();
    } else {
      const token = useAuthStore.getState().token;
      if (token) connectSocket(token);
      socket.once('connect', checkActive);
    }

    return () => {
      socket.off('lobby:active_game');
      socket.off('match:found');
      socket.off('connect', checkActive);
    };
  }, [navigate, setMatch]);

  function joinQueue() {
    reset();
    socket.emit('queue:join');
    useGameStore.setState({ status: 'queuing' });
  }

  function leaveQueue() {
    socket.emit('queue:leave');
    useGameStore.setState({ status: 'idle' });
  }

  function rejoinGame() {
    if (!activeGame) return;
    setMatch(activeGame.roomId, activeGame.symbol);
    navigate(`/game/${activeGame.roomId}`);
  }

  return (
    <div>
      <h1>Lobby</h1>
      <p>Welcome, {username}</p>

      {activeGame && (
        <div style={{ border: '1px solid orange', padding: '1rem', marginBottom: '1rem' }}>
          <p>You have an active game in progress (playing as {activeGame.symbol}).</p>
          <button onClick={rejoinGame}>Rejoin Game</button>
        </div>
      )}

      {!activeGame && status === 'idle' && <button onClick={joinQueue}>Find Match</button>}
      {status === 'queuing' && (
        <>
          <p>Searching for opponent...</p>
          <button onClick={leaveQueue}>Cancel</button>
        </>
      )}
    </div>
  );
}
