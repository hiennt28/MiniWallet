import { beforeEach, describe, expect, it } from 'vitest';
import { login, logout, register, restoreSession, WELCOME_BONUS } from './authApi';
import { getDb, migrateV1 } from './db';
import { onUnauthorized, setToken } from './session';
import { getTransactions, getWallet, resetData } from './walletApi';
import { DEMO_PIN, DEMO_PIN_CREDENTIALS, PROFILE } from '../data/seed';
import { verifyPin } from '../utils/crypto';

const NEW_USER = { name: '  Trần   Văn Mới ', phone: '0377777777', pin: '135790' };

describe('authApi', () => {
  beforeEach(async () => {
    await resetData();
  });

  it('mã băm PIN của tài khoản demo khớp với DEMO_PIN', async () => {
    expect(await verifyPin(DEMO_PIN, DEMO_PIN_CREDENTIALS)).toBe(true);
  });

  it('đăng ký: tạo tài khoản, tặng tiền chào mừng và đăng nhập luôn', async () => {
    const profile = await register(NEW_USER);
    expect(profile).toEqual({ name: 'Trần Văn Mới', phone: NEW_USER.phone });

    const wallet = await getWallet();
    expect(wallet.balance).toBe(WELCOME_BONUS);
    const { items } = await getTransactions();
    expect(items).toHaveLength(1);
    expect(items[0]?.category).toBe('bonus');
  });

  it('không lưu PIN dạng chữ thường', async () => {
    await register(NEW_USER);
    const account = getDb().accounts[NEW_USER.phone];
    expect(JSON.stringify(account)).not.toContain(NEW_USER.pin);
    expect(account?.pin.hash).toMatch(/^[0-9a-f]{64}$/);
    // Cùng PIN nhưng salt khác thì mã băm khác
    expect(account?.pin.salt).not.toBe(DEMO_PIN_CREDENTIALS.salt);
  });

  it('không cho đăng ký trùng số điện thoại hoặc dùng PIN dễ đoán', async () => {
    await expect(register({ ...NEW_USER, phone: PROFILE.phone })).rejects.toMatchObject({ code: 'PHONE_TAKEN' });
    await expect(register({ ...NEW_USER, pin: '123456' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('đăng nhập sai: cùng một thông báo cho số không tồn tại và sai PIN', async () => {
    const unknown = await login({ phone: '0388888888', pin: DEMO_PIN }).catch((e: unknown) => e);
    expect(unknown).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    const { message } = unknown as Error;

    await expect(login({ phone: PROFILE.phone, pin: '000000' })).rejects.toMatchObject({
      code: 'PIN_INVALID',
      message: expect.stringContaining(message),
    });
  });

  it('đăng xuất thì hủy phiên phía server', async () => {
    await login({ phone: PROFILE.phone, pin: DEMO_PIN });
    expect(await restoreSession()).toEqual(PROFILE);
    await logout();
    expect(await restoreSession()).toBeNull();
    await expect(getWallet()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('token không hợp lệ thì báo cho các nơi đang lắng nghe (như interceptor 401)', async () => {
    let notified = 0;
    const unsubscribe = onUnauthorized(() => {
      notified += 1;
    });
    setToken('token-gia-mao');
    await expect(getWallet()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    unsubscribe();
    expect(notified).toBe(1);
  });
});

describe('migrateV1', () => {
  it('chuyển dữ liệu một người dùng cũ vào tài khoản có PIN demo, giữ nguyên số dư và giao dịch', () => {
    const legacy = { balance: 123_000, profile: { ...PROFILE }, contacts: [], transactions: [] };
    const db = migrateV1(legacy);
    expect(db.version).toBe(2);
    expect(db.accounts[PROFILE.phone]).toMatchObject({ balance: 123_000, pin: DEMO_PIN_CREDENTIALS, security: { frozen: false } });
    expect(db.sessions).toEqual({});
  });
});
