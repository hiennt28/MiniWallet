/*
 * Các hàm dùng chung của "server" giả lập: độ trễ mạng, xác thực phiên đăng nhập, kiểm tra PIN.
 */
import { getDb, saveAccount, setDb } from './db';
import { ApiError } from './errors';
import { getToken, notifyUnauthorized } from './session';
import { verifyPin } from '../utils/crypto';
import { attemptsLeft, isPinLocked, lockMinutesLeft, PIN_LOCK_MS, registerPinFailure, registerPinSuccess } from '../utils/security';
import type { Account } from '../types';

/** Phiên đăng nhập hết hạn sau 30 phút không thao tác. */
export const SESSION_TTL_MS = 30 * 60 * 1000;

const IS_TEST = import.meta.env?.MODE === 'test';

export function delay(min = 300, max = 700): Promise<void> {
  if (IS_TEST) return Promise.resolve();
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const randomId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function unauthorized(): never {
  notifyUnauthorized();
  throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'UNAUTHORIZED');
}

/** Tìm tài khoản theo token hiện tại và gia hạn phiên. Không hợp lệ thì báo UNAUTHORIZED. */
export function requireAccount(): Account {
  const token = getToken();
  if (!token) unauthorized();

  const db = getDb();
  const session = db.sessions[token];
  const account = session ? db.accounts[session.phone] : undefined;
  const now = Date.now();

  if (!session || !account || session.expiresAt <= now) {
    if (session) {
      const { [token]: _expired, ...rest } = db.sessions;
      setDb({ ...db, sessions: rest });
    }
    unauthorized();
  }

  setDb({ ...db, sessions: { ...db.sessions, [token]: { ...session, expiresAt: now + SESSION_TTL_MS } } });
  return account;
}

/**
 * Kiểm tra PIN của một tài khoản, ghi nhận đúng/sai và khóa tạm khi sai quá số lần.
 * Trả về tài khoản mới nhất (đã đặt lại bộ đếm) nếu đúng.
 */
export async function checkPin(phone: string, pin: string, { wrongMessage = 'Mã PIN không đúng.' } = {}): Promise<Account> {
  const before = getDb().accounts[phone];
  if (!before) throw new ApiError('Không tìm thấy tài khoản.', 'NOT_FOUND');

  if (isPinLocked(before.security, Date.now())) {
    throw new ApiError(
      `Bạn đã nhập sai PIN quá nhiều lần. Vui lòng thử lại sau ${lockMinutesLeft(before.security, Date.now())} phút.`,
      'PIN_LOCKED',
    );
  }

  const ok = await verifyPin(pin, before.pin);
  // Đọc lại sau await: trong lúc băm có thể có thao tác khác đã sửa tài khoản
  const account = getDb().accounts[phone] ?? before;

  if (ok) {
    const next = { ...account, security: registerPinSuccess(account.security) };
    saveAccount(next);
    return next;
  }

  const security = registerPinFailure(account.security, Date.now());
  saveAccount({ ...account, security });
  if (isPinLocked(security, Date.now())) {
    throw new ApiError(`Bạn đã nhập sai PIN quá nhiều lần. Tài khoản tạm khóa ${PIN_LOCK_MS / 60_000} phút.`, 'PIN_LOCKED');
  }
  throw new ApiError(`${wrongMessage} Bạn còn ${attemptsLeft(security)} lần thử.`, 'PIN_INVALID');
}
