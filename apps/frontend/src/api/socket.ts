import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    throw new Error('Socket not initialized. Call initSocket() first.');
  }
  return socket;
}

export function initSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }

  const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

  socket = io(WS_URL, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => console.log('[WS] Connected'));
  socket.on('disconnect', (reason) => console.log('[WS] Disconnected:', reason));
  socket.on('connect_error', (err) => console.warn('[WS] Error:', err.message));

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
