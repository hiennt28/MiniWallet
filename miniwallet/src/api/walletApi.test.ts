import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError, confirmTransfer, createTransfer, FAILING_PHONE, getTransactions, getWallet, resetData, toApiError } from './walletApi';

describe('toApiError', () => {
  it('giữ nguyên ApiError, bọc các lỗi khác thành mã UNKNOWN', () => {
    const original = new ApiError('x', 'NOT_FOUND');
    expect(toApiError(original)).toBe(original);
    expect(toApiError(new Error('mất mạng'))).toMatchObject({ code: 'UNKNOWN', message: 'mất mạng' });
    expect(toApiError('chuỗi lạ')).toMatchObject({ code: 'UNKNOWN', message: 'Đã có lỗi xảy ra.' });
  });
});

describe('walletApi – luồng chuyển tiền', () => {
  beforeEach(async () => {
    await resetData();
  });

  it('chuyển tiền thành công: trừ số dư và ghi giao dịch mới lên đầu', async () => {
    const before = await getWallet();
    const { transferId, otp } = await createTransfer({ phone: '0987654321', amount: 100_000, note: 'Test' });
    const tx = await confirmTransfer(transferId, otp);

    const after = await getWallet();
    expect(after.balance).toBe(before.balance - 100_000);
    expect(tx.title).toBe('Chuyển tiền đến Trần Thị Bình');

    const { items } = await getTransactions({ page: 1, pageSize: 1 });
    expect(items[0]?.id).toBe(tx.id);
  });

  it('server kiểm tra lại dữ liệu, không tin hoàn toàn vào form', async () => {
    const { balance } = await getWallet();
    await expect(createTransfer({ phone: '0987654321', amount: balance + 1 })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('giả lập lỗi máy chủ với số điện thoại đặc biệt', async () => {
    await expect(createTransfer({ phone: FAILING_PHONE, amount: 50_000 })).rejects.toMatchObject({ code: 'SERVER_ERROR' });
  });

  it('sai OTP 3 lần thì hủy giao dịch và không trừ tiền', async () => {
    const before = await getWallet();
    const { transferId, otp } = await createTransfer({ phone: '0987654321', amount: 50_000 });
    const wrong = otp === '000000' ? '111111' : '000000';

    await expect(confirmTransfer(transferId, wrong)).rejects.toMatchObject({ code: 'OTP_INVALID' });
    await expect(confirmTransfer(transferId, wrong)).rejects.toMatchObject({ code: 'OTP_INVALID' });
    await expect(confirmTransfer(transferId, wrong)).rejects.toMatchObject({ code: 'OTP_LOCKED' });
    // Đã bị hủy: nhập đúng mã cũng không được
    await expect(confirmTransfer(transferId, otp)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    expect((await getWallet()).balance).toBe(before.balance);
  });
});
