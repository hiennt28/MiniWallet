/*
 * Dữ liệu mẫu: hồ sơ, danh bạ và khoảng 60 ngày giao dịch tính ngược từ hôm nay.
 * Dùng bộ sinh số ngẫu nhiên có seed cố định nên lần nào tạo lại cũng ra cùng một bộ dữ liệu.
 */

export const PROFILE = { name: 'Nguyễn Văn An', phone: '0912345678' };

export const CONTACTS = [
  { name: 'Trần Thị Bình', phone: '0987654321' },
  { name: 'Lê Minh Châu', phone: '0356789012' },
  { name: 'Phạm Quốc Dũng', phone: '0778123456' },
  { name: 'Hoàng Gia Hân', phone: '0839876543' },
];

export const INITIAL_BALANCE = 8_450_000;

const EXPENSE_TEMPLATES = {
  food: { titles: ['Quán phở đầu ngõ', 'Cà phê sáng', 'Cơm văn phòng', 'Trà sữa', 'Bánh mì'], min: 25, max: 180 },
  shopping: { titles: ['Siêu thị gần nhà', 'Mua sách', 'Quần áo', 'Đồ gia dụng'], min: 120, max: 900 },
  transport: { titles: ['Đặt xe đi làm', 'Đổ xăng', 'Vé xe buýt tháng', 'Gửi xe'], min: 15, max: 250 },
  bills: { titles: ['Tiền điện', 'Tiền nước', 'Cước Internet', 'Nạp tiền điện thoại'], min: 100, max: 650 },
  entertainment: { titles: ['Vé xem phim', 'Gói nghe nhạc', 'Đi chơi cuối tuần'], min: 60, max: 400 },
};

// Tỉ lệ xuất hiện của từng danh mục chi tiêu
const EXPENSE_WEIGHTS = [
  ['food', 45],
  ['transport', 22],
  ['shopping', 14],
  ['entertainment', 10],
  ['bills', 9],
];

/** Bộ sinh số giả ngẫu nhiên Mulberry32. */
function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeedData(now = new Date(), seed = 2026) {
  const random = createRandom(seed);
  const pick = (arr) => arr[Math.floor(random() * arr.length)];
  const between = (min, max) => min + Math.floor(random() * (max - min + 1));
  const weighted = () => {
    const total = EXPENSE_WEIGHTS.reduce((s, [, w]) => s + w, 0);
    let r = random() * total;
    for (const [key, w] of EXPENSE_WEIGHTS) {
      if ((r -= w) < 0) return key;
    }
    return EXPENSE_WEIGHTS[0][0];
  };

  const transactions = [];
  let counter = 0;
  const latest = now.getTime() - 60 * 1000;

  const add = (tx, day, hour, minute) => {
    const date = new Date(day);
    date.setHours(hour, minute, between(0, 59), 0);
    const time = Math.min(date.getTime(), latest - counter * 60 * 1000);
    counter += 1;
    transactions.push({
      id: `tx_${String(counter).padStart(4, '0')}`,
      status: 'success',
      note: '',
      ...tx,
      createdAt: new Date(time).toISOString(),
    });
  };

  for (let daysAgo = 59; daysAgo >= 0; daysAgo -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);

    if (day.getDate() === 5) {
      add({ type: 'income', category: 'salary', title: 'Lương tháng', amount: 15_000_000, note: 'Công ty chuyển lương' }, day, 9, 0);
    }

    const count = between(0, 2);
    for (let i = 0; i < count; i += 1) {
      const category = weighted();
      const tpl = EXPENSE_TEMPLATES[category];
      add(
        { type: 'expense', category, title: pick(tpl.titles), amount: between(tpl.min, tpl.max) * 1000 },
        day,
        between(7, 21),
        between(0, 59),
      );
    }

    if (random() < 0.1) {
      const c = pick(CONTACTS);
      add(
        { type: 'income', category: 'transfer_in', title: `Nhận tiền từ ${c.name}`, amount: between(5, 50) * 10_000, phone: c.phone, note: pick(['Trả tiền ăn trưa', 'Gửi lại tiền', 'Góp quỹ']) },
        day,
        between(8, 22),
        between(0, 59),
      );
    }

    if (random() < 0.08) {
      const c = pick(CONTACTS);
      add(
        { type: 'expense', category: 'transfer_out', title: `Chuyển tiền đến ${c.name}`, amount: between(5, 80) * 10_000, phone: c.phone, note: pick(['Tiền sinh nhật', 'Chia tiền đi chơi', '']) },
        day,
        between(8, 22),
        between(0, 59),
      );
    }
  }

  transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    balance: INITIAL_BALANCE,
    profile: { ...PROFILE },
    contacts: CONTACTS.map((c) => ({ ...c })),
    transactions,
  };
}
