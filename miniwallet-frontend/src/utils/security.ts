/* Giới hạn số lần nhập sai PIN. Hàm thuần: nhận trạng thái + thời điểm, trả về trạng thái mới. */
import type { SecurityState } from '../types';

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MS = 5 * 60 * 1000;

export const INITIAL_SECURITY: SecurityState = { failedPinAttempts: 0, pinLockedUntil: null, frozen: false };

export function isPinLocked(security: SecurityState, now: number): boolean {
  return security.pinLockedUntil !== null && now < security.pinLockedUntil;
}

/** Số phút còn bị khóa, làm tròn lên (để hiển thị). */
export function lockMinutesLeft(security: SecurityState, now: number): number {
  if (!isPinLocked(security, now) || security.pinLockedUntil === null) return 0;
  return Math.ceil((security.pinLockedUntil - now) / 60_000);
}

/** Ghi nhận một lần sai. Đủ số lần thì khóa và đặt lại bộ đếm cho lượt sau khi hết khóa. */
export function registerPinFailure(security: SecurityState, now: number): SecurityState {
  // Khóa cũ đã hết hạn thì tính lại từ đầu
  const base = security.pinLockedUntil !== null && now >= security.pinLockedUntil ? { ...security, failedPinAttempts: 0, pinLockedUntil: null } : security;
  const failed = base.failedPinAttempts + 1;
  if (failed >= PIN_MAX_ATTEMPTS) {
    return { ...base, failedPinAttempts: 0, pinLockedUntil: now + PIN_LOCK_MS };
  }
  return { ...base, failedPinAttempts: failed };
}

export function registerPinSuccess(security: SecurityState): SecurityState {
  return { ...security, failedPinAttempts: 0, pinLockedUntil: null };
}

export function attemptsLeft(security: SecurityState): number {
  return PIN_MAX_ATTEMPTS - security.failedPinAttempts;
}
