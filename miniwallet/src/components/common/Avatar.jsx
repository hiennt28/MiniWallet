import { initials } from '../../utils/format';
import { cx } from '../../utils/cx';

export default function Avatar({ name, size = 'md' }) {
  return (
    <span className={cx('avatar', `avatar--${size}`)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
