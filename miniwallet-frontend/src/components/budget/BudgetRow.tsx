import { getCategory } from '../../data/categories';
import { cx } from '../../utils/cx';
import { formatVND } from '../../utils/format';
import type { BudgetItem, BudgetStatus } from '../../types';

export const STATUS_LABEL: Record<BudgetStatus, string> = {
  ok: 'Trong hạn mức',
  warning: 'Sắp hết',
  over: 'Đã vượt',
};

interface BudgetProgressProps {
  item: Pick<BudgetItem, 'spent' | 'limit' | 'ratio' | 'status'>;
  label: string;
  hidden?: boolean;
}

/** Thanh tiến độ có role="progressbar" để trình đọc màn hình đọc được phần trăm. */
export function BudgetProgress({ item, label, hidden = false }: BudgetProgressProps) {
  const percent = Math.round(item.ratio * 100);
  const valueText = hidden ? `${percent}%` : `Đã chi ${formatVND(item.spent)} trên ${formatVND(item.limit)} (${percent}%)`;
  return (
    <div
      className={cx('budget-bar', `budget-bar--${item.status}`)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percent, 100)}
      aria-valuetext={`${valueText}. ${STATUS_LABEL[item.status]}`}
    >
      <span className="budget-bar__fill" style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

interface BudgetRowProps {
  item: BudgetItem;
  hidden?: boolean;
  /** Hiện ước tính cuối tháng và gợi ý mỗi ngày (chỉ có ý nghĩa với tháng hiện tại). */
  showForecast?: boolean;
  onEdit?: () => void;
}

export default function BudgetRow({ item, hidden = false, showForecast = false, onEdit }: BudgetRowProps) {
  const category = getCategory(item.category);
  const money = (v: number) => (hidden ? '••••••' : formatVND(v));
  const remaining = item.limit - item.spent;

  let forecast: string | null = null;
  if (showForecast) {
    if (item.status === 'over') forecast = `Đã vượt ${money(-remaining)}.`;
    else if (item.projected > item.limit) forecast = `Với tốc độ hiện tại sẽ chi khoảng ${money(item.projected)}, vượt hạn mức. Nên chi tối đa ${money(item.dailyAllowance)}/ngày.`;
    else forecast = `Còn ${money(remaining)}, khoảng ${money(item.dailyAllowance)}/ngày.`;
  }

  return (
    <div className="budget-row">
      <div className="budget-row__head">
        <span className="tx-item__icon" style={{ backgroundColor: `${category.color}1f`, color: category.color }} aria-hidden="true">
          {category.icon}
        </span>
        <span className="budget-row__title">
          <strong>{category.label}</strong>
          <span className="text-muted">
            {money(item.spent)} / {money(item.limit)}
          </span>
        </span>
        <span className={cx('badge', `badge--budget-${item.status}`)}>{STATUS_LABEL[item.status]}</span>
        {onEdit && (
          <button type="button" className="link budget-row__edit" onClick={onEdit} aria-label={`Sửa ngân sách ${category.label}`}>
            Sửa
          </button>
        )}
      </div>
      <BudgetProgress item={item} label={`Ngân sách ${category.label}`} hidden={hidden} />
      {forecast && <p className={cx('budget-row__forecast', item.status !== 'ok' && 'budget-row__forecast--alert')}>{forecast}</p>}
    </div>
  );
}
