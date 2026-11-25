import { cx } from '../../utils/cx';

/** Nút dùng chung. variant: primary | secondary | ghost | danger. */
export default function Button({
  variant = 'primary',
  size,
  block = false,
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={cx('btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="spinner spinner--sm" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
