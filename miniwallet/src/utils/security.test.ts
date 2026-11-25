import { describe, expect, it } from 'vitest';
import { INITIAL_SECURITY, isPinLocked, lockMinutesLeft, PIN_LOCK_MS, PIN_MAX_ATTEMPTS, registerPinFailure, registerPinSuccess } from './security';

const now = 1_000_000;

describe('giới hạn nhập sai PIN', () => {
  it(`khóa sau ${PIN_MAX_ATTEMPTS} lần sai liên tiếp`, () => {
    let s = INITIAL_SECURITY;
    for (let i = 1; i < PIN_MAX_ATTEMPTS; i += 1) s = registerPinFailure(s, now);
    expect(isPinLocked(s, now)).toBe(false);
    expect(s.failedPinAttempts).toBe(PIN_MAX_ATTEMPTS - 1);

    s = registerPinFailure(s, now);
    expect(isPinLocked(s, now)).toBe(true);
    expect(lockMinutesLeft(s, now)).toBe(PIN_LOCK_MS / 60_000);
    expect(isPinLocked(s, now + PIN_LOCK_MS)).toBe(false);
  });

  it('nhập đúng thì đặt lại bộ đếm', () => {
    const s = registerPinSuccess(registerPinFailure(INITIAL_SECURITY, now));
    expect(s.failedPinAttempts).toBe(0);
  });

  it('hết thời gian khóa thì đếm lại từ đầu', () => {
    let s = INITIAL_SECURITY;
    for (let i = 0; i < PIN_MAX_ATTEMPTS; i += 1) s = registerPinFailure(s, now);
    s = registerPinFailure(s, now + PIN_LOCK_MS);
    expect(isPinLocked(s, now + PIN_LOCK_MS)).toBe(false);
    expect(s.failedPinAttempts).toBe(1);
  });

  it('không đụng tới trạng thái khóa ví', () => {
    const s = registerPinFailure({ ...INITIAL_SECURITY, frozen: true }, now);
    expect(s.frozen).toBe(true);
  });
});
