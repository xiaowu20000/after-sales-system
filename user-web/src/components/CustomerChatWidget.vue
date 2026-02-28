<template>
  <div 
    class="chat-container"
    :class="{ 'drag-over': isDragOver }"
    @dragover.prevent="handleDragOver"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
    @paste="handlePaste"
  >
    <header class="chat-header">
      <div class="header-content">
        <div class="header-info">
          <h2>After-Sales Support</h2>
          <p class="status">
            <span class="status-dot" :class="{ connected: socketRef?.connected }"></span>
            {{ statusText }}
          </p>
        </div>
        <div class="header-actions">
          <span class="user-email">{{ userEmail }}</span>
          <button class="logout-btn" @click="handleLogout">Logout</button>
        </div>
          </div>
        </header>

    <div v-if="isDragOver" class="drag-overlay">
      <div class="drag-overlay-content">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <p>释放以上传图片</p>
      </div>
    </div>

        <div ref="messageContainerRef" class="message-list">
          <div
            v-for="(message, index) in messageList"
            :key="`${message.id || 'local'}-${index}`"
        class="message-row"
            :class="{ mine: Number(message.senderId) === userId }"
          >
            <div class="bubble" :class="{ mine: Number(message.senderId) === userId }">
              <img
                v-if="message.type === 'IMAGE'"
                :src="message.content"
                class="msg-image"
                @click="openLightbox(message.content)"
              />
          <span v-else class="message-text">{{ message.content }}</span>
            </div>
          </div>
      <div v-if="messageList.length === 0" class="empty-state">
        <p>No messages yet. Start the conversation!</p>
      </div>
        </div>

        <p v-if="hintText" class="hint">{{ hintText }}</p>

        <footer class="composer">
      <label class="image-btn" title="Upload image">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
            <input type="file" accept="image/*" class="hidden-file" @change="onSelectImage" />
          </label>
          <input
            v-model.trim="textValue"
            class="text-input"
            type="text"
            placeholder="Type your message..."
            @keyup.enter="sendText"
          />
      <button class="send-btn" @click="sendText" :disabled="!textValue.trim()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
        </footer>

    <transition name="fade">
      <div v-if="lightboxVisible" class="lightbox" @click="closeLightbox">
        <img class="lightbox-image" :src="lightboxUrl" @click.stop />
        <button class="lightbox-close" @click.stop="closeLightbox">×</button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { io } from 'socket.io-client';

const props = defineProps({
  userId: { type: Number, required: true },
  adminId: { type: Number, default: 1 },
  apiBase: { type: String, default: '/api' },
  socketBase: { type: String, default: '/' },
  token: { type: String, default: '' },
  userEmail: { type: String, default: '' },
});

const emit = defineEmits(['logout']);

const textValue = ref('');
const hintText = ref('');
const messageList = ref([]);
const messageContainerRef = ref(null);
const socketRef = ref(null);
const lightboxVisible = ref(false);
const lightboxUrl = ref('');
const isDragOver = ref(false);

const statusText = computed(() => (socketRef.value?.connected ? 'Connected' : 'Connecting...'));

function handleLogout() {
  if (socketRef.value) {
    socketRef.value.disconnect();
    socketRef.value = null;
  }
  emit('logout');
}

async function loadHistory() {
  try {
    const res = await fetch(
      `${props.apiBase}/messages?peerId=${props.adminId}&page=1&pageSize=100`,
      {
        headers: {
          Authorization: props.token ? `Bearer ${props.token}` : '',
        },
      },
    );
    if (!res.ok) return;

    const data = await res.json();
    messageList.value = (data.items || [])
      .slice()
      .reverse()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    scrollToBottom();
  } catch (error) {
    hintText.value = 'Failed to load chat history. Please retry.';
  }
}

function ensureSocket() {
  if (socketRef.value) return;

  const socket = io(props.socketBase, {
    transports: ['websocket'],
    auth: { token: props.token },
  });

  socket.on('new_message', (message) => {
    const s = Number(message.senderId);
    const r = Number(message.receiverId);
    if (
      (s === props.userId && r === props.adminId) ||
      (s === props.adminId && r === props.userId)
    ) {
      messageList.value.push(message);
      scrollToBottom();
    }
  });

  socket.on('message_blocked', (payload) => {
    hintText.value = mapErrorToFriendlyText(payload);
  });

  socket.on('chat_error', (payload) => {
    hintText.value = mapErrorToFriendlyText(payload);
  });

  socketRef.value = socket;
}

function mapErrorToFriendlyText(payload) {
  const code = payload?.code || '';
  if (code === 'FORBIDDEN_WORD') {
    return 'Your message contains forbidden words.';
  }
  if (code === 'BLACKLISTED') {
    return 'Your account is currently blocked from chat.';
  }
  return 'Message could not be sent. Please try again.';
}

function openLightbox(url) {
  if (!url) return;
  lightboxUrl.value = url;
  lightboxVisible.value = true;
}

function closeLightbox() {
  lightboxVisible.value = false;
  lightboxUrl.value = '';
}

function sendText() {
  if (!textValue.value || !socketRef.value) return;

  hintText.value = '';
  socketRef.value.emit('send_message', {
    receiverId: props.adminId,
    content: textValue.value,
    type: 'TEXT',
  });
  textValue.value = '';
}

// 处理图片文件（通用函数）
async function handleImageFile(file) {
  if (!file) return;
  
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    hintText.value = 'Please select an image file';
    return;
  }

  // 检查文件大小（限制为 10MB）
  if (file.size > 10 * 1024 * 1024) {
    hintText.value = 'Image size should be less than 10MB';
    return;
  }

  try {
    hintText.value = '';
    const imageUrl = await uploadImage(file);
    socketRef.value?.emit('send_message', {
      receiverId: props.adminId,
      content: imageUrl,
      type: 'IMAGE',
    });
  } catch (error) {
    hintText.value = 'Image send failed. Please retry.';
  }
}

async function onSelectImage(event) {
  const file = event.target.files?.[0];
  await handleImageFile(file);
    event.target.value = '';
}

// 拖拽处理
function handleDragOver(event) {
  event.preventDefault();
  if (!isDragOver.value) {
    isDragOver.value = true;
  }
}

function handleDragEnter(event) {
  event.preventDefault();
  isDragOver.value = true;
}

function handleDragLeave(event) {
  event.preventDefault();
  // 只有当离开整个容器时才取消拖拽状态
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false;
  }
}

async function handleDrop(event) {
  event.preventDefault();
  isDragOver.value = false;

  const files = Array.from(event.dataTransfer?.files || []);
  const imageFile = files.find(file => file.type.startsWith('image/'));
  
  if (imageFile) {
    await handleImageFile(imageFile);
  } else if (files.length > 0) {
    hintText.value = 'Please drop an image file';
  }
}

// 粘贴处理
async function handlePaste(event) {
  const items = event.clipboardData?.items || [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file) {
        await handleImageFile(file);
      }
      break;
    }
  }
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${props.apiBase}/upload`, {
    method: 'POST',
    headers: {
      Authorization: props.token ? `Bearer ${props.token}` : '',
    },
    body: formData,
  });
  if (!res.ok) {
    const errorBody = await safeJson(res);
    throw new Error(errorBody?.message || 'upload failed');
  }
  const data = await res.json();
  return data.url;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch (error) {
    return null;
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (!messageContainerRef.value) return;
    messageContainerRef.value.scrollTop = messageContainerRef.value.scrollHeight;
  });
}

// 监听消息列表变化，自动滚动到底部
watch(messageList, () => {
  scrollToBottom();
}, { deep: true });

function onKeydown(event) {
  if (event.key === 'Escape') closeLightbox();
}

onBeforeUnmount(() => {
  if (socketRef.value) {
    socketRef.value.disconnect();
    socketRef.value = null;
  }
  window.removeEventListener('keydown', onKeydown);
});

onMounted(() => {
  ensureSocket();
  loadHistory();
  window.addEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
  position: relative;
}

.chat-container.drag-over {
  background: #e3f2fd;
}

.drag-overlay {
  position: absolute;
  inset: 0;
  background: rgba(30, 136, 229, 0.1);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border: 3px dashed #1e88e5;
  border-radius: 12px;
  margin: 8px;
}

.drag-overlay-content {
  text-align: center;
  color: #1e88e5;
}

.drag-overlay-content svg {
  margin-bottom: 16px;
  opacity: 0.8;
}

.drag-overlay-content p {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.chat-header {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: #fff;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.9;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff6b6b;
  display: inline-block;
}

.status-dot.connected {
  background: #51cf66;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-email {
  font-size: 14px;
  opacity: 0.9;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8b95a7;
  font-size: 16px;
}

.message-row {
  display: flex;
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease;
}

.message-row.mine {
  justify-content: flex-end;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bubble {
  max-width: 65%;
  padding: 12px 16px;
  border-radius: 18px;
  line-height: 1.5;
  background: #fff;
  color: #2d3748;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  word-wrap: break-word;
}

.bubble.mine {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.bubble:not(.mine) {
  border-bottom-left-radius: 4px;
}

.message-text {
  font-size: 15px;
  line-height: 1.5;
}

.msg-image {
  max-width: 300px;
  border-radius: 12px;
  display: block;
  cursor: zoom-in;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.hint {
  margin: 0;
  padding: 12px 24px;
  color: #c53030;
  background: #fed7d7;
  border-top: 1px solid #fc8181;
  font-size: 14px;
  text-align: center;
}

.composer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.image-btn {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  color: #4a5568;
  border-radius: 12px;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
}

.image-btn:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
}

.hidden-file {
  position: absolute;
  opacity: 0;
  inset: 0;
  cursor: pointer;
}

.text-input {
  flex: 1;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
  outline: none;
  font-size: 15px;
  transition: border-color 0.2s;
}

.text-input:focus {
  border-color: #1e88e5;
}

.send-btn {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(30, 136, 229, 0.3);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(30, 136, 229, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.lightbox-image {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.lightbox-close {
  position: absolute;
  top: 24px;
  right: 24px;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  backdrop-filter: blur(10px);
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .message-list {
    padding: 16px;
  }

  .composer {
    padding: 12px 16px;
  }

  .bubble {
    max-width: 80%;
  }

  .msg-image {
    max-width: 250px;
  }
}
</style>
