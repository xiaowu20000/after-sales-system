const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

export function setAuth(token, user) {
  uni.setStorageSync(TOKEN_KEY, token || '');
  uni.setStorageSync(USER_KEY, JSON.stringify(user || null));
}

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || '';
}

export function getCurrentUser() {
  try {
    return JSON.parse(uni.getStorageSync(USER_KEY) || 'null');
  } catch (error) {
    return null;
  }
}

export function clearAuth() {
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(USER_KEY);
}
