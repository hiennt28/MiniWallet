import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freezeWallet, login, logout, register, unfreezeWallet } from './authApi';
import { getDb } from './db';
import { SESSION_TTL_MS } from './server';
import {
  ApiError,
  confirmTransfer,
  createTransfer,
  FAILING_PHONE,
  getTransactions,
  getWallet,
  resetData,
  toApiError,
} from './walletApi';
import { DEMO_PIN, PROFILE } from '../data/seed';
import { PIN_LOCK_MS, PIN_MAX_ATTEMPTS } from '../utils/security';
import type { CreateTransferResult, OtpTicket } from '../types';

const WRONG_PIN = '000000';
const BINH = '0987654321';

const loginDemo = () => login({ phone: PROFILE.phone, pin: DEMO_PIN });

function expectOtp(result: CreateTransferResult): OtpTicket {
  if (result.status !== 'otp_required') throw new Error('Giao dịch này phải yêu cầu OTP');
  return result.ticket;
}

describe('toApiError', () => {
  it('giữ nguyên ApiError, bọc các lỗi khác thành mã UNKNOWN', () => {
    const original = new ApiError('x', 'NOT_FOUND');
    expect(toApiError(original)).toBe(original);
    expect(toApiError(new Error('mất mạng'))).toMatchObject({ code: 'UNKNOWN', message: 'mất mạng' });
    expect(toApiError('chuỗi lạ')).toMatchObject({ code: 'UNKNOWN', message: 'Đã có lỗi xảy ra.' });
  });
});

describe('walletApi – chuyển tiền', () => {
  beforeEach(async () => {
    await resetData();
    await loginDemo();
  });

  it('số tiền nhỏ: đúng PIN là chuyển luôn, trừ số dư và ghi giao dịch lên đầu', async () => {
    const before = await getWallet();
    const result = await createTransfer({ phone: BINH, amount: 100_000, note: 'Test', pin: DEMO_PIN });
    if (result.status !== 'completed') throw new Error('Phải hoàn tất ngay');

    expect((await getWallet()).balance).toBe(before.balance - 100_000);
    expect(result.tx.title).toBe('Chuyển tiền đến Trần Thị Bình');
    const { items } = await getTransactions({ page: 1, pageSize: 1 });
    expect(items[0]?.id).toBe(result.tx.id);
  });

  it('sai PIN thì không trừ tiền và báo số lần thử còn lại', async () => {
    const before = await getWallet();
    await expect(createTransfer({ phone: BINH, amount: 50_000, pin: WRONG_PIN })).rejects.toMatchObject({
      code: 'PIN_INVALID',
      message: expect.stringContaining(`còn ${PIN_MAX_ATTEMPTS - 1} lần`),
    });
    expect((await getWallet()).balance).toBe(before.balance);
  });

  it('kiểm tra dữ liệu trước PIN: nhập sai số tiền không làm mất lượt thử PIN', async () => {
    const { balance } = await getWallet();
    await expect(createTransfer({ phone: BINH, amount: balance + 1, pin: WRONG_PIN })).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(getDb().accounts[PROFILE.phone]?.security.failedPinAttempts).toBe(0);
  });

  it('giả lập lỗi máy chủ với số điện thoại đặc biệt', async () => {
    await expect(createTransfer({ phone: FAILING_PHONE, amount: 50_000, pin: DEMO_PIN })).rejects.toMatchObject({ code: 'SERVER_ERROR' });
  });

  it('số tiền lớn cần thêm OTP; sai OTP 3 lần thì hủy và không trừ tiền', async () => {
    const before = await getWallet();
    const { transferId, otp } = expectOtp(await createTransfer({ phone: BINH, amount: 5_000_000, pin: DEMO_PIN }));
    const wrong = otp === '000000' ? '111111' : '000000';

    await expect(confirmTransfer(transferId, wrong)).rejects.toMatchObject({ code: 'OTP_INVALID' });
    await expect(confirmTransfer(transferId, wrong)).rejects.toMatchObject({ code: 'OTP_INVALID' });
    await expect(confirmTransfer(transferId, wrong)).rejects.toMatchObject({ code: 'OTP_LOCKED' });
    // Đã bị hủy: nhập đúng mã cũng không được
    await expect(confirmTransfer(transferId, otp)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await getWallet()).balance).toBe(before.balance);
  });

  it('số tiền lớn: đúng OTP thì chuyển thành công', async () => {
    const before = await getWallet();
    const { transferId, otp } = expectOtp(await createTransfer({ phone: BINH, amount: 5_000_000, pin: DEMO_PIN }));
    await confirmTransfer(transferId, otp);
    expect((await getWallet()).balance).toBe(before.balance - 5_000_000);
  });

  it('người nhận có tài khoản MiniWallet thì được cộng tiền', async () => {
    await register({ name: 'Người Nhận', phone: '0355555555', pin: '135790' });
    const receiverStart = (await getWallet()).balance;
    await logout();

    await loginDemo();
    await createTransfer({ phone: '0355555555', amount: 200_000, note: 'Trả nợ', pin: DEMO_PIN });
    await logout();

    await login({ phone: '0355555555', pin: '135790' });
    expect((await getWallet()).balance).toBe(receiverStart + 200_000);
    const { items } = await getTransactions({ pageSize: 1 });
    expect(items[0]).toMatchObject({ type: 'income', category: 'transfer_in', title: `Nhận tiền từ ${PROFILE.name}`, note: 'Trả nợ' });
  });

  it('người khác không xác nhận được giao dịch đang chờ OTP của mình', async () => {
    const { transferId, otp } = expectOtp(await createTransfer({ phone: BINH, amount: 5_000_000, pin: DEMO_PIN }));
    await logout();
    await register({ name: 'Kẻ Lạ', phone: '0366666666', pin: '135790' });
    await expect(confirmTransfer(transferId, otp)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('walletApi – khóa PIN và khóa ví', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 24, 9, 0));
    await resetData();
    await loginDemo();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it(`sai PIN ${PIN_MAX_ATTEMPTS} lần thì khóa ${PIN_LOCK_MS / 60_000} phút, kể cả khi nhập đúng`, async () => {
    for (let i = 1; i < PIN_MAX_ATTEMPTS; i += 1) {
      await expect(createTransfer({ phone: BINH, amount: 50_000, pin: WRONG_PIN })).rejects.toMatchObject({ code: 'PIN_INVALID' });
    }
    await expect(createTransfer({ phone: BINH, amount: 50_000, pin: WRONG_PIN })).rejects.toMatchObject({ code: 'PIN_LOCKED' });
    await expect(createTransfer({ phone: BINH, amount: 50_000, pin: DEMO_PIN })).rejects.toMatchObject({ code: 'PIN_LOCKED' });
    // Khóa áp dụng cho cả đăng nhập
    await logout();
    await expect(loginDemo()).rejects.toMatchObject({ code: 'PIN_LOCKED' });

    vi.setSystemTime(Date.now() + PIN_LOCK_MS);
    await loginDemo();
    await expect(createTransfer({ phone: BINH, amount: 50_000, pin: DEMO_PIN })).resolves.toMatchObject({ status: 'completed' });
  });

  it('ví bị khóa thì chặn chuyển tiền ở phía server; mở khóa cần đúng PIN', async () => {
    await freezeWallet();
    expect((await getWallet()).frozen).toBe(true);
    await expect(createTransfer({ phone: BINH, amount: 50_000, pin: DEMO_PIN })).rejects.toMatchObject({ code: 'WALLET_FROZEN' });

    await expect(unfreezeWallet(WRONG_PIN)).rejects.toMatchObject({ code: 'PIN_INVALID' });
    await unfreezeWallet(DEMO_PIN);
    expect((await getWallet()).frozen).toBe(false);
    await expect(createTransfer({ phone: BINH, amount: 50_000, pin: DEMO_PIN })).resolves.toMatchObject({ status: 'completed' });
  });

  it('khóa ví khi đang chờ OTP thì giao dịch không thể hoàn tất', async () => {
    const { transferId, otp } = expectOtp(await createTransfer({ phone: BINH, amount: 5_000_000, pin: DEMO_PIN }));
    await freezeWallet();
    await expect(confirmTransfer(transferId, otp)).rejects.toMatchObject({ code: 'WALLET_FROZEN' });
  });

  it('phiên hết hạn sau 30 phút không thao tác, mỗi lần gọi API thì được gia hạn', async () => {
    vi.setSystemTime(Date.now() + SESSION_TTL_MS - 1000);
    await getWallet(); // còn hạn → gia hạn thêm 30 phút
    vi.setSystemTime(Date.now() + SESSION_TTL_MS - 1000);
    await expect(getWallet()).resolves.toBeTruthy();

    vi.setSystemTime(Date.now() + SESSION_TTL_MS);
    await expect(getWallet()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
