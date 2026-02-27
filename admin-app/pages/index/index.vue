<template>
  <view class="page">
    <scroll-view 
      scroll-y 
      class="scroll-container"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @refresherrestore="onRefreshRestore"
    >
      <view v-if="conversationList.length === 0" class="empty">
        <text>暂无会话</text>
      </view>

      <view
        v-for="item in conversationList"
        :key="item.peerId"
        class="conversation-item"
        @click="goToChat(item.peerId)"
      >
        <view class="avatar">
          <text class="avatar-text">{{ getUserDisplayName(item.peerId).charAt(0).toUpperCase() }}</text>
        </view>
        <view class="content">
          <view class="content-top">
            <text class="name">{{ getUserDisplayName(item.peerId) }}</text>
            <text class="time">{{ toDisplayTime(item.lastMessage?.createdAt) }}</text>
          </view>
          <view class="content-bottom">
            <text class="last-msg">{{ item.lastMessage?.type === 'IMAGE' ? '[图片]' : (item.lastMessage?.content || '') }}</text>
            <view v-if="item.unreadCount > 0" class="badge">{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { closeSocket, getSocket, initSocket } from '../../services/socket.js';
import { getActiveChatPeer, increaseUnread } from '../../utils/chat-state';
import { clearAuth, getCurrentUser } from '../../utils/auth';
import { httpGet } from '../../utils/http';

const currentUser = ref(getCurrentUser());
const adminId = Number(currentUser.value?.id || 0);
const conversations = ref([]);
const refreshing = ref(false);
const userEmails = ref({}); // 存储用户邮箱
const userRemarks = ref({}); // 存储用户备注

const conversationList = computed(() => conversations.value || []);

// 从本地存储加载用户备注
function loadUserRemarks() {
  try {
    const stored = uni.getStorageSync('user_remarks');
    if (stored) {
      userRemarks.value = JSON.parse(stored);
    }
  } catch (error) {
    userRemarks.value = {};
  }
}

// 保存用户备注到本地存储
function saveUserRemark(userId, remark) {
  userRemarks.value[userId] = remark;
  try {
    uni.setStorageSync('user_remarks', JSON.stringify(userRemarks.value));
  } catch (error) {
    console.error('Save remark failed', error);
  }
}

// 获取用户显示名称（备注优先，然后是邮箱，最后是 User #ID）
function getUserDisplayName(userId) {
  if (userRemarks.value[userId]) {
    return userRemarks.value[userId];
  }
  if (userEmails.value[userId]) {
    return userEmails.value[userId];
  }
  return `User #${userId}`;
}

// 加载用户邮箱信息
async function loadUserEmail(userId) {
  if (userEmails.value[userId]) return;
  try {
    const user = await httpGet(`/users/${userId}`);
    if (user && user.email) {
      userEmails.value[userId] = user.email;
    }
  } catch (error) {
    // 忽略错误
  }
}

function toDisplayTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }
}

async function loadConversations() {
  try {
    const data = await httpGet('/messages/conversations?page=1&pageSize=50');
    conversations.value = data.items || [];
    
    // 加载所有用户的邮箱
    for (const item of conversations.value) {
      await loadUserEmail(item.peerId);
    }
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
}

function onRefresh() {
  refreshing.value = true;
  loadConversations().finally(() => {
    setTimeout(() => {
      refreshing.value = false;
    }, 500);
  });
}

function onRefreshRestore() {
  refreshing.value = false;
}

function goToChat(userId) {
  uni.navigateTo({ url: `/pages/chat/chat?userId=${userId}` });
}

const handleSocketNewMessage = (message) => {
  const peerId =
    Number(message.senderId) === adminId ? Number(message.receiverId) : Number(message.senderId);
  const activePeer = getActiveChatPeer(adminId);
  if (Number(message.receiverId) === adminId && Number(activePeer) !== Number(peerId)) {
    increaseUnread(adminId, peerId);
  }
  loadConversations();
};

const handleSocketError = () => {
  uni.showToast({ title: '聊天错误', icon: 'none' });
};

function bindSocketEvents(socket) {
  socket.on('new_message', handleSocketNewMessage);
  socket.on('chat_error', handleSocketError);
}

onMounted(() => {
  if (!adminId) {
    uni.reLaunch({ url: '/pages/login/login' });
    return;
  }
  loadUserRemarks();
  loadConversations();
  const socket = initSocket(adminId);
  bindSocketEvents(socket);
});

onShow(() => {
  if (!adminId) return;
  loadConversations();
});

onUnmounted(() => {
  const socket = getSocket();
  if (!socket) return;
  socket.off('new_message', handleSocketNewMessage);
  socket.off('chat_error', handleSocketError);
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #ededed;
  display: flex;
  flex-direction: column;
}

.scroll-container {
  flex: 1;
  height: 100%;
}

.empty {
  padding: 200rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
}

.conversation-item:active {
  background: #f5f5f5;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 8rpx;
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.avatar-text {
  color: #fff;
  font-size: 36rpx;
  font-weight: 600;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.content-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.name {
  font-size: 32rpx;
  font-weight: 500;
  color: #191919;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  font-size: 24rpx;
  color: #999;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.content-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-msg {
  font-size: 28rpx;
  color: #999;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  min-width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  padding: 0 12rpx;
  border-radius: 18rpx;
  text-align: center;
  color: #fff;
  font-size: 22rpx;
  background: #fa5151;
  margin-left: 16rpx;
  flex-shrink: 0;
}
</style>
