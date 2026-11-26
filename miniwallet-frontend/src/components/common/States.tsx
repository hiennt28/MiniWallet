/* Các trạng thái hiển thị: đang tải, rỗng, lỗi. */
import type { ReactNode } from 'react';
import { AlertIcon, InboxIcon } from '../icons';
import { cx } from '../../utils/cx';
import Button from './Button';

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="center-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="center-state__text">{label}</span>
    </div>
  );
}

interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
  light?: boolean;
  className?: string;
}

export function Skeleton({ width = '100%', height = '1rem', radius, light = false, className }: SkeletonProps) {
  return (
    <span
      className={cx('skeleton', light && 'skeleton--light', className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="tx-list" aria-busy="true" aria-label="Đang tải giao dịch">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="tx-item tx-item--skeleton">
          <Skeleton width="40px" height="40px" radius="12px" />
          <span className="tx-item__body">
            <Skeleton width="55%" height="0.9rem" />
            <Skeleton width="35%" height="0.75rem" />
          </span>
          <Skeleton width="80px" height="0.9rem" />
        </li>
      ))}
    </ul>
  );
}

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="center-state">
      <span className="center-state__icon">
        <InboxIcon size={28} />
      </span>
      <p className="center-state__title">{title}</p>
      {description && <p className="center-state__text">{description}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title?: ReactNode;
  message?: ReactNode;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Không tải được dữ liệu', message, onRetry }: ErrorStateProps) {
  return (
    <div className="center-state center-state--error" role="alert">
      <span className="center-state__icon">
        <AlertIcon size={28} />
      </span>
      <p className="center-state__title">{title}</p>
      {message && <p className="center-state__text">{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
