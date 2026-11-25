/* Danh mục giao dịch: nhãn, biểu tượng và màu dùng cho danh sách và biểu đồ. */

export const CATEGORIES = {
  food: { label: 'Ăn uống', icon: '🍜', color: '#f97316', type: 'expense' },
  shopping: { label: 'Mua sắm', icon: '🛍️', color: '#ec4899', type: 'expense' },
  transport: { label: 'Di chuyển', icon: '🚕', color: '#0ea5e9', type: 'expense' },
  bills: { label: 'Hóa đơn', icon: '💡', color: '#eab308', type: 'expense' },
  entertainment: { label: 'Giải trí', icon: '🎬', color: '#8b5cf6', type: 'expense' },
  transfer_out: { label: 'Chuyển tiền', icon: '↗', color: '#ef4444', type: 'expense' },
  transfer_in: { label: 'Nhận tiền', icon: '↙', color: '#22c55e', type: 'income' },
  salary: { label: 'Lương', icon: '💼', color: '#10b981', type: 'income' },
};

const UNKNOWN = { label: 'Khác', icon: '•', color: '#94a3b8', type: 'expense' };

export function getCategory(key) {
  return CATEGORIES[key] ?? UNKNOWN;
}

/** Danh mục cho bộ lọc, theo loại giao dịch ('all' | 'income' | 'expense'). */
export function categoriesForType(type) {
  return Object.entries(CATEGORIES)
    .filter(([, c]) => type === 'all' || c.type === type)
    .map(([key, c]) => ({ key, ...c }));
}
