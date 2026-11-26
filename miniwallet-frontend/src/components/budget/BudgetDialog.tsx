import { useEffect, useState, type FormEvent } from 'react';
import { setBudget } from '../../api/budgetApi';
import { toApiError } from '../../api/errors';
import { getCategory } from '../../data/categories';
import { validateBudgetLimit } from '../../utils/budget';
import { formatAmountInput, formatVND, parseAmount } from '../../utils/format';
import Button from '../common/Button';
import Field from '../common/Field';
import Modal from '../common/Modal';
import type { CategoryKey } from '../../types';

interface BudgetDialogProps {
  /** null = đóng hộp thoại. */
  category: CategoryKey | null;
  currentLimit: number | null;
  /** Số đã chi tháng này, để gợi ý hạn mức. */
  spent: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Gợi ý hạn mức: làm tròn lên 100.000 ₫ từ số đã chi × hệ số, bỏ trùng. */
function suggestions(spent: number): number[] {
  const base = [1_000_000, 2_000_000, 3_000_000];
  if (spent <= 0) return base;
  const fromSpent = [1, 1.2, 1.5].map((f) => Math.ceil((spent * f) / 100_000) * 100_000);
  return [...new Set(fromSpent)].filter((v) => v >= 100_000);
}

export default function BudgetDialog({ category, currentLimit, spent, onClose, onSaved }: BudgetDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<'save' | 'remove' | null>(null);

  useEffect(() => {
    if (category) {
      setValue(currentLimit ? formatAmountInput(String(currentLimit)) : '');
      setError('');
    }
  }, [category, currentLimit]);

  if (!category) return null;
  const label = getCategory(category).label;

  async function save(limit: number | null) {
    if (!category) return;
    setSaving(limit === null ? 'remove' : 'save');
    try {
      await setBudget(category, limit);
      onSaved(limit === null ? `Đã xóa ngân sách ${label}.` : `Đã đặt ngân sách ${label}: ${formatVND(limit)}/tháng.`);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSaving(null);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const limit = parseAmount(value);
    const message = validateBudgetLimit(limit);
    if (message) {
      setError(message);
      document.getElementById('budget-limit')?.focus();
      return;
    }
    save(limit);
  }

  return (
    <Modal open title={currentLimit ? `Sửa ngân sách ${label}` : `Đặt ngân sách ${label}`} onClose={() => !saving && onClose()}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field
          id="budget-limit"
          label="Hạn mức mỗi tháng"
          error={error}
          hint={spent > 0 ? `Tháng này đã chi ${formatVND(spent)}. Cảnh báo khi chi tới 80% hạn mức.` : 'Cảnh báo khi chi tới 80% hạn mức.'}
        >
          {(props) => (
            <div className="input-group">
              <input
                {...props}
                className="input input--amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={value}
                onChange={(e) => {
                  setValue(formatAmountInput(e.target.value));
                  setError('');
                }}
              />
              <span className="input-group__suffix">₫</span>
            </div>
          )}
        </Field>

        <div className="quick-amounts" role="group" aria-label="Gợi ý hạn mức">
          {suggestions(spent).map((v) => (
            <button key={v} type="button" className="chip" onClick={() => setValue(formatAmountInput(String(v)))}>
              {formatVND(v)}
            </button>
          ))}
        </div>

        <div className="button-row">
          {currentLimit ? (
            <Button variant="danger" onClick={() => save(null)} loading={saving === 'remove'} disabled={saving !== null}>
              Xóa ngân sách
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose} disabled={saving !== null}>
              Hủy
            </Button>
          )}
          <Button type="submit" loading={saving === 'save'} disabled={saving !== null}>
            Lưu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
