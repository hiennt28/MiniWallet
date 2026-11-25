/*
 * API giả lập cho ngân hàng liên kết: liên kết / hủy liên kết, nạp tiền vào ví, rút tiền về ngân hàng.
 * Thứ tự kiểm tra giống chuyển tiền: phiên đăng nhập → ví không bị khóa → dữ liệu hợp lệ → PIN.
 */
import { EMPTY_ACCOUNT_SUFFIX, findBank, REJECTED_ACCOUNT_SUFFIX } from '../data/banks';
import { maskAccountNumber, toBankHolderName } from '../utils/format';
import { MAX_LINKED_BANKS, validateBankLink, validateMoneyMove } from '../utils/validators';
import { saveAccount } from './db';
import { ApiError } from './errors';
import { checkPin, delay, randomId, requireAccount } from './server';
import type { Account, LinkBankInput, LinkedBank, LinkedBankView, MoneyMoveInput, MoneyMoveMode, Transaction } from '../types';

function assertNotFrozen(account: Account): void {
  if (account.security.frozen) {
    throw new ApiError('Ví đang bị khóa. Vào Cài đặt để mở khóa trước khi giao dịch.', 'WALLET_FROZEN');
  }
}

function firstErrorOf(errors: Partial<Record<string, string>>): void {
  const first = Object.values(errors)[0];
  if (first) throw new ApiError(first, 'VALIDATION');
}

/** Không bao giờ trả số tài khoản đầy đủ về client. */
function toView(bank: LinkedBank): LinkedBankView {
  return {
    id: bank.id,
    bankCode: bank.bankCode,
    bankName: findBank(bank.bankCode)?.name ?? bank.bankCode,
    accountMasked: maskAccountNumber(bank.accountNumber),
    holderName: bank.holderName,
    linkedAt: bank.linkedAt,
  };
}

export function bankLabel(bank: Pick<LinkedBankView, 'bankName' | 'accountMasked'>): string {
  return `${bank.bankName} · ${bank.accountMasked}`;
}

export async function getLinkedBanks(): Promise<LinkedBankView[]> {
  await delay(200, 400);
  return requireAccount().linkedBanks.map(toView);
}

export async function linkBank({ bankCode, accountNumber, pin }: LinkBankInput): Promise<LinkedBankView> {
  await delay(500, 900);
  const account = requireAccount();
  assertNotFrozen(account);
  firstErrorOf(validateBankLink({ bankCode, accountNumber }, { knownBank: (code) => Boolean(findBank(code)) }));

  if (account.linkedBanks.length >= MAX_LINKED_BANKS) {
    throw new ApiError(`Bạn chỉ liên kết được tối đa ${MAX_LINKED_BANKS} tài khoản ngân hàng.`, 'VALIDATION');
  }
  if (account.linkedBanks.some((b) => b.bankCode === bankCode && b.accountNumber === accountNumber)) {
    throw new ApiError('Tài khoản ngân hàng này đã được liên kết.', 'VALIDATION');
  }
  if (accountNumber.endsWith(REJECTED_ACCOUNT_SUFFIX)) {
    throw new ApiError('Ngân hàng từ chối liên kết: tên chủ tài khoản không khớp với tên ví.', 'BANK_REJECTED');
  }

  const verified = await checkPin(account.profile.phone, pin);
  const bank: LinkedBank = {
    id: randomId('bank'),
    bankCode,
    accountNumber,
    holderName: toBankHolderName(verified.profile.name),
    linkedAt: new Date().toISOString(),
  };
  saveAccount({ ...verified, linkedBanks: [...verified.linkedBanks, bank] });
  return toView(bank);
}

export async function unlinkBank(bankId: string): Promise<void> {
  await delay();
  const account = requireAccount();
  if (!account.linkedBanks.some((b) => b.id === bankId)) throw new ApiError('Không tìm thấy tài khoản ngân hàng.', 'NOT_FOUND');
  saveAccount({ ...account, linkedBanks: account.linkedBanks.filter((b) => b.id !== bankId) });
}

async function moveMoney(mode: MoneyMoveMode, { bankId, amount, pin }: MoneyMoveInput): Promise<Transaction> {
  await delay(500, 900);
  const account = requireAccount();
  assertNotFrozen(account);
  firstErrorOf(validateMoneyMove(mode, { bankId, amount }, { balance: account.balance }));

  // Chỉ dùng được ngân hàng của chính mình
  const bank = account.linkedBanks.find((b) => b.id === bankId);
  if (!bank) throw new ApiError('Tài khoản ngân hàng không tồn tại hoặc đã bị hủy liên kết.', 'NOT_FOUND');

  if (mode === 'topup' && bank.accountNumber.endsWith(EMPTY_ACCOUNT_SUFFIX)) {
    throw new ApiError('Ngân hàng báo số dư tài khoản không đủ để nạp.', 'BANK_INSUFFICIENT');
  }

  const verified = await checkPin(account.profile.phone, pin);
  // Kiểm tra lại số dư với dữ liệu mới nhất sau khi chờ băm PIN
  if (mode === 'withdraw' && amount > verified.balance) {
    throw new ApiError('Số dư ví không đủ để rút.', 'INSUFFICIENT_BALANCE');
  }

  const view = toView(bank);
  const tx: Transaction = {
    id: randomId('tx'),
    type: mode === 'topup' ? 'income' : 'expense',
    category: mode,
    title: mode === 'topup' ? `Nạp tiền từ ${view.bankName}` : `Rút tiền về ${view.bankName}`,
    amount,
    bankAccount: bankLabel(view),
    status: 'success',
    createdAt: new Date().toISOString(),
  };
  const balance = mode === 'topup' ? verified.balance + amount : verified.balance - amount;
  saveAccount({ ...verified, balance, transactions: [tx, ...verified.transactions] });
  return tx;
}

export const topUp = (input: MoneyMoveInput) => moveMoney('topup', input);
export const withdraw = (input: MoneyMoveInput) => moveMoney('withdraw', input);
