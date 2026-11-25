/*
 * "Cơ sở dữ liệu" của API giả lập: giữ trong bộ nhớ và lưu xuống localStorage.
 * Nếu trình duyệt chặn localStorage (chế độ ẩn danh, môi trường test) thì chỉ dùng bộ nhớ.
 *
 * v1: một người dùng duy nhất { balance, profile, contacts, transactions }.
 * v2: nhiều tài khoản { version: 2, accounts, sessions }. Dữ liệu v1 cũ được chuyển vào tài khoản demo.
 */
import { DEMO_PIN_CREDENTIALS, createSeedData } from '../data/seed';
import { INITIAL_SECURITY } from '../utils/security';
import type { Account, Contact, Database, Profile, Transaction } from '../types';

const DB_KEY = 'miniwallet:db:v2';
const LEGACY_DB_KEY = 'miniwallet:db:v1';
let memory: Database | null = null;

export interface LegacyDatabaseV1 {
  balance: number;
  profile: Profile;
  contacts: Contact[];
  transactions: Transaction[];
}

/** Dữ liệu đọc từ localStorage có thể bị sửa tay hoặc hỏng: kiểm tra hình dạng tối thiểu. */
function isDatabase(value: unknown): value is Database {
  if (!value || typeof value !== 'object') return false;
  const db = value as Partial<Database>;
  return db.version === 2 && typeof db.accounts === 'object' && db.accounts !== null && typeof db.sessions === 'object' && db.sessions !== null;
}

function isLegacyDatabase(value: unknown): value is LegacyDatabaseV1 {
  if (!value || typeof value !== 'object') return false;
  const db = value as Partial<LegacyDatabaseV1>;
  return Array.isArray(db.transactions) && typeof db.balance === 'number' && typeof db.profile?.phone === 'string';
}

/** Chuyển dữ liệu v1 sang v2: giữ nguyên số dư và giao dịch, gán mã PIN demo. */
export function migrateV1(legacy: LegacyDatabaseV1, now: Date = new Date()): Database {
  const account: Account = {
    profile: { ...legacy.profile },
    pin: { ...DEMO_PIN_CREDENTIALS },
    security: { ...INITIAL_SECURITY },
    balance: legacy.balance,
    contacts: Array.isArray(legacy.contacts) ? legacy.contacts : [],
    transactions: legacy.transactions,
    createdAt: now.toISOString(),
  };
  return { version: 2, accounts: { [legacy.profile.phone]: account }, sessions: {} };
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStorage(): Database | null {
  const current = readJson(DB_KEY);
  if (isDatabase(current)) return current;

  const legacy = readJson(LEGACY_DB_KEY);
  if (isLegacyDatabase(legacy)) {
    const migrated = migrateV1(legacy);
    try {
      localStorage.removeItem(LEGACY_DB_KEY);
    } catch {
      /* bỏ qua */
    }
    return migrated;
  }
  return null;
}

function writeStorage(db: Database): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* hết dung lượng hoặc bị chặn: vẫn chạy bằng bộ nhớ */
  }
}

export function getDb(): Database {
  if (!memory) {
    memory = readStorage() ?? createSeedData();
    writeStorage(memory);
  }
  return memory;
}

export function setDb(next: Database): Database {
  memory = next;
  writeStorage(next);
  return next;
}

export function resetDb(now: Date = new Date()): Database {
  return setDb(createSeedData(now));
}

/** Ghi đè một tài khoản (theo số điện thoại), giữ nguyên phần còn lại. */
export function saveAccount(account: Account): Database {
  const db = getDb();
  return setDb({ ...db, accounts: { ...db.accounts, [account.profile.phone]: account } });
}
