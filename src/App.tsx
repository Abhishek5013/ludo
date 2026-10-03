import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import { GameRoom } from './components/board/GameRoom.js';
import { Lobby } from './components/lobby/Lobby.js';
import { PlayerColor } from './types/ludo.js';
import { getApiBaseUrl } from './utils/apiUrl.js';

// Resolve authoritative socket server URL
function getSocketUrl(): string {
  if (typeof window === 'undefined') return '';
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && envUrl.trim() !== '') {
    const isRemoteBrowser =
      window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    // If the browser is accessing over the internet (e.g. Cloud Run), do NOT connect to localhost:3001
    if (!isRemoteBrowser || !envUrl.includes('localhost')) {
      return envUrl;
    }
  }
  return window.location.origin;
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentRoute, setCurrentRoute] = useState<{ path: string; gameId?: string }>({
    path: '/',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse path from window.location
  const parseCurrentPath = () => {
    const pathname = window.location.pathname;
    if (pathname === '/admin' || pathname.startsWith('/admin')) {
      return { path: '/admin' };
    }
    const match = pathname.match(/^\/game\/([A-Za-z0-9]+)/);
    if (match) {
      return { path: '/game', gameId: match[1].toUpperCase() };
    }
    return { path: '/' };
  };

  // Sync route on mount and browser back/forward
  useEffect(() => {
    setCurrentRoute(parseCurrentPath());

    const handlePopState = () => {
      setCurrentRoute(parseCurrentPath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initialize Socket.IO connection with polling-first transport
  useEffect(() => {
    const socketUrl = getSocketUrl();
    const s = io(socketUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['polling', 'websocket'],
    });

    s.on('connect', () => {
      console.log('⚡ Connected to Ludo Royale Socket server:', s.id);
    });

    s.on('connect_error', (err) => {
      console.warn('Socket connect warning:', err.message);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Navigation helpers
  const navigateTo = (path: string, gameId?: string) => {
    let fullUrl = path;
    if (gameId) fullUrl = `/game/${gameId}`;
    window.history.pushState({}, '', fullUrl);
    setCurrentRoute({ path, gameId });
    setErrorMessage(null);
  };

  // Create Game action: Instant REST API call with immediate response
  const handleCreateGame = async (name: string, maxPlayers: 2 | 3 | 4, color?: PlayerColor) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name, maxPlayers, preferredColor: color }),
      });
      const data = await res.json();
      setIsLoading(false);

      if (data && data.success && data.game) {
        localStorage.setItem(`ludo_player_${data.game.gameId}`, data.playerId);
        localStorage.setItem(`ludo_token_${data.game.gameId}`, data.token);
        navigateTo('/game', data.game.gameId);
      } else {
        setErrorMessage(data?.error || 'Failed to create game room');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Network error creating game');
    }
  };

  // Join Game action: Instant REST API call with immediate response
  const handleJoinGame = async (gameId: string, name: string, color?: PlayerColor) => {
    setIsLoading(true);
    setErrorMessage(null);

    const code = gameId.toUpperCase();
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/games/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name, preferredColor: color }),
      });
      const data = await res.json();
      setIsLoading(false);

      if (data && data.success && data.game) {
        localStorage.setItem(`ludo_player_${code}`, data.playerId);
        localStorage.setItem(`ludo_token_${code}`, data.token);
        navigateTo('/game', code);
      } else {
        setErrorMessage(data?.error || 'Unable to join game. Check room code.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Network error joining game');
    }
  };

  // View routing
  if (currentRoute.path === '/admin') {
    return (
      <AdminDashboard
        socket={socket}
        onNavigateHome={() => navigateTo('/')}
        onOpenPlayerGame={(gameId) => navigateTo('/game', gameId)}
      />
    );
  }

  if (currentRoute.path === '/game' && currentRoute.gameId) {
    return (
      <GameRoom
        gameId={currentRoute.gameId}
        socket={socket}
        onNavigateHome={() => navigateTo('/')}
        onNavigateToAdmin={() => navigateTo('/admin')}
      />
    );
  }

  return (
    <Lobby
      onCreateGame={handleCreateGame}
      onJoinGame={handleJoinGame}
      onNavigateToAdmin={() => navigateTo('/admin')}
      isLoading={isLoading}
      errorMessage={errorMessage}
    />
  );
}
