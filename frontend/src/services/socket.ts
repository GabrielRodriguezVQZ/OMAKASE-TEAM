import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export let socket: Socket | null = null;

export const connectSocket = (token: string) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Conectado al servidor WebSocket');
  });

  socket.on('disconnect', () => {
    console.log('Desconectado del servidor WebSocket');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinSurgery = (surgeryId: string) => {
  if (socket) {
    socket.emit('join-surgery', { surgeryId });
  }
};

export const leaveSurgery = (surgeryId: string) => {
  if (socket) {
    socket.emit('leave-surgery', { surgeryId });
  }
};
