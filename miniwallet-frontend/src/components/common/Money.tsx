import { formatSignedVND, formatVND } from '../../utils/format';
import type { TransactionType } from '../../types';

const HIDDEN_TEXT = '••••••';

interface MoneyProps {
  amount: number | undefined;
  type?: TransactionType;
  hidden?: boolean;
  className?: string;
}

/** Hiển thị số tiền; hidden = true thì che lại (chế độ ẩn số dư). type có thì thêm dấu +/−. */
export default function Money({ amount, type, hidden = false, className }: MoneyProps) {
  if (hidden) {
    return (
      <span className={className} aria-label="Số tiền đã ẩn">
        {HIDDEN_TEXT}
      </span>
    );
  }
  return <span className={className}>{type ? formatSignedVND(amount ?? 0, type) : formatVND(amount)}</span>;
}
