import { beforeEach, describe, expect, it } from 'vitest';
import { login, logout, register } from './authApi';
import { getBudgetOverview, setBudget } from './budgetApi';
import { createTransfer, resetData } from './walletApi';
import { DEMO_PIN, PROFILE } from '../data/seed';
import { shiftMonth, toMonthKey } from '../utils/budget';

describe('budgetApi', () => {
  beforeEach(async () => {
    await resetData();
    await register({ name: 'Người Mới', phone: '0355555555', pin: '135790' });
  });

  it('tài khoản mới chưa có ngân sách nào', async () => {
    const o = await getBudgetOverview();
    expect(o.items).toEqual([]);
    expect(o.month).toBe(toMonthKey(new Date()));
  });

  it('đặt, sửa và xóa ngân sách', async () => {
    await setBudget('food', 2_000_000);
    await setBudget('food', 1_500_000);
    expect((await getBudgetOverview()).items).toMatchObject([{ category: 'food', limit: 1_500_000, spent: 0, status: 'ok' }]);

    await setBudget('food', null);
    expect((await getBudgetOverview()).items).toEqual([]);
  });

  it('chuyển tiền được tính vào ngân sách "Chuyển tiền"', async () => {
    await setBudget('transfer_out', 400_000);
    await createTransfer({ phone: PROFILE.phone, amount: 350_000, pin: '135790' });
    const [item] = (await getBudgetOverview()).items;
    expect(item).toMatchObject({ category: 'transfer_out', spent: 350_000, status: 'warning' });
  });

  it('từ chối danh mục không đặt được ngân sách, hạn mức sai và tháng trong tương lai', async () => {
    await expect(setBudget('withdraw', 1_000_000)).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(setBudget('salary', 1_000_000)).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(setBudget('food', 1_000)).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(getBudgetOverview(shiftMonth(toMonthKey(new Date()), 1))).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(getBudgetOverview('2026-99')).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('ngân sách của mỗi tài khoản tách biệt', async () => {
    await setBudget('food', 1_234_000);
    await logout();
    await login({ phone: PROFILE.phone, pin: DEMO_PIN });
    const o = await getBudgetOverview();
    // Ngân sách mẫu làm tròn tới 10.000 ₫ nên không thể trùng 1.234.000 ₫
    expect(o.items.find((i) => i.category === 'food')?.limit).not.toBe(1_234_000);
  });
});
