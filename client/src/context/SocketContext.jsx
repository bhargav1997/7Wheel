import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

const defaultGameState = {
  status: 'WAITING_FOR_PLAYERS',
  roundNumber: 0,
  playerCount: 0,
  bettorCount: 0,
  pot: 0,
  timeLeft: 0,
  result: null,
  winningCategory: null,
  winners: [],
  players: [],
};

export const SocketProvider = ({ children }) => {
  const { token, updateBalance } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(defaultGameState);
  const [myBet, setMyBet] = useState(null);    // current round bet (private)
  const [betError, setBetError] = useState('');
  const [isKicked, setIsKicked] = useState(false); // true when server evicted this session

  // Connect when authenticated
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinLobby', { token });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('gameState', (state) => {
      setGameState(state);
      // Reset personal bet tracking when new round starts
      if (state.status === 'WAITING_FOR_PLAYERS') {
        setMyBet(null);
        setBetError('');
      }
    });

    socket.on('balanceUpdate', ({ newBalance }) => {
      updateBalance(newBalance);
    });

    socket.on('betConfirmed', ({ amount, choice, newBalance }) => {
      setMyBet({ amount, choice });
      setBetError('');
      updateBalance(newBalance);
    });

    socket.on('betError', ({ message }) => {
      setBetError(message);
    });

    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
    });

    // Server evicted this socket because the same account opened a new tab.
    // Stop reconnection so the old tab doesn't keep fighting the new one.
    socket.on('kicked', ({ message }) => {
      setIsKicked(true);
      setConnected(false);
      // Prevent Socket.io auto-reconnect from re-entering the lobby
      socket.io.reconnection(false);
      socket.disconnect();
      toast.error(message || 'Session closed — you joined from another tab.', {
        duration: Infinity,
        id: 'session-kicked',
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const placeBet = useCallback(({ amount, choice }) => {
    if (!socketRef.current || !token) return;
    setBetError('');
    socketRef.current.emit('placeBet', { token, amount, choice });
  }, [token]);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      gameState,
      myBet,
      betError,
      setBetError,
      placeBet,
      isKicked,
    }}>
      {children}
    </SocketContext.Provider>
  );
};
