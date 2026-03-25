import { useEffect, useState } from 'react';
import { socket, connectSocket } from '../socket';
import { useAuthStore } from '../store/authStore';

interface QueueEntry {
  userId: string;
  username: string;
  joinedAt: string;
}

interface ActiveMatch {
  roomId: string;
  playerX: { userId: string; username: string };
  playerO: { userId: string; username: string };
  startedAt: string;
}

interface AdminState {
  queue: QueueEntry[];
  activeMatches: ActiveMatch[];
}

function elapsed(since: string) {
  const secs = Math.floor((Date.now() - new Date(since).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function AdminDashboard() {
  const [state, setState] = useState<AdminState>({ queue: [], activeMatches: [] });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function joinAdmin() {
      socket.emit('admin:join');
    }

    socket.on('admin:state', (data: AdminState) => setState(data));

    if (socket.connected) {
      joinAdmin();
    } else {
      const token = useAuthStore.getState().token;
      if (token) connectSocket(token);
      socket.once('connect', joinAdmin);
    }

    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      socket.emit('admin:leave');
      socket.off('admin:state');
      socket.off('connect', joinAdmin);
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: 800 }}>
      <h1>Admin Dashboard</h1>

      <section>
        <h2>Lobby Queue ({state.queue.length} waiting)</h2>
        {state.queue.length === 0 ? (
          <p style={{ color: '#888' }}>No players in queue</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                <th style={{ padding: '8px' }}>Username</th>
                <th style={{ padding: '8px' }}>User ID</th>
                <th style={{ padding: '8px' }}>Waiting</th>
              </tr>
            </thead>
            <tbody>
              {state.queue.map((entry) => (
                <tr key={entry.userId} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{entry.username}</td>
                  <td style={{ padding: '8px', color: '#888', fontSize: '0.85em' }}>{entry.userId}</td>
                  <td style={{ padding: '8px' }}>{elapsed(entry.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Active Matches ({state.activeMatches.length} in progress)</h2>
        {state.activeMatches.length === 0 ? (
          <p style={{ color: '#888' }}>No active matches</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                <th style={{ padding: '8px' }}>Player X</th>
                <th style={{ padding: '8px' }}>Player O</th>
                <th style={{ padding: '8px' }}>Duration</th>
                <th style={{ padding: '8px' }}>Room ID</th>
                <th style={{ padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.activeMatches.map((match) => (
                <tr key={match.roomId} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{match.playerX.username}</td>
                  <td style={{ padding: '8px' }}>{match.playerO.username}</td>
                  <td style={{ padding: '8px' }}>{elapsed(match.startedAt)}</td>
                  <td style={{ padding: '8px', color: '#888', fontSize: '0.85em' }}>{match.roomId}</td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => socket.emit('admin:delete_game', { roomId: match.roomId })}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
