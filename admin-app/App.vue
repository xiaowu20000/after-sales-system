<script>
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { getSocket, initSocket } from './services/socket.js';
import { getCurrentUser } from './utils/auth';

export default {
  onLaunch: function() {
    console.log('App Launch');
    
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
      
      // 监听新消息
      socket.on('new_message', (message) => {
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
      });
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
