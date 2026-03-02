<template>
  <view class="page">
    <view class="section">
      <view class="section-title">账号设置</view>
      <view class="menu-item" @click="openMailConfig">
        <text class="menu-label">邮箱配置</text>
        <text class="menu-arrow">></text>
      </view>
    </view>

    <view class="section">
      <view class="section-title">内容管理</view>
      <view class="menu-item" @click="importForbiddenWords">
        <text class="menu-label">导入违禁词文件</text>
        <text class="menu-arrow">></text>
      </view>
      <view class="menu-item" @click="manageQuickPhrases">
        <text class="menu-label">手动新增快捷短语</text>
        <text class="menu-arrow">></text>
      </view>
      <view class="menu-item" @click="manageQuickPhrases">
        <text class="menu-label">管理快捷短语</text>
        <text class="menu-arrow">></text>
      </view>
    </view>

    <view class="section">
      <view class="section-title">存储管理</view>
      <view class="menu-item" @click="clearCache">
        <text class="menu-label">清除缓存</text>
        <text class="menu-arrow">></text>
      </view>
      <view class="menu-item" @click="cleanupImages">
        <text class="menu-label">清理图片</text>
        <text class="menu-arrow">></text>
      </view>
    </view>

    <view class="section">
      <view class="section-title">其他</view>
      <view class="menu-item danger" @click="handleLogout">
        <text class="menu-label">退出登录</text>
        <text class="menu-arrow">></text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { closeSocket } from '../../services/socket.js';
import { clearAuth } from '../../utils/auth';
import { httpPost, httpDelete } from '../../utils/http';

function openMailConfig() {
  uni.navigateTo({ url: '/pages/settings/mail-config' });
}

function manageQuickPhrases() {
  uni.navigateTo({ url: '/pages/settings/quick-phrases' });
}

function importForbiddenWords() {
  // #ifdef APP-PLUS
  importForbiddenWordsFromAppDownloads();
  // #endif

  // #ifdef H5
  importForbiddenWordsFromH5File();
  // #endif
}

function importForbiddenWordsFromH5File() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt';
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      await processForbiddenWords(String(event.target?.result || ''));
    };
    reader.readAsText(file);
  };
  input.click();
}

function importForbiddenWordsFromAppDownloads() {
  const filePath = '_downloads/forbidden-words.txt';
  plus.io.resolveLocalFileSystemURL(
    filePath,
    (entry) => {
      entry.file((file) => {
        const reader = new FileReader();
        reader.onloadend = async (e) => {
          await processForbiddenWords(String(e.target?.result || ''));
        };
        reader.onerror = () => {
          uni.showToast({ title: '读取文件失败', icon: 'none' });
        };
        reader.readAsText(file);
      });
    },
    () => {
      uni.showModal({
        title: '未找到文件',
        content: '请先把违禁词文件放到手机 Downloads 目录，并命名为 forbidden-words.txt',
        showCancel: false,
      });
    },
  );
}

async function processForbiddenWords(contentRaw) {
  const words = contentRaw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!words.length) {
    uni.showToast({ title: '文件内容为空', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '导入中...' });
  let successCount = 0;
  let failCount = 0;

  for (const word of words) {
    try {
      await httpPost('/forbidden-words', { word });
      successCount += 1;
    } catch (error) {
      failCount += 1;
    }
  }

  uni.hideLoading();
  uni.showToast({
    title: `成功${successCount}条 失败${failCount}条`,
    icon: 'none',
    duration: 2200,
  });
}

function clearCache() {
  uni.showActionSheet({
    itemList: ['清除应用缓存', '清除聊天记录', '清除全部'],
    success: (res) => {
      if (res.tapIndex === 0) {
        clearAppCache();
      } else if (res.tapIndex === 1) {
        clearChatHistory();
      } else if (res.tapIndex === 2) {
        clearAllCache();
      }
    },
  });
}

function clearAppCache() {
  uni.showModal({
    title: '确认清除',
    content: '确定要清除应用缓存吗？',
    success: (res) => {
      if (!res.confirm) return;
      try {
        const token = uni.getStorageSync('admin_token');
        const user = uni.getStorageSync('admin_user');
        const userRemarks = uni.getStorageSync('user_remarks');
        uni.clearStorageSync();

        if (token) uni.setStorageSync('admin_token', token);
        if (user) uni.setStorageSync('admin_user', user);
        if (userRemarks) uni.setStorageSync('user_remarks', userRemarks);

        uni.showToast({ title: '缓存已清除', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: '清除失败', icon: 'none' });
      }
    },
  });
}

function clearChatHistory() {
  uni.showModal({
    title: '确认清除',
    content: '确定要清除所有聊天记录吗？此操作不可恢复。',
    confirmColor: '#fa5151',
    success: (res) => {
      if (!res.confirm) return;
      try {
        const keys = uni.getStorageInfoSync().keys || [];
        keys.forEach((key) => {
          if (key.startsWith('chat_') || key.startsWith('message_') || key === 'user_remarks') {
            uni.removeStorageSync(key);
          }
        });
        uni.showToast({ title: '聊天记录已清除', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: '清除失败', icon: 'none' });
      }
    },
  });
}

function clearAllCache() {
  uni.showModal({
    title: '确认清除',
    content: '确定要清除所有缓存吗？此操作不可恢复。',
    confirmColor: '#fa5151',
    success: (res) => {
      if (!res.confirm) return;
      try {
        const token = uni.getStorageSync('admin_token');
        const user = uni.getStorageSync('admin_user');
        uni.clearStorageSync();

        if (token) uni.setStorageSync('admin_token', token);
        if (user) uni.setStorageSync('admin_user', user);

        uni.showToast({ title: '已清除', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: '清除失败', icon: 'none' });
      }
    },
  });
}

function cleanupImages() {
  uni.showActionSheet({
    itemList: ['3天前', '7天前', '15天前', '30天前'],
    success: async (res) => {
      const mapping = [3, 7, 15, 30];
      const days = mapping[res.tapIndex] || 7;
      try {
        const result = await httpDelete(`/upload/cleanup?days=${days}`);
        uni.showToast({
          title: `已删除 ${result?.removedFolders || 0} 个文件夹`,
          icon: 'none',
          duration: 2000,
        });
      } catch (error) {
        uni.showToast({ title: '清理失败', icon: 'none' });
      }
    },
  });
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (!res.confirm) return;
      closeSocket();
      clearAuth();
      uni.reLaunch({ url: '/pages/login/login' });
    },
  });
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #ededed;
  padding: 24rpx 0;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  padding: 0 32rpx;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
}

.menu-item:active {
  background: #f5f5f5;
}

.menu-item.danger .menu-label {
  color: #fa5151;
}

.menu-label {
  font-size: 32rpx;
  color: #191919;
}

.menu-arrow {
  font-size: 28rpx;
  color: #c7c7c7;
}
</style>
