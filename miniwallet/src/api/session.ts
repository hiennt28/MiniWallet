/*
 * Phía "client": giữ token phiên đăng nhập, giống như một HTTP client gắn header Authorization.
 *
 * Ở hệ thống thật nên để token trong cookie httpOnly để JavaScript (và mã XSS) không đọc được.
 * Ứng dụng này không có server nên dùng localStorage.
 */
const TOKEN_KEY = 'miniwallet:token';

let memoryToken: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();

export function getToken(): string | null {
  if (!loaded) {
    loaded = true;
    try {
      memoryToken = localStorage.getItem(TOKEN_KEY);
    } catch {
      /* bị chặn: chỉ dùng bộ nhớ */
    }
  }
  return memoryToken;
}

export function setToken(token: string | null): void {
  memoryToken = token;
  loaded = true;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* bỏ qua */
  }
}

/** Đăng ký nhận thông báo khi phiên hết hạn (giống interceptor bắt lỗi 401). Trả về hàm hủy. */
export function onUnauthorized(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyUnauthorized(): void {
  setToken(null);
  for (const listener of listeners) listener();
}
