import { describe, expect, it } from 'vitest';
import {
  digitsOnly,
  formatAmountInput,
  formatCountdown,
  formatPhone,
  formatSignedVND,
  formatVND,
  initials,
  maskPhone,
  parseAmount,
} from './format';

// Intl dùng khoảng trắng đặc biệt (NBSP) trước "₫": chuẩn hóa để so sánh
const plain = (s) => s.replace(/\s/g, ' ');

describe('formatVND', () => {
  it('định dạng số tiền theo kiểu Việt Nam', () => {
    expect(plain(formatVND(1250000))).toBe('1.250.000 ₫');
    expect(plain(formatVND(0))).toBe('0 ₫');
  });

  it('làm tròn và chấp nhận giá trị không hợp lệ', () => {
    expect(plain(formatVND(999.6))).toBe('1.000 ₫');
    expect(plain(formatVND(undefined))).toBe('0 ₫');
  });

  it('thêm dấu theo loại giao dịch', () => {
    expect(plain(formatSignedVND(50000, 'income'))).toBe('+50.000 ₫');
    expect(plain(formatSignedVND(50000, 'expense'))).toBe('−50.000 ₫');
  });
});

describe('ô nhập số tiền', () => {
  it('chỉ giữ chữ số và thêm dấu chấm phân cách', () => {
    expect(formatAmountInput('1250000')).toBe('1.250.000');
    expect(formatAmountInput('12a3.4b5')).toBe('12.345');
    expect(formatAmountInput('000500')).toBe('500');
    expect(formatAmountInput('')).toBe('');
  });

  it('đọc lại số từ chuỗi đã định dạng', () => {
    expect(parseAmount('1.250.000')).toBe(1250000);
    expect(parseAmount('')).toBe(0);
  });
});

describe('số điện thoại', () => {
  it('định dạng và che số', () => {
    expect(digitsOnly('0912-345 678')).toBe('0912345678');
    expect(formatPhone('0912345678')).toBe('0912 345 678');
    expect(maskPhone('0912345678')).toBe('0912 *** 678');
  });
});

describe('tiện ích khác', () => {
  it('đếm ngược dạng mm:ss', () => {
    expect(formatCountdown(125)).toBe('02:05');
    expect(formatCountdown(-3)).toBe('00:00');
  });

  it('lấy chữ cái đầu của tên', () => {
    expect(initials('Nguyễn Văn An')).toBe('VA');
    expect(initials('An')).toBe('A');
    expect(initials('')).toBe('?');
  });
});
