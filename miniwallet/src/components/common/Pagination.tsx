import { ChevronLeftIcon, ChevronRightIcon } from '../icons';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}

export default function Pagination({ page, totalPages, onChange, disabled = false }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Phân trang">
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Trang trước"
      >
        <ChevronLeftIcon />
      </button>
      <span className="pagination__info" aria-live="polite">
        Trang <strong>{page}</strong> / {totalPages}
      </span>
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Trang sau"
      >
        <ChevronRightIcon />
      </button>
    </nav>
  );
}
