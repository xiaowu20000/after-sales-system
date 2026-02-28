<script>
import { getSocket, initSocket } from './services/socket.js';
import { getCurrentUser } from './utils/auth';

// H5: 需要用户首次交互解锁音频，否则不会响
let h5AudioCtx = null;
let h5UnlockInited = false;

async function ensureH5AudioUnlocked() {
  // #ifdef H5
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!h5AudioCtx) h5AudioCtx = new Ctx();
  if (h5AudioCtx.state === 'suspended') {
    try {
      await h5AudioCtx.resume();
    } catch (e) {
      // ignore
    }
  }
  return h5AudioCtx;
  // #endif
  return null;
}

function initH5AudioUnlockOnce() {
  // #ifdef H5
  if (h5UnlockInited) return;
  h5UnlockInited = true;

  const unlock = async () => {
    await ensureH5AudioUnlocked();
    window.removeEventListener('touchstart', unlock, true);
    window.removeEventListener('mousedown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };

  window.addEventListener('touchstart', unlock, true);
  window.addEventListener('mousedown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  // #endif
}

async function playNotificationSound() {
  // #ifdef H5
  try {
    const audioContext = await ensureH5AudioUnlocked();
    if (!audioContext || audioContext.state !== 'running') return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.18);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.18);
  } catch (error) {
    // ignore
  }
  // #endif

  // #ifdef APP-PLUS
  try {
    plus.device.beep();
  } catch (error) {
    // ignore
  }
  // #endif
}

let boundSocket = null;
let boundAdminId = null;
let notifyHandler = null;
function bindIncomingBeep(socket, adminId) {
  if (!socket) return;
  if (boundSocket && boundSocket !== socket) {
    boundSocket.off('new_message', bindIncomingBeep._handler);
  }
  boundSocket = socket;
  boundAdminId = adminId;

  // 先解绑避免重复绑定
  if (bindIncomingBeep._handler) {
    socket.off('new_message', bindIncomingBeep._handler);
  }

  bindIncomingBeep._handler = (message) => {
    const s = Number(message?.senderId);
    const r = Number(message?.receiverId);
    // 只在“收到消息”时提示（receiver 是管理员，且不是管理员自己发的回显）
    if (Number(r) === Number(adminId) && Number(s) !== Number(adminId)) {
      playNotificationSound();
    }
  };

  socket.on('new_message', bindIncomingBeep._handler);
}
bindIncomingBeep._handler = null;

export default {
  onLaunch: function() {
    console.log('App Launch');
    initH5AudioUnlockOnce();
    
    // 初始化推送权限（App端）
    // #ifdef APP-PLUS
    plus.push.getClientInfo((info) => {
      console.log('Push client info:', info);
    });
    
    // 监听推送消息
    plus.push.addEventListener('click', (msg) => {
      console.log('Push message clicked:', msg);
      // 可以在这里处理点击推送后的跳转逻辑
    });
    // #endif
  },
  
  onShow: function() {
    console.log('App Show');
    
    // 检查是否有新消息并显示通知
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id) {
      const adminId = Number(currentUser.id);
      const socket = getSocket() || initSocket(adminId);

      // 绑定“收到消息提示音”
      bindIncomingBeep(socket, adminId);
      
      // 监听新消息（通知用）
      if (notifyHandler) {
        socket.off('new_message', notifyHandler);
      }
      notifyHandler = (message) => {
        
        // 如果应用在后台，显示推送通知
        // #ifdef APP-PLUS
        if (plus.os.name === 'Android' || plus.os.name === 'iOS') {
          // 创建本地通知
          plus.push.createMessage(
            message.content || '[新消息]',
            `来自用户 #${message.senderId}`,
            {
              title: '新消息',
              cover: false
            }
          );
        }
        // #endif
        
        // H5端显示浏览器通知
        // #ifdef H5
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('新消息', {
            body: message.content || '您收到一条新消息',
            icon: '/static/logo.png'
          });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('新消息', {
                body: message.content || '您收到一条新消息',
                icon: '/static/logo.png'
              });
            }
          });
        }
        // #endif
      };
      socket.on('new_message', notifyHandler);
    }
  },
  
  onHide: function() {
    console.log('App Hide');
  }
}
</script>

<style>
/*每个页面公共css */
</style>
