<template>
  <div class="chat-widget">
    <button class="float-btn" @click="togglePanel">
      {{ panelOpen ? 'Close' : 'Support' }}
    </button>

    <transition name="panel">
      <section v-if="panelOpen" class="panel">
        <header class="panel-header">
          <div>
            <strong>After-Sales Support</strong>
            <p class="status">{{ statusText }}</p>
          </div>
        </header>

        <div ref="messageContainerRef" class="message-list">
          <div
            v-for="(message, index) in messageList"
            :key="`${message.id || 'local'}-${index}`"
            class="row"
            :class="{ mine: Number(message.senderId) === userId }"
          >
            <div class="bubble" :class="{ mine: Number(message.senderId) === userId }">
              <img
                v-if="message.type === 'IMAGE'"
                :src="message.content"
                class="msg-image"
                @click="openLightbox(message.content)"
              />
              <span v-else>{{ message.content }}</span>
            </div>
          </div>
        </div>

        <p v-if="hintText" class="hint">{{ hintText }}</p>

        <footer class="composer">
          <label class="image-btn">
            Image
            <input type="file" accept="image/*" class="hidden-file" @change="onSelectImage" />
          </label>
          <input
            v-model.trim="textValue"
            class="text-input"
            type="text"
            placeholder="Type your message..."
            @keyup.enter="sendText"
          />
          <button class="send-btn" @click="sendText">Send</button>
        </footer>
      </section>
    </transition>

    <transition name="fade">
      <div v-if="lightboxVisible" class="lightbox" @click="closeLightbox">
        <img class="lightbox-image" :src="lightboxUrl" @click.stop />
        <button class="lightbox-close" @click.stop="closeLightbox">x</button>
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
});

const panelOpen = ref(false);
const textValue = ref('');
const hintText = ref('');
const messageList = ref([]);
const messageContainerRef = ref(null);
const socketRef = ref(null);
const lightboxVisible = ref(false);
const lightboxUrl = ref('');

const statusText = computed(() => (socketRef.value?.connected ? 'Connected' : 'Connecting...'));

function togglePanel() {
  panelOpen.value = !panelOpen.value;
  if (panelOpen.value) {
    ensureSocket();
    loadHistory();
  }
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

async function onSelectImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;

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
  } finally {
    event.target.value = '';
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

watch(panelOpen, (value) => {
  if (value) scrollToBottom();
});

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
  window.addEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.chat-widget {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 999;
}

.float-btn {
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #1b77ff, #0f62df);
  color: #fff;
  font-size: 14px;
  padding: 12px 18px;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(14, 79, 182, 0.34);
}

.panel {
  width: 360px;
  height: 560px;
  margin-bottom: 14px;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 44px rgba(17, 40, 72, 0.2);
}

.panel-header {
  padding: 14px 16px;
  background: linear-gradient(135deg, #1663d5, #1f89ff);
  color: #fff;
}

.panel-header p {
  margin: 5px 0 0;
}

.status {
  font-size: 12px;
  opacity: 0.9;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  background: #f5f8fd;
  padding: 14px;
}

.row {
  display: flex;
  margin-bottom: 10px;
}

.row.mine {
  justify-content: flex-end;
}

.bubble {
  max-width: 72%;
  padding: 10px 12px;
  border-radius: 12px;
  line-height: 1.45;
  background: #fff;
  color: #203247;
  box-shadow: 0 3px 10px rgba(17, 41, 74, 0.08);
}

.bubble.mine {
  background: #1878ff;
  color: #fff;
}

.msg-image {
  max-width: 220px;
  border-radius: 8px;
  display: block;
  cursor: zoom-in;
}

.hint {
  margin: 0;
  padding: 8px 14px;
  color: #be3b3b;
  background: #fff4f4;
  border-top: 1px solid #ffe2e2;
  font-size: 13px;
}

.composer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid #e4ebf5;
  background: #fff;
}

.image-btn,
.send-btn {
  border: none;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  cursor: pointer;
}

.image-btn {
  background: #e8f0ff;
  color: #1b61c4;
  position: relative;
}

.hidden-file {
  position: absolute;
  opacity: 0;
  inset: 0;
  cursor: pointer;
}

.text-input {
  flex: 1;
  border: 1px solid #d8e2f2;
  border-radius: 10px;
  padding: 9px 10px;
  outline: none;
}

.send-btn {
  background: #1878ff;
  color: #fff;
}

.panel-enter-active,
.panel-leave-active {
  transition: all 0.2s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
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
  background: rgba(8, 15, 28, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.lightbox-image {
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 12px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45);
}

.lightbox-close {
  position: absolute;
  top: 18px;
  right: 18px;
  border: none;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}

@media (max-width: 540px) {
  .chat-widget {
    right: 12px;
    left: 12px;
    bottom: 12px;
  }

  .panel {
    width: 100%;
    height: 72vh;
  }
}
</style>
