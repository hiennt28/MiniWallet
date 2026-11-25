/* Lọc, phân trang và thống kê giao dịch. Hàm thuần, dùng trong API giả lập và trong test. */

/** Bỏ dấu tiếng Việt và chữ hoa để tìm kiếm: "Chuyển Tiền" -> "chuyen tien" */
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/** "2026-11-24" -> thời điểm 00:00 hoặc 23:59:59.999 ngày đó theo giờ địa phương */
function dayBoundary(value, end = false) {
  const [y, m, d] = value.split('-').map(Number);
  const start = new Date(y, m - 1, d).getTime();
  return end ? start + 24 * 60 * 60 * 1000 - 1 : start;
}

export function filterTransactions(list, { query = '', type = 'all', category = 'all', from = '', to = '' } = {}) {
  const q = normalizeText(query);
  const fromTime = from ? dayBoundary(from) : -Infinity;
  const toTime = to ? dayBoundary(to, true) : Infinity;

  return list.filter((tx) => {
    if (type !== 'all' && tx.type !== type) return false;
    if (category !== 'all' && tx.category !== category) return false;
    const time = new Date(tx.createdAt).getTime();
    if (time < fromTime || time > toTime) return false;
    if (q) {
      const haystack = normalizeText(`${tx.title} ${tx.note ?? ''} ${tx.phone ?? ''}`);
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function paginate(list, page = 1, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  return {
    items: list.slice(start, start + pageSize),
    page: current,
    pageSize,
    totalPages,
    total: list.length,
  };
}

export function isSameMonth(iso, ref = new Date()) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

/** Tổng thu, tổng chi trong tháng của ngày ref. */
export function summarizeMonth(list, ref = new Date()) {
  return list.reduce(
    (acc, tx) => {
      if (!isSameMonth(tx.createdAt, ref)) return acc;
      if (tx.type === 'income') acc.income += tx.amount;
      else acc.expense += tx.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );
}

/** Chi tiêu trong tháng gom theo danh mục, sắp xếp giảm dần. */
export function expenseByCategory(list, ref = new Date()) {
  const totals = new Map();
  for (const tx of list) {
    if (tx.type !== 'expense' || !isSameMonth(tx.createdAt, ref)) continue;
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

/** Gom các giao dịch (đã sắp xếp mới nhất trước) theo ngày để hiển thị. */
export function groupByDate(list, formatDate) {
  const groups = [];
  for (const tx of list) {
    const label = formatDate(tx.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(tx);
    else groups.push({ label, items: [tx] });
  }
  return groups;
}
