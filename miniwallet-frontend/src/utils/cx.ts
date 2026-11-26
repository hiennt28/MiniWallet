/** Ghép className, bỏ qua giá trị rỗng/false: cx('btn', isActive && 'btn--active') */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ');
}
