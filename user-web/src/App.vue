<template>
  <main class="page">
    <section class="hero">
      <h1>After Sales User Portal</h1>
      <p>Register/Login with email before using support chat.</p>
    </section>

    <section v-if="!token" class="auth-card">
      <h2>Register</h2>
      <div class="row">
        <input v-model.trim="registerForm.email" placeholder="Email" />
        <button @click="sendCode">Send Code</button>
      </div>
      <div class="row">
        <input v-model.trim="registerForm.code" placeholder="6-digit code" />
        <input v-model.trim="registerForm.password" type="password" placeholder="Password" />
      </div>
      <button class="full" @click="register">Register</button>

      <h2>Login</h2>
      <div class="row">
        <input v-model.trim="loginForm.email" placeholder="Email" />
        <input v-model.trim="loginForm.password" type="password" placeholder="Password" />
      </div>
      <button class="full" @click="login">Login</button>
      <p class="hint">{{ hint }}</p>
    </section>

    <section v-else class="auth-card">
      <p>Logged in as: {{ user?.email }} ({{ user?.role }})</p>
      <button class="full" @click="logout">Logout</button>
    </section>

    <CustomerChatWidget
      v-if="token && userId"
      :user-id="userId"
      :admin-id="1"
      :token="token"
      :api-base="apiBase"
      :socket-base="socketBase"
    />
  </main>
</template>

<script setup>
import { computed, ref } from 'vue';
import CustomerChatWidget from './components/CustomerChatWidget.vue';

const apiBase = import.meta.env.VITE_API_BASE || '/api';
const socketBase = import.meta.env.VITE_SOCKET_BASE || '/';

const TOKEN_KEY = 'user_web_token';
const USER_KEY = 'user_web_user';

const token = ref(localStorage.getItem(TOKEN_KEY) || '');
const user = ref(
  (() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (error) {
      return null;
    }
  })(),
);

const userId = computed(() => Number(user.value?.id || 0));

const registerForm = ref({
  email: '',
  password: '',
  code: '',
});

const loginForm = ref({
  email: '',
  password: '',
});

const hint = ref('');

async function post(url, data) {
  const res = await fetch(`${apiBase}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 处理验证错误（数组格式）或普通错误（字符串格式）
    const errorMsg = Array.isArray(body?.message) 
      ? body.message.join(', ') 
      : (body?.message || 'Request failed');
    throw new Error(errorMsg);
  }
  return body;
}

async function sendCode() {
  if (!registerForm.value.email || !registerForm.value.email.trim()) {
    hint.value = 'Please enter your email address';
    return;
  }
  try {
    await post('/auth/send-register-code', {
      email: registerForm.value.email.trim(),
    });
    hint.value = 'Verification code sent.';
  } catch (error) {
    hint.value = error.message || 'Send code failed';
  }
}

async function register() {
  try {
    const res = await post('/auth/register', {
      email: registerForm.value.email,
      password: registerForm.value.password,
      code: registerForm.value.code,
    });
    saveAuth(res);
    hint.value = 'Register success.';
  } catch (error) {
    hint.value = error.message || 'Register failed';
  }
}

async function login() {
  try {
    const res = await post('/auth/login', {
      email: loginForm.value.email,
      password: loginForm.value.password,
    });
    saveAuth(res);
    hint.value = 'Login success.';
  } catch (error) {
    hint.value = error.message || 'Login failed';
  }
}

function saveAuth(res) {
  token.value = res.token;
  user.value = res.user;
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
}

function logout() {
  token.value = '';
  user.value = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
</script>
