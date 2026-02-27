<template>
  <view class="page">
    <view class="header">
      <text class="title">Active Conversations</text>
      <view class="header-actions">
        <button class="btn" size="mini" @click="loadConversations">Refresh</button>
        <button class="btn" size="mini" @click="openMailConfig">Mail</button>
        <button class="btn danger" size="mini" @click="logout">Logout</button>
      </view>
    </view>

    <view v-if="conversationList.length === 0" class="empty">
      <text>No active conversations</text>
    </view>

    <view
      v-for="item in conversationList"
      :key="item.peerId"
      class="card"
      @click="goToChat(item.peerId)"
    >
      <view class="card-left">
        <text class="name">User #{{ item.peerId }}</text>
        <text class="last-msg">{{ item.lastMessage?.type === 'IMAGE' ? '[Image]' : (item.lastMessage?.content || '') }}</text>
      </view>
      <view class="card-right">
        <text class="time">{{ toDisplayTime(item.lastMessage?.createdAt) }}</text>
        <view v-if="item.unreadCount > 0" class="badge">{{ item.unreadCount }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { closeSocket, getSocket, initSocket } from '../../services/socket';
import { getActiveChatPeer, increaseUnread } from '../../utils/chat-state';
import { clearAuth, getCurrentUser } from '../../utils/auth';
import { httpGet } from '../../utils/http';

const currentUser = ref(getCurrentUser());
const adminId = Number(currentUser.value?.id || 0);
const conversations = ref([]);

const conversationList = computed(() => conversations.value || []);

function toDisplayTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function loadConversations() {
  try {
    const data = await httpGet('/messages/conversations?page=1&pageSize=50');
    conversations.value = data.items || [];
  } catch (error) {
    uni.showToast({ title: 'Load failed', icon: 'none' });
  }
}

function goToChat(userId) {
  uni.navigateTo({ url: `/pages/chat/chat?userId=${userId}` });
}

function openMailConfig() {
  uni.navigateTo({ url: '/pages/settings/mail-config' });
}

function logout() {
  closeSocket();
  clearAuth();
  uni.reLaunch({ url: '/pages/login/login' });
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
  uni.showToast({ title: 'Chat error', icon: 'none' });
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
  padding: 24rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #eef3fb 100%);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1e2d46;
}

.header-actions {
  display: flex;
  gap: 8rpx;
}

.btn {
  background: #1a7af8;
  color: #fff;
  border-radius: 20rpx;
}

.danger {
  background: #ea5454;
}

.empty {
  margin-top: 200rpx;
  text-align: center;
  color: #607089;
}

.card {
  margin-bottom: 20rpx;
  padding: 22rpx;
  border-radius: 20rpx;
  background: #fff;
  display: flex;
  justify-content: space-between;
  box-shadow: 0 10rpx 24rpx rgba(24, 58, 109, 0.08);
}

.card-left {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1e2d46;
}

.last-msg {
  max-width: 420rpx;
  font-size: 25rpx;
  color: #63738b;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10rpx;
}

.time {
  font-size: 23rpx;
  color: #8b98ac;
}

.badge {
  min-width: 34rpx;
  height: 34rpx;
  line-height: 34rpx;
  padding: 0 10rpx;
  border-radius: 17rpx;
  text-align: center;
  color: #fff;
  font-size: 22rpx;
  background: #ef4343;
}
</style>
