import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'lg';
  block?: boolean;
  loading?: boolean;
}

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
}: ButtonProps) {
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
