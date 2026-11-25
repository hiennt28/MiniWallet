import { findBank } from '../../data/banks';
import { cx } from '../../utils/cx';

/** Ô vuông có tên viết tắt của ngân hàng (thay cho logo). */
export default function BankBadge({ code, size = 'md' }: { code: string; size?: 'sm' | 'md' }) {
  const color = findBank(code)?.color ?? '#64748b';
  return (
    <span className={cx('bank-badge', `bank-badge--${size}`)} style={{ backgroundColor: color }} aria-hidden="true">
      {code}
    </span>
  );
}
