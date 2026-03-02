<script>
import { getSocket, initSocket } from './services/socket.js';
import { getCurrentUser } from './utils/auth';

let notifyAudio = null;
let h5UnlockInited = false;
let h5AudioUnlocked = false;
let boundSocket = null;
let notifyHandler = null;

function ensureNotifyAudio() {
  if (notifyAudio) return notifyAudio;
  notifyAudio = uni.createInnerAudioContext();
  notifyAudio.src = '/static/notify.wav';
  // #ifdef APP-PLUS
  notifyAudio.onError(() => {
    // 某些机型/打包环境下需使用 _www 前缀
    try {
      notifyAudio.src = '_www/static/notify.wav';
    } catch (e) {
      // ignore
    }
  });
  // #endif
  notifyAudio.autoplay = false;
  notifyAudio.loop = false;
  notifyAudio.volume = 1;
  notifyAudio.obeyMuteSwitch = false;
  return notifyAudio;
}

function initH5AudioUnlockOnce() {
  // #ifdef H5
  if (h5UnlockInited) return;
  h5UnlockInited = true;

  const unlock = () => {
    const audio = ensureNotifyAudio();
    try {
      const maybePromise = audio.play();
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {});
      }
      setTimeout(() => {
        try {
          audio.pause();
          if (typeof audio.seek === 'function') audio.seek(0);
        } catch (e) {
          // ignore
        }
      }, 30);
      h5AudioUnlocked = true;
    } catch (e) {
      // ignore
    }
    window.removeEventListener('touchstart', unlock, true);
    window.removeEventListener('mousedown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };

  window.addEventListener('touchstart', unlock, true);
  window.addEventListener('mousedown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  // #endif
}

function requestAndroidNotificationPermission() {
  // #ifdef APP-PLUS
  try {
    if (plus.os.name !== 'Android') return;
    const Build = plus.android.importClass('android.os.Build');
    if (Number(Build.VERSION.SDK_INT) < 33) return;

    plus.android.requestPermissions(
      ['android.permission.POST_NOTIFICATIONS'],
      (result) => {
        console.log('POST_NOTIFICATIONS permission:', result);
      },
      (error) => {
        console.log('POST_NOTIFICATIONS permission failed:', error);
      }
    );
  } catch (e) {
    console.log('request notification permission error:', e);
  }
  // #endif
}

function createSystemNotification(message, senderId) {
  // #ifdef APP-PLUS
  try {
    if (!plus.push || typeof plus.push.createMessage !== 'function') return;
    plus.push.createMessage(
      message?.content || '[新消息]',
      JSON.stringify({ senderId }),
      {
        title: '新消息',
        cover: false,
      }
    );
  } catch (e) {
    console.log('create local push failed:', e);
  }
  // #endif
}

function playNotificationSound() {
  // #ifdef H5
  if (!h5AudioUnlocked) return;
  // #endif

  const audio = ensureNotifyAudio();

  try {
    audio.stop();
  } catch (e) {
    // ignore
  }

  try {
    if (typeof audio.seek === 'function') audio.seek(0);
  } catch (e) {
    // ignore
  }

  try {
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {});
    }
  } catch (e) {
    // ignore
  }

  // #ifdef APP-PLUS
  try {
    plus.device.beep(1);
  } catch (e) {
    // ignore
  }

  try {
    plus.device.vibrate(80);
  } catch (e) {
    // ignore
  }
  // #endif
}

function bindMessageNotify(socket, adminId) {
  if (!socket) return;

  if (boundSocket && boundSocket !== socket && notifyHandler) {
    boundSocket.off('new_message', notifyHandler);
  }
  boundSocket = socket;

  if (notifyHandler) {
    socket.off('new_message', notifyHandler);
  }

  notifyHandler = (message) => {
    const senderId = Number(message?.senderId);
    const receiverId = Number(message?.receiverId);
    // 有些后端事件可能缺少 receiverId；只要不是管理员自己发的就提示
    const isFromOther = !Number.isFinite(senderId) || senderId !== Number(adminId);
    const isToAdmin = !Number.isFinite(receiverId) || receiverId === Number(adminId);
    const isIncoming = isFromOther && isToAdmin;
    if (!isIncoming) return;

    playNotificationSound();

    createSystemNotification(message, senderId);

    // #ifdef H5
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('新消息', {
        body: message?.content || '您收到一条新消息',
        icon: '/static/logo.png',
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('新消息', {
            body: message?.content || '您收到一条新消息',
            icon: '/static/logo.png',
          });
        }
      });
    }
    // #endif
  };

  socket.on('new_message', notifyHandler);
}

export default {
  onLaunch() {
    console.log('App Launch');
    initH5AudioUnlockOnce();
    requestAndroidNotificationPermission();

    // #ifdef APP-PLUS
    // push 模块未勾选时，直接调用 plus.push 会弹系统提示，这里不做强调用
    // #endif
  },

  onShow() {
    console.log('App Show');

    // #ifdef H5
    ensureNotifyAudio();
    // #endif

    const currentUser = getCurrentUser();
    if (!currentUser?.id) return;

    const adminId = Number(currentUser.id);
    const socket = getSocket() || initSocket(adminId);
    bindMessageNotify(socket, adminId);
  },

  onHide() {
    console.log('App Hide');
  },

  onUnload() {
    if (boundSocket && notifyHandler) {
      boundSocket.off('new_message', notifyHandler);
    }
    notifyHandler = null;
    boundSocket = null;

    if (notifyAudio) {
      try {
        notifyAudio.destroy();
      } catch (e) {
        // ignore
      }
      notifyAudio = null;
    }
  },
};
</script>

<style>
/*每个页面公共css */
</style>
