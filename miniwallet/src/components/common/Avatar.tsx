import { initials } from '../../utils/format';
import { cx } from '../../utils/cx';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Avatar({ name, size = 'md' }: AvatarProps) {
  return (
    <span className={cx('avatar', `avatar--${size}`)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
