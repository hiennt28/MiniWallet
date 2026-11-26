import { beforeEach, describe, expect, it } from 'vitest';
import { freezeWallet, login, logout, register } from './authApi';
import { getLinkedBanks, linkBank, topUp, unlinkBank, withdraw } from './bankApi';
import { getDb } from './db';
import { getDashboard, getTransactions, getWallet, resetData } from './walletApi';
import { DEMO_PIN, PROFILE } from '../data/seed';
import { MAX_LINKED_BANKS } from '../utils/validators';

const WRONG_PIN = '000000';

async function demoBankId(): Promise<string> {
  const [bank] = await getLinkedBanks();
  if (!bank) throw new Error('Tài khoản demo phải có sẵn một ngân hàng');
  return bank.id;
}

describe('bankApi – liên kết ngân hàng', () => {
  beforeEach(async () => {
    await resetData();
    await login({ phone: PROFILE.phone, pin: DEMO_PIN });
  });

  it('chỉ trả về số tài khoản đã che', async () => {
    const banks = await getLinkedBanks();
    expect(banks).toHaveLength(1);
    expect(banks[0]).toMatchObject({ bankName: 'Vietcombank', accountMasked: '****6789' });
    expect(JSON.stringify(banks)).not.toContain('0071000456789');
  });

  it('liên kết cần đúng PIN; tên chủ tài khoản lấy theo tên ví, viết hoa không dấu', async () => {
    await expect(linkBank({ bankCode: 'TCB', accountNumber: '19033334444', pin: WRONG_PIN })).rejects.toMatchObject({ code: 'PIN_INVALID' });
    const bank = await linkBank({ bankCode: 'TCB', accountNumber: '19033334444', pin: DEMO_PIN });
    expect(bank).toMatchObject({ bankName: 'Techcombank', accountMasked: '****4444', holderName: 'NGUYEN VAN AN' });
    expect(await getLinkedBanks()).toHaveLength(2);
  });

  it('từ chối số tài khoản sai định dạng, trùng, ngân hàng từ chối và vượt số lượng', async () => {
    await expect(linkBank({ bankCode: 'TCB', accountNumber: '123', pin: DEMO_PIN })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(linkBank({ bankCode: 'XYZ', accountNumber: '12345678', pin: DEMO_PIN })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(linkBank({ bankCode: 'VCB', accountNumber: '0071000456789', pin: DEMO_PIN })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(linkBank({ bankCode: 'ACB', accountNumber: '12340000', pin: DEMO_PIN })).rejects.toMatchObject({ code: 'BANK_REJECTED' });

    for (let i = (await getLinkedBanks()).length; i < MAX_LINKED_BANKS; i += 1) {
      await linkBank({ bankCode: 'MB', accountNumber: `5555666${i}`, pin: DEMO_PIN });
    }
    await expect(linkBank({ bankCode: 'MB', accountNumber: '55556669', pin: DEMO_PIN })).rejects.toMatchObject({
      code: 'VALIDATION',
      message: expect.stringContaining(`tối đa ${MAX_LINKED_BANKS}`),
    });
  });

  it('lỗi dữ liệu được báo trước khi kiểm tra PIN, không làm mất lượt thử', async () => {
    await expect(linkBank({ bankCode: 'TCB', accountNumber: '1', pin: WRONG_PIN })).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(getDb().accounts[PROFILE.phone]?.security.failedPinAttempts).toBe(0);
  });

  it('hủy liên kết', async () => {
    await unlinkBank(await demoBankId());
    expect(await getLinkedBanks()).toEqual([]);
    await expect(unlinkBank('bank_khong_ton_tai')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('bankApi – nạp và rút', () => {
  beforeEach(async () => {
    await resetData();
    await login({ phone: PROFILE.phone, pin: DEMO_PIN });
  });

  it('nạp tiền: cộng số dư và ghi giao dịch có thông tin ngân hàng', async () => {
    const before = (await getWallet()).balance;
    const tx = await topUp({ bankId: await demoBankId(), amount: 1_000_000, pin: DEMO_PIN });
    expect((await getWallet()).balance).toBe(before + 1_000_000);
    expect(tx).toMatchObject({ type: 'income', category: 'topup', bankAccount: 'Vietcombank · ****6789' });
    expect((await getTransactions({ pageSize: 1 })).items[0]?.id).toBe(tx.id);
  });

  it('rút tiền: trừ số dư, tính vào tiền ra nhưng không tính là chi tiêu theo danh mục', async () => {
    const before = await getDashboard();
    await withdraw({ bankId: await demoBankId(), amount: 500_000, pin: DEMO_PIN });
    const after = await getDashboard();
    expect(after.balance).toBe(before.balance - 500_000);
    expect(after.month.expense).toBe(before.month.expense + 500_000);
    expect(after.byCategory.find((c) => c.category === 'withdraw')).toBeUndefined();
  });

  it('kiểm tra hạn mức và số dư', async () => {
    const bankId = await demoBankId();
    const { balance } = await getWallet();
    await expect(topUp({ bankId, amount: 5_000, pin: DEMO_PIN })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(topUp({ bankId, amount: 20_000_001, pin: DEMO_PIN })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(withdraw({ bankId, amount: 40_000, pin: DEMO_PIN })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(withdraw({ bankId, amount: balance + 50_000, pin: DEMO_PIN })).rejects.toMatchObject({
      code: 'VALIDATION',
      message: expect.stringContaining('không đủ'),
    });
  });

  it('sai PIN thì không đổi số dư', async () => {
    const before = (await getWallet()).balance;
    await expect(topUp({ bankId: await demoBankId(), amount: 100_000, pin: WRONG_PIN })).rejects.toMatchObject({ code: 'PIN_INVALID' });
    expect((await getWallet()).balance).toBe(before);
  });

  it('ngân hàng báo không đủ số dư (số tài khoản đuôi 1111)', async () => {
    const bank = await linkBank({ bankCode: 'ACB', accountNumber: '22221111', pin: DEMO_PIN });
    await expect(topUp({ bankId: bank.id, amount: 100_000, pin: DEMO_PIN })).rejects.toMatchObject({ code: 'BANK_INSUFFICIENT' });
    // Rút về tài khoản đó vẫn được
    await expect(withdraw({ bankId: bank.id, amount: 100_000, pin: DEMO_PIN })).resolves.toMatchObject({ category: 'withdraw' });
  });

  it('ví bị khóa thì chặn nạp, rút và liên kết', async () => {
    const bankId = await demoBankId();
    await freezeWallet();
    await expect(topUp({ bankId, amount: 100_000, pin: DEMO_PIN })).rejects.toMatchObject({ code: 'WALLET_FROZEN' });
    await expect(withdraw({ bankId, amount: 100_000, pin: DEMO_PIN })).rejects.toMatchObject({ code: 'WALLET_FROZEN' });
    await expect(linkBank({ bankCode: 'TCB', accountNumber: '19033334444', pin: DEMO_PIN })).rejects.toMatchObject({ code: 'WALLET_FROZEN' });
  });

  it('không dùng được ngân hàng của tài khoản khác', async () => {
    const demoBank = await demoBankId();
    await logout();
    await register({ name: 'Người Khác', phone: '0344444444', pin: '135790' });
    expect(await getLinkedBanks()).toEqual([]);
    await expect(withdraw({ bankId: demoBank, amount: 100_000, pin: '135790' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
