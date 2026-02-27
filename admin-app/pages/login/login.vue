<template>
  <view class="page">
    <view class="card">
      <text class="title">Admin Login</text>
      <input v-model="email" class="input" placeholder="Email" />
      <input v-model="password" class="input" placeholder="Password" password />
      <button class="btn" @click="submit">Login</button>
      <text class="hint">Default admin: admin@example.com / Admin123456</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { setAuth } from '../../utils/auth';
import { httpPost } from '../../utils/http';

const email = ref('admin@example.com');
const password = ref('Admin123456');

async function submit() {
  try {
    const res = await httpPost('/auth/login', {
      email: email.value.trim(),
      password: password.value,
    });
    if (res.user?.role !== 'ADMIN') {
      uni.showToast({ title: 'Admin only', icon: 'none' });
      return;
    }
    setAuth(res.token, res.user);
    uni.reLaunch({ url: '/pages/index/index' });
  } catch (error) {
    uni.showToast({ title: 'Login failed', icon: 'none' });
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #eef4ff 0%, #e5ecf8 100%);
}

.card {
  width: 620rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 34rpx;
  box-shadow: 0 12rpx 28rpx rgba(23, 48, 91, 0.14);
}

.title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  margin-bottom: 24rpx;
  color: #203149;
}

.input {
  height: 76rpx;
  margin-bottom: 16rpx;
  border-radius: 14rpx;
  padding: 0 16rpx;
  background: #f2f6fd;
}

.btn {
  background: #1b79f8;
  color: #fff;
  border-radius: 14rpx;
}

.hint {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #74839a;
}
</style>
