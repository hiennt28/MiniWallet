/** Ghép className, bỏ qua giá trị rỗng/false: cx('btn', isActive && 'btn--active') */
export function cx(...names) {
  return names.filter(Boolean).join(' ');
}
