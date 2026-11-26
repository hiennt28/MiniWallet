/* Danh sách ngân hàng giả lập để liên kết. Chỉ dùng tên, không kết nối tới ngân hàng thật. */

export interface Bank {
  code: string;
  name: string;
  /** Màu nền cho ô viết tắt (không dùng logo thật). */
  color: string;
}

export const BANKS: readonly Bank[] = [
  { code: 'VCB', name: 'Vietcombank', color: '#15803d' },
  { code: 'TCB', name: 'Techcombank', color: '#dc2626' },
  { code: 'BIDV', name: 'BIDV', color: '#0f766e' },
  { code: 'VTB', name: 'VietinBank', color: '#1d4ed8' },
  { code: 'MB', name: 'MB Bank', color: '#1e3a8a' },
  { code: 'ACB', name: 'ACB', color: '#2563eb' },
  { code: 'TPB', name: 'TPBank', color: '#7c3aed' },
  { code: 'VPB', name: 'VPBank', color: '#047857' },
];

export function findBank(code: string): Bank | undefined {
  return BANKS.find((b) => b.code === code);
}

/** Số tài khoản có đuôi này: ngân hàng từ chối liên kết (để thử trường hợp lỗi). */
export const REJECTED_ACCOUNT_SUFFIX = '0000';
/** Số tài khoản có đuôi này: ngân hàng báo không đủ số dư khi nạp tiền. */
export const EMPTY_ACCOUNT_SUFFIX = '1111';
