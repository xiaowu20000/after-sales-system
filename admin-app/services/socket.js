import { io } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../config';
import { getToken } from '../utils/auth';

let socket = null;
let currentUserId = null;
let currentToken = null;

function waitForConnected(target, timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (!target) {
      reject(new Error('Socket not initialized'));
      return;
    }
    if (target.connected) {
      resolve();
      return;
    }

    let timer = null;
    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      target.off('connect', onConnect);
      target.off('connect_error', onConnectError);
    };
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onConnectError = (err) => {
      cleanup();
      reject(new Error(err?.message || 'Socket connect error'));
    };

    target.on('connect', onConnect);
    target.on('connect_error', onConnectError);
    try {
      target.connect();
    } catch (error) {
      cleanup();
      reject(error);
      return;
    }

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Socket connect timeout'));
    }, timeout);
  });
}

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
  // App 打包环境使用 polling + websocket，兼容更多网络环境。
  // #ifdef APP-PLUS
  const transports = ['polling', 'websocket'];
  // #endif
  // #ifndef APP-PLUS
  const transports = ['polling', 'websocket'];
  // #endif

  socket = io(SOCKET_BASE_URL, {
    transports,
    upgrade: transports.length > 1,
    path: '/socket.io/',
    auth: { token },
    // 后端已兼容 handshake.query.token，这里双通道带 token 兼容更多运行时
    query: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 3000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[socket] connected', socket?.id);
  });
  socket.on('connect_error', (err) => {
    console.log('[socket] connect_error', err?.message || err);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function sendSocketMessage(payload) {
  return waitForConnected(socket).then(() => {
    socket.emit('send_message', payload);
  });
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
