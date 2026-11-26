/* Danh mục giao dịch: nhãn, biểu tượng và màu dùng cho danh sách và biểu đồ. */
import type { Category, CategoryKey, TypeFilter } from '../types';

export const CATEGORIES: Record<CategoryKey, Category> = {
  food: { label: 'Ăn uống', icon: '🍜', color: '#f97316', type: 'expense' },
  shopping: { label: 'Mua sắm', icon: '🛍️', color: '#ec4899', type: 'expense' },
  transport: { label: 'Di chuyển', icon: '🚕', color: '#0ea5e9', type: 'expense' },
  bills: { label: 'Hóa đơn', icon: '💡', color: '#eab308', type: 'expense' },
  entertainment: { label: 'Giải trí', icon: '🎬', color: '#8b5cf6', type: 'expense' },
  transfer_out: { label: 'Chuyển tiền', icon: '↗', color: '#ef4444', type: 'expense' },
  transfer_in: { label: 'Nhận tiền', icon: '↙', color: '#22c55e', type: 'income' },
  salary: { label: 'Lương', icon: '💼', color: '#10b981', type: 'income' },
  bonus: { label: 'Khuyến mãi', icon: '🎁', color: '#06b6d4', type: 'income' },
  topup: { label: 'Nạp tiền', icon: '🏦', color: '#3b82f6', type: 'income', internal: true },
  withdraw: { label: 'Rút tiền', icon: '🏧', color: '#64748b', type: 'expense', internal: true },
};

const UNKNOWN: Category = { label: 'Khác', icon: '•', color: '#94a3b8', type: 'expense' };

export function isCategoryKey(key: string): key is CategoryKey {
  return Object.hasOwn(CATEGORIES, key);
}

/** Nhận cả chuỗi bất kỳ (ví dụ đọc từ URL), danh mục lạ thì trả về "Khác". */
export function getCategory(key: string): Category {
  return isCategoryKey(key) ? CATEGORIES[key] : UNKNOWN;
}

/** Danh mục cho bộ lọc, theo loại giao dịch ('all' | 'income' | 'expense'). */
export function categoriesForType(type: TypeFilter): Array<Category & { key: CategoryKey }> {
  return (Object.entries(CATEGORIES) as Array<[CategoryKey, Category]>)
    .filter(([, c]) => type === 'all' || c.type === type)
    .map(([key, c]) => ({ key, ...c }));
}
