import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTransactions } from '../api/walletApi';
import Button from '../components/common/Button';
import Pagination from '../components/common/Pagination';
import { EmptyState, ErrorState, TransactionListSkeleton } from '../components/common/States';
import { SearchIcon } from '../components/icons';
import TransactionItem from '../components/transaction/TransactionItem';
import { useWallet } from '../context/WalletContext';
import { categoriesForType, getCategory, isCategoryKey } from '../data/categories';
import { useAsync } from '../hooks/useAsync';
import { formatDate } from '../utils/format';
import { groupByDate } from '../utils/transactions';
import type { CategoryKey, TypeFilter } from '../types';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'income', label: 'Tiền vào' },
  { value: 'expense', label: 'Tiền ra' },
];

/** Giá trị trên URL do người dùng sửa được: giá trị lạ thì coi như "Tất cả". */
function parseType(value: string | null): TypeFilter {
  return value === 'income' || value === 'expense' ? value : 'all';
}

function parseCategory(value: string | null): CategoryKey | 'all' {
  return value && isCategoryKey(value) ? value : 'all';
}

/** Bộ lọc nằm trên URL (?q=&type=&category=&from=&to=&page=) nên tải lại trang hay bấm Back vẫn giữ nguyên. */
function readFilters(params: URLSearchParams) {
  return {
    query: params.get('q') ?? '',
    type: parseType(params.get('type')),
    category: parseCategory(params.get('category')),
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
}

export default function Transactions() {
  const { hideBalance } = useWallet();
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [search, setSearch] = useState(filters.query);

  const { data, error, loading, reload } = useAsync(
    () => getTransactions({ ...filters, pageSize: PAGE_SIZE }),
    [params.toString()],
  );

  function updateParams(changes: Record<string, string | number>, { keepPage = false } = {}) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === 'all') next.delete(key);
      else next.set(key, String(value));
    }
    if (!keepPage) next.delete('page');
    setParams(next, { replace: true });
  }

  // Chờ người dùng ngừng gõ rồi mới tìm, tránh gọi API theo từng phím
  useEffect(() => {
    if (search === filters.query) return undefined;
    const timer = setTimeout(() => updateParams({ q: search.trim() }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // chỉ chạy lại khi nội dung ô tìm kiếm thay đổi
  }, [search]);

  function handleTypeChange(type: TypeFilter) {
    // Danh mục đang chọn không thuộc loại mới thì bỏ chọn
    const keepCategory = filters.category === 'all' || type === 'all' || getCategory(filters.category).type === type;
    updateParams({ type, category: keepCategory ? filters.category : 'all' });
  }

  function clearFilters() {
    setSearch('');
    setParams(new URLSearchParams(), { replace: true });
  }

  const hasFilters = Boolean(filters.query || filters.type !== 'all' || filters.category !== 'all' || filters.from || filters.to);
  const invalidRange = filters.from && filters.to && filters.from > filters.to;
  const groups = data ? groupByDate(data.items, formatDate) : [];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Tất cả tiền vào và tiền ra</p>
          <h1 className="page-title">Lịch sử giao dịch</h1>
        </div>
      </header>

      <section className="card filters" aria-label="Bộ lọc giao dịch">
        <div className="filters__search">
          <SearchIcon />
          <input
            className="input input--search"
            type="search"
            placeholder="Tìm theo tên, lời nhắn, số điện thoại…"
            aria-label="Tìm kiếm giao dịch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="segmented" role="group" aria-label="Loại giao dịch">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className="segmented__item"
              aria-pressed={filters.type === o.value}
              onClick={() => handleTypeChange(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="filters__row">
          <label className="filters__field">
            <span>Danh mục</span>
            <select className="input" value={filters.category} onChange={(e) => updateParams({ category: e.target.value })}>
              <option value="all">Tất cả danh mục</option>
              {categoriesForType(filters.type).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filters__field">
            <span>Từ ngày</span>
            <input className="input" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => updateParams({ from: e.target.value })} />
          </label>
          <label className="filters__field">
            <span>Đến ngày</span>
            <input className="input" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => updateParams({ to: e.target.value })} />
          </label>
        </div>

        {invalidRange && (
          <p className="field__error" role="alert">
            Ngày bắt đầu phải trước ngày kết thúc.
          </p>
        )}
      </section>

      <section className="card" aria-busy={loading}>
        <div className="card__header">
          <p className="text-muted" aria-live="polite">
            {data ? `Tìm thấy ${data.total} giao dịch` : 'Đang tải…'}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : !data ? (
          <TransactionListSkeleton count={6} />
        ) : data.total === 0 ? (
          <EmptyState
            title="Không có giao dịch phù hợp"
            description={hasFilters ? 'Thử đổi từ khóa hoặc bộ lọc.' : 'Bạn chưa có giao dịch nào.'}
            action={
              hasFilters && (
                <Button variant="secondary" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              )
            }
          />
        ) : (
          <div className={loading ? 'is-refreshing' : undefined}>
            {groups.map((group) => (
              <div key={group.label} className="tx-group">
                <h3 className="tx-group__title">{group.label}</h3>
                <ul className="tx-list">
                  {group.items.map((tx) => (
                    <li key={tx.id}>
                      <TransactionItem tx={tx} hidden={hideBalance} showDate={false} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              disabled={loading}
              onChange={(page) => {
                updateParams({ page: page > 1 ? page : '' }, { keepPage: true });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
