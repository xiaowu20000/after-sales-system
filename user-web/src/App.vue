<template>
  <main class="page">
    <!-- 登录前：显示注册/登录表单 -->
    <section v-if="!token" class="auth-section">
      <div class="auth-container">
        <div class="auth-header">
          <div class="logo-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h1>After Sales Support</h1>
          <p>Welcome! Please register or login to start chatting with our support team</p>
        </div>
        
        <div class="auth-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'register' }"
            @click="activeTab = 'register'"
          >
            Register
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'login' }"
            @click="activeTab = 'login'"
          >
            Login
          </button>
        </div>

        <div class="auth-card">
          <!-- 注册表单 -->
          <div v-show="activeTab === 'register'" class="auth-form">
            <h2>Create Account</h2>
            <div class="form-group">
              <label>Email Address</label>
              <input 
                v-model.trim="registerForm.email" 
                type="email"
                placeholder="Enter your email" 
                class="form-input"
              />
            </div>
            <button class="code-btn" @click="sendCode" :disabled="!registerForm.email">
              Send Verification Code
            </button>
            <div class="form-group">
              <label>Verification Code</label>
              <input 
                v-model.trim="registerForm.code" 
                placeholder="Enter 6-digit code" 
                class="form-input"
                maxlength="6"
              />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input 
                v-model.trim="registerForm.password" 
                type="password" 
                placeholder="Create a password" 
                class="form-input"
              />
            </div>
            <button class="submit-btn" @click="register">Create Account</button>
          </div>

          <!-- 登录表单 -->
          <div v-show="activeTab === 'login'" class="auth-form">
            <h2>Welcome Back</h2>
            <div class="form-group">
              <label>Email Address</label>
              <input 
                v-model.trim="loginForm.email" 
                type="email"
                placeholder="Enter your email" 
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input 
                v-model.trim="loginForm.password" 
                type="password" 
                placeholder="Enter your password" 
                class="form-input"
              />
            </div>
            <button class="submit-btn" @click="login">Sign In</button>
          </div>

          <p v-if="hint" class="hint" :class="{ error: hint.includes('failed') || hint.includes('error') || hint.includes('Error') }">
            {{ hint }}
          </p>
        </div>
      </div>
    </section>

    <!-- 登录后：显示全屏聊天界面 -->
    <CustomerChatWidget
      v-else-if="token && userId"
      :user-id="userId"
      :admin-id="1"
      :token="token"
      :api-base="apiBase"
      :socket-base="socketBase"
      :user-email="user?.email"
      @logout="logout"
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

const activeTab = ref('register');
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
    hint.value = ''; // 清空之前的提示
    await post('/auth/send-register-code', {
      email: registerForm.value.email.trim(),
    });
    hint.value = 'Verification code sent.';
  } catch (error) {
    // 显示错误信息，对于常见错误提供友好提示
    const errorMsg = error.message || 'Send code failed';
    if (errorMsg.includes('already registered') || errorMsg.includes('Email already registered')) {
      hint.value = 'This email is already registered. Please login instead.';
    } else {
      hint.value = errorMsg;
    }
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
