<template>
  <view class="page">
    <view class="card">
      <text class="title">Mail Config</text>
      <input v-model="form.host" class="input" placeholder="SMTP Host" />
      <input v-model="form.port" class="input" placeholder="Port" type="number" />
      <view class="row">
        <text class="label">Secure</text>
        <switch :checked="form.secure" @change="form.secure = !!$event.detail.value" />
      </view>
      <input v-model="form.user" class="input" placeholder="SMTP User" />
      <input v-model="form.pass" class="input" placeholder="SMTP Auth Code" />
      <input v-model="form.fromEmail" class="input" placeholder="From Email" />
      <button class="btn" @click="save">Save</button>
    </view>
  </view>
</template>

<script setup>
import { reactive } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { httpGet, httpPut } from '../../utils/http';

const form = reactive({
  host: '',
  port: 465,
  secure: true,
  user: '',
  pass: '',
  fromEmail: '',
});

async function loadConfig() {
  try {
    const data = await httpGet('/admin/mail-config');
    form.host = data.host || '';
    form.port = Number(data.port || 465);
    form.secure = !!data.secure;
    form.user = data.user || '';
    form.fromEmail = data.fromEmail || '';
  } catch (error) {
    // ignore if not configured
  }
}

async function save() {
  try {
    await httpPut('/admin/mail-config', {
      host: form.host,
      port: Number(form.port),
      secure: !!form.secure,
      user: form.user,
      pass: form.pass,
      fromEmail: form.fromEmail,
    });
    uni.showToast({ title: 'Saved', icon: 'none' });
  } catch (error) {
    uni.showToast({ title: 'Save failed', icon: 'none' });
  }
}

onLoad(() => {
  loadConfig();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #eef3fb;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
}

.title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 20rpx;
}

.input {
  height: 74rpx;
  margin-bottom: 14rpx;
  background: #f2f6fd;
  border-radius: 12rpx;
  padding: 0 14rpx;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.label {
  color: #4f627f;
}

.btn {
  margin-top: 8rpx;
  background: #1f79f6;
  color: #fff;
  border-radius: 12rpx;
}
</style>
