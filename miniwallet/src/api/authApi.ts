/*
 * API xác thực giả lập: đăng ký, đăng nhập bằng số điện thoại + mã PIN, đăng xuất,
 * khôi phục phiên khi tải lại trang và khóa ví khẩn cấp.
 */
import { DEMO_PIN_CREDENTIALS } from '../data/seed';
import { createPinCredentials, hashPin, randomHex } from '../utils/crypto';
import { digitsOnly } from '../utils/format';
import { INITIAL_SECURITY } from '../utils/security';
import { isValidPhone, isValidPin, validateRegistration } from '../utils/validators';
import { getDb, saveAccount, setDb } from './db';
import { ApiError } from './errors';
import { checkPin, delay, randomId, requireAccount, SESSION_TTL_MS } from './server';
import { getToken, setToken } from './session';
import type { Account, LoginInput, Profile, RegisterInput } from '../types';

/** Tặng cho tài khoản mới để dùng thử ngay. */
export const WELCOME_BONUS = 500_000;

const WRONG_CREDENTIALS = 'Số điện thoại hoặc mã PIN không đúng.';

function startSession(phone: string): void {
  const token = randomHex(24);
  const db = getDb();
  setDb({ ...db, sessions: { ...db.sessions, [token]: { phone, expiresAt: Date.now() + SESSION_TTL_MS } } });
  setToken(token);
}

export async function register({ name, phone, pin }: RegisterInput): Promise<Profile> {
  await delay();
  const cleanPhone = digitsOnly(phone);
  const errors = validateRegistration({ name, phone: cleanPhone, pin });
  const firstError = Object.values(errors)[0];
  if (firstError) throw new ApiError(firstError, 'VALIDATION');
  if (getDb().accounts[cleanPhone]) {
    throw new ApiError('Số điện thoại này đã được đăng ký. Vui lòng đăng nhập.', 'PHONE_TAKEN');
  }

  const now = new Date().toISOString();
  const account: Account = {
    profile: { name: name.trim().replace(/\s+/g, ' '), phone: cleanPhone },
    pin: await createPinCredentials(pin),
    security: { ...INITIAL_SECURITY },
    balance: WELCOME_BONUS,
    contacts: [],
    linkedBanks: [],
    transactions: [
      {
        id: randomId('tx'),
        type: 'income',
        category: 'bonus',
        title: 'Quà chào mừng thành viên mới',
        amount: WELCOME_BONUS,
        note: 'Cảm ơn bạn đã đăng ký MiniWallet',
        status: 'success',
        createdAt: now,
      },
    ],
    createdAt: now,
  };

  saveAccount(account);
  startSession(cleanPhone);
  return account.profile;
}

export async function login({ phone, pin }: LoginInput): Promise<Profile> {
  await delay();
  const cleanPhone = digitsOnly(phone);
  if (!isValidPhone(cleanPhone) || !isValidPin(pin)) throw new ApiError(WRONG_CREDENTIALS, 'INVALID_CREDENTIALS');

  if (!getDb().accounts[cleanPhone]) {
    // Vẫn băm một lần để thời gian phản hồi giống khi số điện thoại tồn tại
    await hashPin(pin, DEMO_PIN_CREDENTIALS.salt);
    throw new ApiError(WRONG_CREDENTIALS, 'INVALID_CREDENTIALS');
  }

  const account = await checkPin(cleanPhone, pin, { wrongMessage: WRONG_CREDENTIALS });
  startSession(cleanPhone);
  return account.profile;
}

export async function logout(): Promise<void> {
  await delay(100, 200);
  const token = getToken();
  if (token) {
    const db = getDb();
    const { [token]: _removed, ...sessions } = db.sessions;
    setDb({ ...db, sessions });
  }
  setToken(null);
}

/** Khi tải lại trang: còn phiên hợp lệ thì trả về hồ sơ, không thì null. */
export async function restoreSession(): Promise<Profile | null> {
  await delay(100, 250);
  if (!getToken()) return null;
  try {
    return requireAccount().profile;
  } catch (error) {
    if (error instanceof ApiError && error.code === 'UNAUTHORIZED') return null;
    throw error;
  }
}

/** Khóa ví khẩn cấp: không cần PIN để khóa nhanh nhất có thể (ví dụ khi mất điện thoại). */
export async function freezeWallet(): Promise<void> {
  await delay();
  const account = requireAccount();
  saveAccount({ ...account, security: { ...account.security, frozen: true } });
}

/** Mở khóa ví bắt buộc nhập đúng PIN. */
export async function unfreezeWallet(pin: string): Promise<void> {
  await delay();
  const { profile } = requireAccount();
  const account = await checkPin(profile.phone, pin);
  saveAccount({ ...account, security: { ...account.security, frozen: false } });
}
