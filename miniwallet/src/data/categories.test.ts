import { describe, expect, it } from 'vitest';
import { categoriesForType, getCategory, isCategoryKey } from './categories';

describe('danh mục', () => {
  it('nhận biết khóa danh mục hợp lệ, kể cả giá trị đọc từ URL', () => {
    expect(isCategoryKey('food')).toBe(true);
    expect(isCategoryKey('abc')).toBe(false);
    // Không nhận nhầm thuộc tính có sẵn của Object
    expect(isCategoryKey('toString')).toBe(false);
  });

  it('danh mục lạ hiển thị là "Khác"', () => {
    expect(getCategory('abc').label).toBe('Khác');
    expect(getCategory('salary').type).toBe('income');
  });

  it('lọc danh mục theo loại giao dịch', () => {
    expect(categoriesForType('income').map((c) => c.key)).toEqual(['transfer_in', 'salary']);
    expect(categoriesForType('all')).toHaveLength(8);
  });
});
