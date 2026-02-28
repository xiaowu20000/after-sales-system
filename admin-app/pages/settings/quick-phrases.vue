<template>
  <view class="page">
    <view class="header">
      <text class="title">快捷短语管理</text>
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
import { httpGet, httpDelete } from '../../utils/http';

const phraseList = ref([]);

async function loadPhrases() {
  try {
    phraseList.value = await httpGet('/quick-phrases');
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
    phraseList.value = [];
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
    }
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

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #191919;
}

.list-container {
  height: calc(100vh - 120rpx);
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
