import { API_BASE_URL } from '../config';
import { clearAuth, getToken } from './auth';

function request(method, url, data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        Authorization: getToken() ? `Bearer ${getToken()}` : '',
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        if (res.statusCode === 401) {
          clearAuth();
        }
        reject(res.data || { message: `HTTP ${res.statusCode}` });
      },
      fail: reject,
    });
  });
}

export function httpGet(url) {
  return request('GET', url);
}

export function httpPost(url, data) {
  return request('POST', url, data);
}

export function httpPatch(url, data) {
  return request('PATCH', url, data);
}

export function httpDelete(url, data) {
  return request('DELETE', url, data);
}

export function httpPut(url, data) {
  return request('PUT', url, data);
}
