<template>
  <view class="page">
    <!-- 鑷畾涔夊鑸爮 -->
    <view class="custom-navbar">
      <view class="navbar-left">
        <view class="navbar-back" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
      </view>
      <view class="navbar-center">
        <text class="navbar-title">{{ getUserDisplayName() }}</text>
      </view>
      <view class="navbar-right">
        <view class="navbar-menu-btn" @click.stop="showActionMenu = !showActionMenu">
          <text class="menu-icon">⋮</text>
        </view>
      </view>
    </view>

    <!-- 鎿嶄綔鑿滃崟 -->
    <view v-if="showActionMenu" class="action-menu-mask" @click="showActionMenu = false">
      <view class="action-menu" @click.stop>
        <view class="action-menu-item" @click="toggleBlacklist">
          <text class="action-menu-text">{{ isBlacklisted ? '移除黑名单' : '加入黑名单' }}</text>
        </view>
        <view class="action-menu-item" @click="handleClearChatHistory">
          <text class="action-menu-text">清空聊天记录</text>
        </view>
        <view class="action-menu-item danger" @click="handleDeleteUser">
          <text class="action-menu-text">删除用户</text>
        </view>
        <view class="action-menu-item" @click="showActionMenu = false">
          <text class="action-menu-text">取消</text>
        </view>
      </view>
    </view>

    <scroll-view 
      scroll-y 
      class="message-list" 
      :scroll-into-view="scrollAnchorId"
      :scroll-with-animation="scrollWithAnimation"
      @scroll="onScroll"
      ref="messageScrollRef"
    >
      <view
        v-for="(item, index) in messageList"
        :key="item.localKey"
        :id="`msg-${index}`"
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
            @load="onMessageImageLoad"
            @click="previewMessageImage(item.content)"
          />
        </view>
      </view>
    </scroll-view>

    <view v-if="showQuickPanel" class="quick-panel">
      <view class="quick-head">
        <text>快捷短语</text>
        <text class="close" @click="showQuickPanel = false">关闭</text>
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
      <view class="input-left">
        <view class="icon-btn" @click="showQuickPanel = !showQuickPanel">
          <text class="icon">📝</text>
        </view>
        <view class="icon-btn" @click="chooseAndSendImage">
          <text class="icon">📷</text>
        </view>
      </view>
      <input 
        v-model="inputValue" 
        class="input" 
        placeholder="输入消息..." 
        :disabled="isBlacklisted"
        @confirm="sendTextMessage"
      />
      <view class="send-btn" :class="{ disabled: !inputValue.trim() || isBlacklisted }" @click="sendTextMessage">
        <text>发送</text>
      </view>
    </view>

    <!-- 鐢ㄦ埛鑿滃崟寮圭獥 -->
    <view v-if="showUserMenuDialog" class="dialog-mask" @click="showUserMenuDialog = false">
      <view class="dialog-content" @click.stop>
        <view class="dialog-title">用户信息</view>
        <view class="dialog-item">
          <text class="dialog-label">备注名称</text>
          <input 
            v-model="editRemark" 
            class="dialog-input" 
            placeholder="输入备注名称" 
            @confirm="saveRemark"
          />
        </view>
        <view class="dialog-item">
          <text class="dialog-label">邮箱</text>
          <text class="dialog-value">{{ userEmail || '未获取' }}</text>
        </view>
        <view class="dialog-buttons">
          <view class="dialog-btn" @click="showUserMenuDialog = false">取消</view>
          <view class="dialog-btn primary" @click="saveRemark">保存</view>
        </view>
        <view class="dialog-danger-zone">
          <view class="dialog-btn danger" @click="handleDeleteUser">删除用户</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { onLoad, onReady, onUnload } from '@dcloudio/uni-app';
import { API_BASE_URL } from '../../config';
import { getSocket, initSocket, sendSocketMessage } from '../../services/socket.js';
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
const messageScrollRef = ref(null);
const scrollAnchorId = ref('');
const scrollWithAnimation = ref(false);
const shouldAutoFollow = ref(true);
const messageViewportHeight = ref(0);
const userEmail = ref('');
const showUserMenuDialog = ref(false);
const editRemark = ref('');
const showActionMenu = ref(false);

// 从本地存储加载用户备注
function loadUserRemark() {
  try {
    const stored = uni.getStorageSync('user_remarks');
    if (stored) {
      const remarks = JSON.parse(stored);
      editRemark.value = remarks[peerId.value] || '';
    }
  } catch (error) {
    editRemark.value = '';
  }
}

// 淇濆瓨鐢ㄦ埛澶囨敞
function saveRemark() {
  try {
    const stored = uni.getStorageSync('user_remarks');
    const remarks = stored ? JSON.parse(stored) : {};
    if (editRemark.value.trim()) {
      remarks[peerId.value] = editRemark.value.trim();
    } else {
      delete remarks[peerId.value];
    }
    uni.setStorageSync('user_remarks', JSON.stringify(remarks));
    showUserMenuDialog.value = false;
    uni.showToast({ title: '保存成功', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: '保存失败', icon: 'none' });
  }
}

// 鑾峰彇鐢ㄦ埛鏄剧ず鍚嶇О
function getUserDisplayName() {
  try {
    const stored = uni.getStorageSync('user_remarks');
    if (stored) {
      const remarks = JSON.parse(stored);
      if (remarks[peerId.value]) {
        return remarks[peerId.value];
      }
    }
  } catch (error) {
    // ignore
  }
  if (userEmail.value) {
    return userEmail.value;
  }
  return `User #${peerId.value}`;
}

// 娓呯┖褰撳墠鐢ㄦ埛鑱婂ぉ璁板綍
async function handleClearChatHistory() {
  showActionMenu.value = false;
  uni.showModal({
    title: '确认清空',
    content: '确定要清空与该用户的所有聊天记录吗？此操作不可恢复。',
    confirmColor: '#fa5151',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        const result = await httpDelete(`/messages/peer/${peerId.value}`);
        messageList.value = [];
        uni.showToast({
          title: `已清空 ${result?.deletedCount ?? 0} 条`,
          icon: 'success',
          duration: 2000,
        });
      } catch (error) {
        uni.showToast({ title: '清空失败', icon: 'none' });
      }
    },
  });
}

// 鍒犻櫎鐢ㄦ埛
async function handleDeleteUser() {
  showActionMenu.value = false;
  uni.showModal({
    title: '确认删除',
    content: '确定要删除该用户吗？此操作不可恢复！',
    confirmColor: '#fa5151',
    success: async (res) => {
      if (res.confirm) {
        try {
          await httpDelete(`/users/${peerId.value}`);
          uni.showToast({ title: '用户已删除', icon: 'success' });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        } catch (error) {
          uni.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    }
  });
}

function showUserMenu() {
  showUserMenuDialog.value = true;
}

function toLocalKey(item, index) {
  return `${item.id || 'temp'}-${index}-${item.createdAt || Date.now()}`;
}

async function appendMessage(message) {
  messageList.value.push({
    ...message,
    localKey: toLocalKey(message, messageList.value.length),
  });
  if (shouldAutoFollow.value) {
    await nextTick();
    await scrollToBottom(true);
  }
}

async function scrollToBottom(animated = false) {
  if (!messageList.value.length) return;
  await nextTick();
  const targetId = `msg-${messageList.value.length - 1}`;
  scrollWithAnimation.value = !!animated;
  scrollAnchorId.value = '';
  await nextTick();
  scrollAnchorId.value = targetId;
}

function onScroll(e) {
  const detail = e?.detail || {};
  const top = Number(detail.scrollTop || 0);
  const total = Number(detail.scrollHeight || 0);
  const viewport = Number(messageViewportHeight.value || 0);

  if (total > 0 && viewport > 0) {
    const distanceToBottom = total - viewport - top;
    shouldAutoFollow.value = distanceToBottom < 80;
    return;
  }

  if (Number(detail.deltaY) < 0) {
    shouldAutoFollow.value = false;
  }
}

function onMessageImageLoad() {
  if (!shouldAutoFollow.value) return;
  scrollToBottom(false);
}

function measureMessageViewport() {
  const query = uni.createSelectorQuery();
  query.select('.message-list').boundingClientRect();
  query.exec((res) => {
    const rect = res?.[0];
    if (rect?.height) {
      messageViewportHeight.value = Number(rect.height);
    }
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
    // 鍚庣鎸?id DESC 鎺掑簭锛宲age=1 灏辨槸鏈€鏂版秷鎭紙鏈€鏂?00鏉★級
    const data = await httpGet(
      `/messages?peerId=${Number(peerId.value)}&page=1&pageSize=100`,
    );


    // 鍚庣杩斿洖鐨勬槸鎸?id DESC锛堟渶鏂扮殑鍦ㄥ墠锛夛紝reverse 鎴愭椂闂存搴忥紙鏃?>鏂帮紝鏈€鏂扮殑鍦ㄦ渶鍚庯級
    const list = (data.items || []).slice().reverse();
    messageList.value = list.map((item, index) => ({
      ...item,
      localKey: toLocalKey(item, index),
    }));

    shouldAutoFollow.value = true;
    await scrollToBottom(false);
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
}

async function loadPeer() {
  try {
    const user = await httpGet(`/users/${peerId.value}`);
    isBlacklisted.value = Boolean(user.isBlacklisted);
    userEmail.value = user.email || '';
    // 璁剧疆瀵艰埅鏍忔爣棰樹负鐢ㄦ埛閭
    uni.setNavigationBarTitle({
      title: getUserDisplayName()
    });
  } catch (error) {
    uni.showToast({ title: '用户不存在', icon: 'none' });
  }
}

function goBack() {
  uni.navigateBack();
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
  if (!text || isBlacklisted.value) return;

  try {
    sendSocketMessage({
      receiverId: Number(peerId.value),
      content: text,
      type: 'TEXT',
    });
    inputValue.value = '';
  } catch (error) {
    uni.showToast({ title: '发送失败', icon: 'none' });
  }
}

function useQuickPhrase(item) {
  inputValue.value = item.content;
  showQuickPanel.value = false;
}

async function toggleBlacklist() {
  showActionMenu.value = false;
  const value = !isBlacklisted.value;
  try {
    await httpPatch(`/users/${peerId.value}`, { isBlacklisted: value });
    isBlacklisted.value = value;
    uni.showToast({ title: value ? '已加入黑名单' : '已移除黑名单', icon: 'none' });
  } catch (error) {
    uni.showToast({ title: '更新失败', icon: 'none' });
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
    uni.showToast({ title: '用户已被拉黑', icon: 'none' });
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
    uni.showToast({ title: '发送图片失败', icon: 'none' });
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
  uni.showToast({ title: '包含敏感词', icon: 'none' });
};

const handleSocketError = (payload) => {
  if (payload?.code === 'BLACKLISTED') {
    uni.showToast({ title: '聊天受限', icon: 'none' });
    return;
  }
  uni.showToast({ title: '发送失败', icon: 'none' });
};

onLoad((options) => {
  if (!adminId) {
    uni.reLaunch({ url: '/pages/login/login' });
    return;
  }
  peerId.value = Number(options?.userId || 0);
  if (!peerId.value) {
    uni.showToast({ title: '缺少用户ID', icon: 'none' });
    return;
  }

  setActiveChatPeer(adminId, peerId.value);
  clearUnread(adminId, peerId.value);
  loadUserRemark();
  loadPeer();
  loadHistory();
  loadQuickPhrases();
  bindSocket();
});

onReady(() => {
  measureMessageViewport();
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
  height: 100vh;
  overflow: hidden;
  background: #ededed;
  display: flex;
  flex-direction: column;
}

/* 鑷畾涔夊鑸爮 */
.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  padding: 0 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
  /* 閫傞厤鐘舵€佹爮楂樺害 */
  padding-top: env(safe-area-inset-top);
  box-sizing: border-box;
}

.navbar-left {
  width: 80rpx;
}

.navbar-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  font-weight: 300;
  color: #191919;
  line-height: 1;
}

.navbar-center {
  flex: 1;
  text-align: center;
  padding: 0 20rpx;
}

.navbar-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #191919;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navbar-right {
  width: 80rpx;
  display: flex;
  justify-content: flex-end;
}

.navbar-menu-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-icon {
  font-size: 40rpx;
  color: #191919;
  line-height: 1;
}

.message-list {
  height: calc(100vh - env(safe-area-inset-top) - 88rpx - 96rpx - env(safe-area-inset-bottom));
  padding: 24rpx 0;
  background: #ededed;
  /* 涓洪《閮ㄥ鑸爮鐣欏嚭绌洪棿锛堢姸鎬佹爮楂樺害 + 瀵艰埅鏍忛珮搴︼級 */
  margin-top: calc(env(safe-area-inset-top) + 88rpx);
  /* 涓哄簳閮ㄨ緭鍏ユ爮鐣欏嚭绌洪棿 */
  padding-bottom: 24rpx;
  box-sizing: border-box;
}

.message-row {
  display: flex;
  margin-bottom: 24rpx;
  padding: 0 32rpx;
}

.message-row.mine {
  justify-content: flex-end;
}

.bubble {
  max-width: 480rpx;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  background: #fff;
  position: relative;
}

.bubble.mine {
  background: #95ec69;
}

.bubble:not(.mine)::before {
  content: '';
  position: absolute;
  left: -16rpx;
  top: 20rpx;
  width: 0;
  height: 0;
  border: 16rpx solid transparent;
  border-right-color: #fff;
}

.bubble.mine::after {
  content: '';
  position: absolute;
  right: -16rpx;
  top: 20rpx;
  width: 0;
  height: 0;
  border: 16rpx solid transparent;
  border-left-color: #95ec69;
}

.text {
  font-size: 30rpx;
  color: #191919;
  line-height: 1.5;
  word-break: break-word;
}

.bubble.mine .text {
  color: #191919;
}

.msg-image {
  max-width: 400rpx;
  border-radius: 8rpx;
}

.quick-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 998;
  height: 400rpx;
  background: #fff;
  border-top: 1rpx solid #e5e5e5;
  padding: 24rpx 32rpx;
  /* 鍦ㄨ緭鍏ユ爮涓婃柟鏄剧ず */
  bottom: calc(96rpx + env(safe-area-inset-bottom));
  /* 閫傞厤搴曢儴瀹夊叏鍖哄煙 */
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.quick-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
  color: #191919;
  font-size: 30rpx;
  font-weight: 600;
}

.close {
  color: #1e88e5;
}

.quick-list {
  max-height: 320rpx;
}

.quick-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.q-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #191919;
}

.q-content {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #999;
}

.input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 32rpx;
  background: #fff;
  border-top: 1rpx solid #e5e5e5;
  /* 閫傞厤搴曢儴瀹夊叏鍖哄煙 */
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}

.input-left {
  display: flex;
  gap: 8rpx;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  background: #f5f5f5;
}

.icon {
  font-size: 36rpx;
}

.input {
  flex: 1;
  height: 64rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.send-btn {
  padding: 0 32rpx;
  height: 64rpx;
  line-height: 64rpx;
  background: #1e88e5;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.send-btn.disabled {
  background: #c7c7c7;
  color: #fff;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
}

.dialog-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #191919;
  margin-bottom: 32rpx;
  text-align: center;
}

.dialog-item {
  margin-bottom: 32rpx;
}

.dialog-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.dialog-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.dialog-value {
  font-size: 28rpx;
  color: #191919;
}

.dialog-buttons {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}

.dialog-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 8rpx;
  background: #f5f5f5;
  color: #191919;
  font-size: 30rpx;
}

.dialog-btn.primary {
  background: #1e88e5;
  color: #fff;
}

.dialog-danger-zone {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid #e5e5e5;
}

.dialog-btn.danger {
  background: #fa5151;
  color: #fff;
}

.menu-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
}

.menu-btn:active {
  background: #f5f5f5;
}

.menu-icon {
  font-size: 40rpx;
  color: #191919;
  font-weight: bold;
  line-height: 1;
}

.action-menu-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2000;
}

.action-menu {
  position: absolute;
  top: 120rpx;
  right: 32rpx;
  width: 320rpx;
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.action-menu-item {
  padding: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  text-align: center;
}

.action-menu-item:active {
  background: #f5f5f5;
}

.action-menu-item:last-child {
  border-bottom: none;
}

.action-menu-item.danger .action-menu-text {
  color: #fa5151;
}

.action-menu-text {
  font-size: 30rpx;
  color: #191919;
}
</style>



