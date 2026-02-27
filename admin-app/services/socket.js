import { io } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../config';
import { getToken } from '../utils/auth';

let socket = null;
let currentUserId = null;
let currentToken = null;

export function initSocket(userId) {
  const token = getToken();
  if (socket && currentUserId === userId && currentToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentUserId = userId;
  currentToken = token;
  socket = io(SOCKET_BASE_URL, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function sendSocketMessage(payload) {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  socket.emit('send_message', payload);
}

export function closeSocket() {
  if (!socket) {
    return;
  }
  socket.disconnect();
  socket = null;
  currentUserId = null;
  currentToken = null;
}
