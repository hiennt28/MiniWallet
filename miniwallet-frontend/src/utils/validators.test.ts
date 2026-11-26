import { describe, expect, it } from 'vitest';
import { isValidOtp, isValidPhone, isWeakPin, requiresOtp, validateBankLink, validateMoneyMove, validateRegistration, validateTransfer } from './validators';

describe('mã PIN', () => {
  it('nhận ra PIN dễ đoán', () => {
    expect(isWeakPin('111111')).toBe(true);
    expect(isWeakPin('123456')).toBe(true);
    expect(isWeakPin('987654')).toBe(true);
    expect(isWeakPin('147258')).toBe(false);
    expect(isWeakPin('135790')).toBe(false);
  });

  it('giao dịch từ 5 triệu cần OTP', () => {
    expect(requiresOtp(4_999_999)).toBe(false);
    expect(requiresOtp(5_000_000)).toBe(true);
  });
});

describe('validateRegistration', () => {
  const valid = { name: 'Nguyễn An', phone: '0987654321', pin: '147258', confirmPin: '147258' };

  it('không có lỗi khi hợp lệ', () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it('báo lỗi từng trường', () => {
    expect(validateRegistration({ ...valid, name: ' A ' }).name).toBeTruthy();
    expect(validateRegistration({ ...valid, phone: '0123' }).phone).toBeTruthy();
    expect(validateRegistration({ ...valid, pin: '12345' }).pin).toMatch(/6 chữ số/);
    expect(validateRegistration({ ...valid, pin: '000000', confirmPin: '000000' }).pin).toMatch(/dễ đoán/);
    expect(validateRegistration({ ...valid, confirmPin: '147259' }).confirmPin).toMatch(/không khớp/);
  });
});

const ctx = { balance: 1_000_000, ownPhone: '0912345678' };

describe('isValidPhone', () => {
  it('chấp nhận số di động Việt Nam 10 số', () => {
    expect(isValidPhone('0987654321')).toBe(true);
    expect(isValidPhone('0356789012')).toBe(true);
  });

  it('từ chối số sai đầu số hoặc sai độ dài', () => {
    expect(isValidPhone('0123456789')).toBe(false);
    expect(isValidPhone('098765432')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });
});

describe('validateTransfer', () => {
  it('không có lỗi khi dữ liệu hợp lệ', () => {
    expect(validateTransfer({ phone: '0987654321', amount: 50_000, note: '' }, ctx)).toEqual({});
  });

  it('báo lỗi khi thiếu thông tin', () => {
    const errors = validateTransfer({ phone: '', amount: 0 }, ctx);
    expect(errors.phone).toBeTruthy();
    expect(errors.amount).toBeTruthy();
  });

  it('không cho chuyển cho chính mình', () => {
    expect(validateTransfer({ phone: '0912345678', amount: 50_000 }, ctx).phone).toMatch(/chính mình/);
  });

  it('kiểm tra hạn mức và số dư', () => {
    expect(validateTransfer({ phone: '0987654321', amount: 5_000 }, ctx).amount).toMatch(/tối thiểu/);
    expect(validateTransfer({ phone: '0987654321', amount: 2_000_000 }, ctx).amount).toMatch(/Số dư không đủ/);
    expect(validateTransfer({ phone: '0987654321', amount: 60_000_000 }, { ...ctx, balance: 100_000_000 }).amount).toMatch(/tối đa/);
  });

  it('giới hạn độ dài lời nhắn', () => {
    expect(validateTransfer({ phone: '0987654321', amount: 50_000, note: 'a'.repeat(101) }, ctx).note).toBeTruthy();
  });
});

describe('isValidOtp', () => {
  it('chỉ chấp nhận đúng 6 chữ số', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('12345')).toBe(false);
    expect(isValidOtp('12345a')).toBe(false);
  });
});

describe('validateMoneyMove', () => {
  it('nạp: chỉ kiểm tra hạn mức, không phụ thuộc số dư ví', () => {
    expect(validateMoneyMove('topup', { bankId: 'b', amount: 10_000 }, { balance: 0 })).toEqual({});
    expect(validateMoneyMove('topup', { bankId: '', amount: 0 }, { balance: 0 })).toMatchObject({ bankId: expect.any(String), amount: expect.any(String) });
  });

  it('rút: tối thiểu 50.000 ₫ và không vượt số dư', () => {
    expect(validateMoneyMove('withdraw', { bankId: 'b', amount: 49_000 }, { balance: 1_000_000 }).amount).toMatch(/tối thiểu/);
    expect(validateMoneyMove('withdraw', { bankId: 'b', amount: 2_000_000 }, { balance: 1_000_000 }).amount).toMatch(/không đủ/);
    expect(validateMoneyMove('withdraw', { bankId: 'b', amount: 1_000_000 }, { balance: 1_000_000 })).toEqual({});
  });
});

describe('validateBankLink', () => {
  const knownBank = (code: string) => code === 'VCB';
  it('kiểm tra ngân hàng và số tài khoản 8–14 chữ số', () => {
    expect(validateBankLink({ bankCode: 'VCB', accountNumber: '12345678' }, { knownBank })).toEqual({});
    expect(validateBankLink({ bankCode: 'ABC', accountNumber: '12345678' }, { knownBank }).bankCode).toBeTruthy();
    expect(validateBankLink({ bankCode: 'VCB', accountNumber: '1234567' }, { knownBank }).accountNumber).toBeTruthy();
    expect(validateBankLink({ bankCode: 'VCB', accountNumber: '1234 5678' }, { knownBank }).accountNumber).toBeTruthy();
  });
});
