import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

/** Các thuộc tính Field truyền xuống ô nhập. */
export interface FieldControlProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  counter?: ReactNode;
  children: (props: FieldControlProps) => ReactNode;
}

/**
 * Nhãn + ô nhập + gợi ý/lỗi. children là hàm nhận các thuộc tính cần gắn vào ô nhập
 * (id, aria-invalid, aria-describedby) để trình đọc màn hình đọc được lỗi.
 */
export default function Field({ id, label, hint, error, counter, children }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cx('field', error && 'field--error')}>
      <div className="field__label-row">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        {counter && <span className="field__counter">{counter}</span>}
      </div>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p className="field__hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
