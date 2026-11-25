/*
 * "Cơ sở dữ liệu" của API giả lập: giữ trong bộ nhớ và lưu xuống localStorage.
 * Nếu trình duyệt chặn localStorage (chế độ ẩn danh, môi trường test) thì chỉ dùng bộ nhớ.
 */
import { createSeedData } from '../data/seed';
import type { Database } from '../types';

const DB_KEY = 'miniwallet:db:v1';
let memory: Database | null = null;

/** Dữ liệu đọc từ localStorage có thể bị sửa tay hoặc hỏng: kiểm tra hình dạng tối thiểu. */
function isDatabase(value: unknown): value is Database {
  if (!value || typeof value !== 'object') return false;
  const db = value as Partial<Database>;
  return Array.isArray(db.transactions) && typeof db.balance === 'number';
}

function readStorage(): Database | null {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    const db: unknown = JSON.parse(raw);
    return isDatabase(db) ? db : null;
  } catch {
    return null;
  }
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
