<template>
  <view class="page">
    <view class="section">
      <view class="section-title">账户设置</view>
      <view class="menu-item" @click="openMailConfig">
        <text class="menu-label">邮箱配置</text>
        <text class="menu-arrow">></text>
      </view>
    </view>

    <view class="section">
      <view class="section-title">内容管理</view>
      <view class="menu-item" @click="importForbiddenWords">
        <text class="menu-label">导入违禁词</text>
        <text class="menu-arrow">></text>
      </view>
      <view class="menu-item" @click="importQuickPhrases">
        <text class="menu-label">导入快捷短语</text>
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
import { onLoad } from '@dcloudio/uni-app';
import { closeSocket } from '../../services/socket.js';
import { clearAuth } from '../../utils/auth';
import { httpPost, httpDelete } from '../../utils/http';

function openMailConfig() {
  uni.navigateTo({ url: '/pages/settings/mail-config' });
}

// 导入违禁词
function importForbiddenWords() {
  // #ifdef APP-PLUS
  plus.io.resolveLocalFileSystemURL('_downloads/', (entry) => {
    entry.getFile('forbidden-words.txt', {}, (fileEntry) => {
      fileEntry.file((file) => {
        const reader = new FileReader();
        reader.onloadend = async (e) => {
          await processForbiddenWords(e.target.result);
        };
        reader.readAsText(file);
      });
    }, () => {
      // 文件不存在，使用选择文件
      chooseFileForForbiddenWords();
    });
  }, () => {
    chooseFileForForbiddenWords();
  });
  // #endif
  
  // #ifdef H5
  chooseFileForForbiddenWords();
  // #endif
}

function chooseFileForForbiddenWords() {
  // H5 端使用 input file
  // #ifdef H5
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      await processForbiddenWords(event.target.result);
    };
    reader.readAsText(file);
  };
  input.click();
  // #endif
  
  // App 端使用 uni.chooseFile（如果支持）
  // #ifdef APP-PLUS
  uni.chooseFile({
    count: 1,
    extension: ['.txt'],
    success: async (res) => {
      try {
        const fileContent = await readFileContent(res.tempFilePaths[0]);
        await processForbiddenWords(fileContent);
      } catch (error) {
        uni.showToast({ title: '读取文件失败', icon: 'none' });
      }
    },
    fail: () => {
      uni.showToast({ title: '选择文件失败', icon: 'none' });
    }
  });
  // #endif
}

async function processForbiddenWords(fileContent) {
  try {
    const words = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (words.length === 0) {
      uni.showToast({ title: '文件为空', icon: 'none' });
      return;
    }

    uni.showLoading({ title: '导入中...' });
    
    // 批量创建违禁词
    let successCount = 0;
    let failCount = 0;
    
    for (const word of words) {
      try {
        await httpPost('/forbidden-words', { word });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    uni.hideLoading();
    uni.showToast({
      title: `成功导入 ${successCount} 条，失败 ${failCount} 条`,
      icon: 'none',
      duration: 2000
    });
  } catch (error) {
    uni.hideLoading();
    uni.showToast({ title: '导入失败', icon: 'none' });
  }
}

// 导入快捷短语
function importQuickPhrases() {
  // #ifdef H5
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.txt';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      await processQuickPhrases(event.target.result);
    };
    reader.readAsText(file);
  };
  input.click();
  // #endif
  
  // #ifdef APP-PLUS
  uni.chooseFile({
    count: 1,
    extension: ['.json', '.txt'],
    success: async (res) => {
      try {
        const fileContent = await readFileContent(res.tempFilePaths[0]);
        await processQuickPhrases(fileContent);
      } catch (error) {
        uni.showToast({ title: '读取文件失败', icon: 'none' });
      }
    },
    fail: () => {
      uni.showToast({ title: '选择文件失败', icon: 'none' });
    }
  });
  // #endif
}

async function processQuickPhrases(fileContent) {
  try {
    let phrases = [];
    try {
      // 尝试解析为 JSON
      phrases = JSON.parse(fileContent);
      if (!Array.isArray(phrases)) {
        throw new Error('Invalid format');
      }
    } catch (error) {
      // 如果不是 JSON，按行解析（格式：标题|内容）
      phrases = fileContent.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          const parts = line.split('|');
          return {
            title: parts[0] || '未命名',
            content: parts[1] || parts[0] || ''
          };
        });
    }

    if (phrases.length === 0) {
      uni.showToast({ title: '文件为空', icon: 'none' });
      return;
    }

    uni.showLoading({ title: '导入中...' });

    // 批量创建快捷短语
    let successCount = 0;
    let failCount = 0;
    
    for (const phrase of phrases) {
      try {
        await httpPost('/quick-phrases', {
          title: phrase.title || '未命名',
          content: phrase.content || ''
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    uni.hideLoading();
    uni.showToast({
      title: `成功导入 ${successCount} 条，失败 ${failCount} 条`,
      icon: 'none',
      duration: 2000
    });
  } catch (error) {
    uni.hideLoading();
    uni.showToast({ title: '导入失败', icon: 'none' });
  }
}

// 读取文件内容
function readFileContent(filePath) {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
      entry.file((file) => {
        const reader = new FileReader();
        reader.onloadend = (e) => {
          resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }, reject);
    // #endif
    
    // #ifdef H5
    // H5 端使用 uni.request 读取文件
    uni.request({
      url: filePath,
      method: 'GET',
      success: (res) => {
        resolve(res.data);
      },
      fail: reject
    });
    // #endif
  });
}

// 清除缓存
function clearCache() {
  uni.showActionSheet({
    itemList: ['清除应用缓存', '清除聊天记录', '清除全部'],
    success: (res) => {
      if (res.tapIndex === 0) {
        // 清除应用缓存（除了认证信息和聊天记录）
        clearAppCache();
      } else if (res.tapIndex === 1) {
        // 清除聊天记录
        clearChatHistory();
      } else if (res.tapIndex === 2) {
        // 清除全部
        clearAllCache();
      }
    }
  });
}

// 清除应用缓存
function clearAppCache() {
  uni.showModal({
    title: '确认清除',
    content: '确定要清除应用缓存吗？',
    success: (res) => {
      if (res.confirm) {
        try {
          const token = uni.getStorageSync('admin_token');
          const user = uni.getStorageSync('admin_user');
          const userRemarks = uni.getStorageSync('user_remarks');
          
          uni.clearStorageSync();
          
          // 恢复认证信息和用户备注
          if (token) {
            uni.setStorageSync('admin_token', token);
          }
          if (user) {
            uni.setStorageSync('admin_user', user);
          }
          if (userRemarks) {
            uni.setStorageSync('user_remarks', userRemarks);
          }
          
          uni.showToast({ title: '缓存已清除', icon: 'success' });
        } catch (error) {
          uni.showToast({ title: '清除失败', icon: 'none' });
        }
      }
    }
  });
}

// 清除聊天记录
function clearChatHistory() {
  uni.showModal({
    title: '确认清除',
    content: '确定要清除所有聊天记录吗？此操作不可恢复！',
    confirmColor: '#fa5151',
    success: (res) => {
      if (res.confirm) {
        try {
          // 清除聊天相关的本地存储
          const keys = uni.getStorageInfoSync().keys;
          keys.forEach(key => {
            if (key.startsWith('chat_') || key.startsWith('message_') || key === 'user_remarks') {
              uni.removeStorageSync(key);
            }
          });
          
          uni.showToast({ title: '聊天记录已清除', icon: 'success' });
        } catch (error) {
          uni.showToast({ title: '清除失败', icon: 'none' });
        }
      }
    }
  });
}

// 清除全部
function clearAllCache() {
  uni.showModal({
    title: '确认清除',
    content: '确定要清除所有缓存和聊天记录吗？此操作不可恢复！',
    confirmColor: '#fa5151',
    success: (res) => {
      if (res.confirm) {
        try {
          const token = uni.getStorageSync('admin_token');
          const user = uni.getStorageSync('admin_user');
          
          uni.clearStorageSync();
          
          // 只恢复认证信息
          if (token) {
            uni.setStorageSync('admin_token', token);
          }
          if (user) {
            uni.setStorageSync('admin_user', user);
          }
          
          uni.showToast({ title: '全部缓存已清除', icon: 'success' });
        } catch (error) {
          uni.showToast({ title: '清除失败', icon: 'none' });
        }
      }
    }
  });
}

// 清理图片
function cleanupImages() {
  uni.showActionSheet({
    itemList: ['3天前', '7天前', '15天前', '30天前'],
    success: async (res) => {
      const mapping = [3, 7, 15, 30];
      const days = mapping[res.tapIndex] || 7;
      
      try {
        const result = await httpDelete(`/upload/cleanup?days=${days}`);
        uni.showToast({
          title: `已删除 ${result.removedFolders || 0} 个文件夹`,
          icon: 'none',
          duration: 2000
        });
      } catch (error) {
        uni.showToast({ title: '清理失败', icon: 'none' });
      }
    }
  });
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        closeSocket();
        clearAuth();
        uni.reLaunch({ url: '/pages/login/login' });
      }
    },
  });
}

onLoad(() => {
  // 页面加载
});
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
