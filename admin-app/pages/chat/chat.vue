<template>
  <view class="page">
    <view class="top-bar">
      <view>
        <text class="user-title">User #{{ peerId }}</text>
        <view class="top-actions">
          <text class="action-link" @click="openCleanupAction">Clean old images</text>
        </view>
      </view>
      <view class="black-switch">
        <text class="black-label">Blacklist</text>
        <switch :checked="isBlacklisted" @change="onToggleBlacklist" color="#ef4343" />
      </view>
    </view>

    <scroll-view scroll-y class="message-list">
      <view
        v-for="item in messageList"
        :key="item.localKey"
        class="message-row"
        :class="{ mine: Number(item.senderId) === adminId }"
      >
        <view class="bubble" :class="{ mine: Number(item.senderId) === adminId }">
          <text v-if="item.type === 'TEXT'" class="text">{{ item.content }}</text>
          <image
            v-else
            class="msg-image"
            :src="item.content"
            mode="widthFix"
            @click="previewMessageImage(item.content)"
          />
        </view>
      </view>
    </scroll-view>

    <view v-if="showQuickPanel" class="quick-panel">
      <view class="quick-head">
        <text>Quick phrase</text>
        <text class="close" @click="showQuickPanel = false">Close</text>
      </view>
      <scroll-view scroll-y class="quick-list">
        <view
          v-for="item in quickPhraseList"
          :key="item.id"
          class="quick-item"
          @click="useQuickPhrase(item)"
        >
          <text class="q-title">{{ item.title }}</text>
          <text class="q-content">{{ item.content }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="input-bar">
      <button size="mini" class="small-btn" @click="showQuickPanel = !showQuickPanel">Phrase</button>
      <button size="mini" class="small-btn" @click="chooseAndSendImage">Image</button>
      <input v-model="inputValue" class="input" placeholder="Type message..." :disabled="isBlacklisted" />
      <button class="send-btn" size="mini" :disabled="isBlacklisted" @click="sendTextMessage">
        Send
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { API_BASE_URL } from '../../config';
import { getSocket, initSocket, sendSocketMessage } from '../../services/socket';
import { clearUnread, setActiveChatPeer } from '../../utils/chat-state';
import { getCurrentUser } from '../../utils/auth';
import { httpDelete, httpGet, httpPatch } from '../../utils/http';
import { getToken } from '../../utils/auth';

const currentUser = getCurrentUser();
const adminId = Number(currentUser?.id || 0);
const peerId = ref(0);
const isBlacklisted = ref(false);
const inputValue = ref('');
const messageList = ref([]);
const quickPhraseList = ref([]);
const showQuickPanel = ref(false);

function toLocalKey(item, index) {
  return `${item.id || 'temp'}-${index}-${item.createdAt || Date.now()}`;
}

function appendMessage(message) {
  messageList.value.push({
    ...message,
    localKey: toLocalKey(message, messageList.value.length),
  });
}

function getAllImageUrls() {
  return messageList.value
    .filter((item) => item.type === 'IMAGE')
    .map((item) => item.content);
}

function previewMessageImage(currentUrl) {
  const urls = getAllImageUrls();
  if (!urls.length) return;
  uni.previewImage({
    current: currentUrl,
    urls,
  });
}

async function loadHistory() {
  try {
    const data = await httpGet(
      `/messages?peerId=${Number(peerId.value)}&page=1&pageSize=100`,
    );
    const list = (data.items || []).slice().reverse();
    messageList.value = list
      .map((item, index) => ({
        ...item,
        localKey: toLocalKey(item, index),
      }));
  } catch (error) {
    uni.showToast({ title: 'Load failed', icon: 'none' });
  }
}

async function loadPeer() {
  try {
    const user = await httpGet(`/users/${peerId.value}`);
    isBlacklisted.value = Boolean(user.isBlacklisted);
  } catch (error) {
    uni.showToast({ title: 'User not found', icon: 'none' });
  }
}

async function loadQuickPhrases() {
  try {
    quickPhraseList.value = await httpGet('/quick-phrases');
  } catch (error) {
    quickPhraseList.value = [];
  }
}

function sendTextMessage() {
  const text = inputValue.value.trim();
  if (!text) return;

  try {
    sendSocketMessage({
      receiverId: Number(peerId.value),
      content: text,
      type: 'TEXT',
    });
    inputValue.value = '';
  } catch (error) {
    uni.showToast({ title: 'Socket offline', icon: 'none' });
  }
}

function useQuickPhrase(item) {
  inputValue.value = item.content;
  showQuickPanel.value = false;
}

async function onToggleBlacklist(event) {
  const value = Boolean(event.detail.value);
  try {
    await httpPatch(`/users/${peerId.value}`, { isBlacklisted: value });
    isBlacklisted.value = value;
    uni.showToast({ title: value ? 'User blacklisted' : 'Blacklist removed', icon: 'none' });
  } catch (error) {
    uni.showToast({ title: 'Update failed', icon: 'none' });
  }
}

function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/upload`,
      filePath,
      name: 'file',
      header: {
        Authorization: getToken() ? `Bearer ${getToken()}` : '',
      },
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`upload failed ${res.statusCode}`));
          return;
        }
        const data = JSON.parse(res.data || '{}');
        resolve(data.url);
      },
      fail: reject,
    });
  });
}

function chooseImageOnce() {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: resolve,
      fail: reject,
    });
  });
}

async function chooseAndSendImage() {
  if (isBlacklisted.value) {
    uni.showToast({ title: 'User is blacklisted', icon: 'none' });
    return;
  }
  try {
    const chooseRes = await chooseImageOnce();
    const filePath = chooseRes.tempFilePaths?.[0];
    if (!filePath) return;

    const imageUrl = await uploadImage(filePath);
    sendSocketMessage({
      receiverId: Number(peerId.value),
      content: imageUrl,
      type: 'IMAGE',
    });
  } catch (error) {
    uni.showToast({ title: 'Image send failed', icon: 'none' });
  }
}

function openCleanupAction() {
  uni.showActionSheet({
    itemList: ['Older than 3 days', 'Older than 7 days', 'Older than 15 days'],
    success: async (res) => {
      const mapping = [3, 7, 15];
      const days = mapping[res.tapIndex] || 7;
      await cleanupOldUploads(days);
    },
  });
}

async function cleanupOldUploads(days) {
  try {
    const result = await httpDelete(`/upload/cleanup?days=${days}`);
    uni.showToast({
      title: `Deleted ${result.removedFolders} folders`,
      icon: 'none',
    });
  } catch (error) {
    uni.showToast({ title: 'Cleanup failed', icon: 'none' });
  }
}

function bindSocket() {
  const socket = initSocket(adminId);
  socket.on('new_message', handleSocketNewMessage);
  socket.on('message_blocked', handleBlockedMessage);
  socket.on('chat_error', handleSocketError);
}

const handleSocketNewMessage = (message) => {
  const s = Number(message.senderId);
  const r = Number(message.receiverId);
  const target = Number(peerId.value);
  if ((s === adminId && r === target) || (s === target && r === adminId)) {
    appendMessage(message);
    clearUnread(adminId, target);
  }
};

const handleBlockedMessage = () => {
  uni.showToast({ title: 'Forbidden word blocked', icon: 'none' });
};

const handleSocketError = (payload) => {
  if (payload?.code === 'BLACKLISTED') {
    uni.showToast({ title: 'Chat restricted', icon: 'none' });
    return;
  }
  uni.showToast({ title: 'Send failed', icon: 'none' });
};

onLoad((options) => {
  if (!adminId) {
    uni.reLaunch({ url: '/pages/login/login' });
    return;
  }
  peerId.value = Number(options?.userId || 0);
  if (!peerId.value) {
    uni.showToast({ title: 'Missing user id', icon: 'none' });
    return;
  }

  setActiveChatPeer(adminId, peerId.value);
  clearUnread(adminId, peerId.value);
  loadPeer();
  loadHistory();
  loadQuickPhrases();
  bindSocket();
});

onUnload(() => {
  setActiveChatPeer(adminId, null);
  const socket = getSocket();
  if (!socket) return;

  socket.off('new_message', handleSocketNewMessage);
  socket.off('message_blocked', handleBlockedMessage);
  socket.off('chat_error', handleSocketError);
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fbff 0%, #edf2fa 100%);
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
}

.user-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #233149;
}

.top-actions {
  margin-top: 6rpx;
}

.action-link {
  font-size: 23rpx;
  color: #1f78f7;
}

.black-switch {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.black-label {
  font-size: 24rpx;
  color: #6b7890;
}

.message-list {
  flex: 1;
  padding: 24rpx;
}

.message-row {
  display: flex;
  margin-bottom: 16rpx;
}

.message-row.mine {
  justify-content: flex-end;
}

.bubble {
  max-width: 520rpx;
  padding: 16rpx 18rpx;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 8rpx 16rpx rgba(20, 41, 74, 0.08);
}

.bubble.mine {
  background: #1f80ff;
}

.text {
  font-size: 28rpx;
  color: #223047;
}

.bubble.mine .text {
  color: #fff;
}

.msg-image {
  width: 320rpx;
  border-radius: 14rpx;
}

.quick-panel {
  height: 320rpx;
  background: #fff;
  border-top-left-radius: 20rpx;
  border-top-right-radius: 20rpx;
  padding: 16rpx 20rpx;
}

.quick-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14rpx;
  color: #243149;
  font-size: 28rpx;
}

.close {
  color: #1b7af8;
}

.quick-list {
  max-height: 250rpx;
}

.quick-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e8edf5;
}

.q-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #28344b;
}

.q-content {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #65758e;
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx;
  background: #fff;
  border-top: 1rpx solid #e7edf8;
}

.small-btn {
  background: #eef4ff;
  color: #1d6ddd;
  border-radius: 14rpx;
}

.input {
  flex: 1;
  height: 72rpx;
  padding: 0 16rpx;
  background: #f1f5fc;
  border-radius: 14rpx;
  font-size: 26rpx;
}

.send-btn {
  background: #1e7af8;
  color: #fff;
  border-radius: 14rpx;
}
</style>
