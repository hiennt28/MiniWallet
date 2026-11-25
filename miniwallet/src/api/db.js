/*
 * "Cơ sở dữ liệu" của API giả lập: giữ trong bộ nhớ và lưu xuống localStorage.
 * Nếu trình duyệt chặn localStorage (chế độ ẩn danh, môi trường test) thì chỉ dùng bộ nhớ.
 */
import { createSeedData } from '../data/seed';

const DB_KEY = 'miniwallet:db:v1';
let memory = null;

function readStorage() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    const db = JSON.parse(raw);
    return db && Array.isArray(db.transactions) && typeof db.balance === 'number' ? db : null;
  } catch {
    return null;
  }
}

function writeStorage(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* hết dung lượng hoặc bị chặn: vẫn chạy bằng bộ nhớ */
  }
}

export function getDb() {
  if (!memory) {
    memory = readStorage() ?? createSeedData();
    writeStorage(memory);
  }
  return memory;
}

export function setDb(next) {
  memory = next;
  writeStorage(next);
  return next;
}

export function resetDb(now = new Date()) {
  return setDb(createSeedData(now));
}
