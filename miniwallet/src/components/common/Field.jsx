import { cx } from '../../utils/cx';

/**
 * Nhãn + ô nhập + gợi ý/lỗi. children là hàm nhận các thuộc tính cần gắn vào ô nhập
 * (id, aria-invalid, aria-describedby) để trình đọc màn hình đọc được lỗi.
 */
export default function Field({ id, label, hint, error, counter, children }) {
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
