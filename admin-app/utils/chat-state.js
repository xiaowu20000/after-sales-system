const UNREAD_KEY_PREFIX = 'admin_unread_';
const ACTIVE_CHAT_KEY_PREFIX = 'admin_active_chat_';

function getUnreadKey(adminId) {
  return `${UNREAD_KEY_PREFIX}${adminId}`;
}

function getActiveChatKey(adminId) {
  return `${ACTIVE_CHAT_KEY_PREFIX}${adminId}`;
}

export function getUnreadMap(adminId) {
  try {
    return JSON.parse(uni.getStorageSync(getUnreadKey(adminId)) || '{}');
  } catch (error) {
    return {};
  }
}

export function setUnreadMap(adminId, map) {
  uni.setStorageSync(getUnreadKey(adminId), JSON.stringify(map));
}

export function increaseUnread(adminId, peerId) {
  const map = getUnreadMap(adminId);
  const key = String(peerId);
  map[key] = (Number(map[key]) || 0) + 1;
  setUnreadMap(adminId, map);
  return map;
}

export function clearUnread(adminId, peerId) {
  const map = getUnreadMap(adminId);
  map[String(peerId)] = 0;
  setUnreadMap(adminId, map);
  return map;
}

export function setActiveChatPeer(adminId, peerId) {
  if (!peerId) {
    uni.removeStorageSync(getActiveChatKey(adminId));
    return;
  }
  uni.setStorageSync(getActiveChatKey(adminId), String(peerId));
}

export function getActiveChatPeer(adminId) {
  const value = uni.getStorageSync(getActiveChatKey(adminId));
  return value ? Number(value) : null;
}
