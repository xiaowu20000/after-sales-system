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

function openMailConfig() {
  uni.navigateTo({ url: '/pages/settings/mail-config' });
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
