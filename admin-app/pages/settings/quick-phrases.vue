<template>
  <view class="page">
    <view class="header">
      <text class="title">快捷短语管理</text>
    </view>

    <view class="create-card">
      <input
        v-model.trim="newPhrase.title"
        class="input"
        placeholder="请输入短语标题"
      />
      <textarea
        v-model.trim="newPhrase.content"
        class="textarea"
        placeholder="请输入短语内容"
        maxlength="-1"
      />
      <view class="submit-btn" :class="{ disabled: creating }" @click="createPhrase">
        <text>{{ creating ? '保存中...' : '新增短语' }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="list-container">
      <view v-if="phraseList.length === 0" class="empty">
        <text>暂无快捷短语</text>
      </view>

      <view
        v-for="item in phraseList"
        :key="item.id"
        class="phrase-item"
      >
        <view class="phrase-content">
          <text class="phrase-title">{{ item.title }}</text>
          <text class="phrase-text">{{ item.content }}</text>
        </view>
        <view class="phrase-actions">
          <view class="delete-btn" @click.stop="deletePhrase(item.id)">
            <text>删除</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { httpGet, httpDelete, httpPost } from '../../utils/http';

const phraseList = ref([]);
const creating = ref(false);
const newPhrase = ref({
  title: '',
  content: '',
});

async function loadPhrases() {
  try {
    phraseList.value = await httpGet('/quick-phrases');
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
    phraseList.value = [];
  }
}

async function createPhrase() {
  const title = newPhrase.value.title.trim();
  const content = newPhrase.value.content.trim();
  if (!title || !content) {
    uni.showToast({ title: '标题和内容都不能为空', icon: 'none' });
    return;
  }
  if (creating.value) {
    return;
  }

  creating.value = true;
  try {
    await httpPost('/quick-phrases', { title, content });
    newPhrase.value.title = '';
    newPhrase.value.content = '';
    uni.showToast({ title: '新增成功', icon: 'success' });
    await loadPhrases();
  } catch (error) {
    const errorMsg = error?.message || '新增失败';
    uni.showToast({ title: errorMsg, icon: 'none' });
  } finally {
    creating.value = false;
  }
}

async function deletePhrase(id) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条快捷短语吗？',
    confirmColor: '#fa5151',
    success: async (res) => {
      if (res.confirm) {
        try {
          await httpDelete(`/quick-phrases/${id}`);
          uni.showToast({ title: '删除成功', icon: 'success' });
          await loadPhrases();
        } catch (error) {
          const errorMsg = error?.message || '删除失败';
          uni.showToast({ title: errorMsg, icon: 'none' });
        }
      }
    },
  });
}

onMounted(() => {
  loadPhrases();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #ededed;
}

.header {
  background: #fff;
  padding: 32rpx;
  border-bottom: 1rpx solid #e5e5e5;
}

.create-card {
  margin: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
}

.input {
  height: 72rpx;
  padding: 0 20rpx;
  margin-bottom: 16rpx;
  border-radius: 8rpx;
  background: #f5f5f5;
  font-size: 28rpx;
}

.textarea {
  width: 100%;
  min-height: 180rpx;
  padding: 20rpx;
  box-sizing: border-box;
  border-radius: 8rpx;
  background: #f5f5f5;
  font-size: 28rpx;
  margin-bottom: 16rpx;
}

.submit-btn {
  height: 72rpx;
  border-radius: 8rpx;
  background: #1e88e5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn text {
  color: #fff;
  font-size: 28rpx;
}

.submit-btn.disabled {
  opacity: 0.6;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #191919;
}

.list-container {
  height: calc(100vh - 520rpx);
}

.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.phrase-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
}

.phrase-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.phrase-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #191919;
}

.phrase-text {
  font-size: 28rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phrase-actions {
  margin-left: 24rpx;
}

.delete-btn {
  padding: 12rpx 24rpx;
  background: #fa5151;
  border-radius: 8rpx;
}

.delete-btn text {
  font-size: 28rpx;
  color: #fff;
}
</style>
