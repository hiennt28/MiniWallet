import { describe, expect, it } from 'vitest';
import { expenseByCategory, filterTransactions, groupByDate, normalizeText, paginate, summarizeMonth } from './transactions';

const ref = new Date(2026, 10, 24, 12, 0); // 24/11/2026

const list = [
  { id: '1', type: 'expense', category: 'food', title: 'Cà phê sáng', amount: 30_000, createdAt: new Date(2026, 10, 24, 8).toISOString() },
  { id: '2', type: 'income', category: 'transfer_in', title: 'Nhận tiền từ Bình', amount: 200_000, phone: '0987654321', createdAt: new Date(2026, 10, 20, 9).toISOString() },
  { id: '3', type: 'expense', category: 'food', title: 'Cơm văn phòng', amount: 45_000, note: 'Ăn trưa', createdAt: new Date(2026, 10, 15, 12).toISOString() },
  { id: '4', type: 'expense', category: 'bills', title: 'Tiền điện', amount: 400_000, createdAt: new Date(2026, 9, 30, 10).toISOString() },
];

describe('normalizeText', () => {
  it('bỏ dấu tiếng Việt và chữ hoa', () => {
    expect(normalizeText('Chuyển Tiền Đến')).toBe('chuyen tien den');
  });
});

describe('filterTransactions', () => {
  it('tìm kiếm không phân biệt dấu, theo tiêu đề, lời nhắn và số điện thoại', () => {
    expect(filterTransactions(list, { query: 'ca phe' }).map((t) => t.id)).toEqual(['1']);
    expect(filterTransactions(list, { query: 'an trua' }).map((t) => t.id)).toEqual(['3']);
    expect(filterTransactions(list, { query: '0987' }).map((t) => t.id)).toEqual(['2']);
  });

  it('lọc theo loại và danh mục', () => {
    expect(filterTransactions(list, { type: 'income' })).toHaveLength(1);
    expect(filterTransactions(list, { category: 'food' })).toHaveLength(2);
  });

  it('lọc theo khoảng ngày, tính trọn cả ngày cuối', () => {
    const result = filterTransactions(list, { from: '2026-11-15', to: '2026-11-20' });
    expect(result.map((t) => t.id)).toEqual(['2', '3']);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 23 }, (_, i) => i);

  it('cắt đúng trang và tính tổng số trang', () => {
    const p = paginate(items, 3, 10);
    expect(p.items).toEqual([20, 21, 22]);
    expect(p.totalPages).toBe(3);
    expect(p.total).toBe(23);
  });

  it('đưa số trang vượt giới hạn về trong khoảng hợp lệ', () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate([], 1, 10).totalPages).toBe(1);
  });
});

describe('thống kê theo tháng', () => {
  it('chỉ tính giao dịch trong tháng hiện tại', () => {
    expect(summarizeMonth(list, ref)).toEqual({ income: 200_000, expense: 75_000 });
  });

  it('gom chi tiêu theo danh mục', () => {
    expect(expenseByCategory(list, ref)).toEqual([{ category: 'food', total: 75_000 }]);
  });
});

describe('groupByDate', () => {
  it('gom các giao dịch cùng ngày', () => {
    const groups = groupByDate(list.slice(0, 2), (iso) => iso.slice(0, 10));
    expect(groups).toHaveLength(2);
  });
});
