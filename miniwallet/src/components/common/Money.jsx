import { formatSignedVND, formatVND } from '../../utils/format';

const HIDDEN_TEXT = '••••••';

/** Hiển thị số tiền; hidden = true thì che lại (chế độ ẩn số dư). type có thì thêm dấu +/−. */
export default function Money({ amount, type, hidden = false, className }) {
  if (hidden) {
    return (
      <span className={className} aria-label="Số tiền đã ẩn">
        {HIDDEN_TEXT}
      </span>
    );
  }
  return <span className={className}>{type ? formatSignedVND(amount, type) : formatVND(amount)}</span>;
}
