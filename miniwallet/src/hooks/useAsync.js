import { useCallback, useEffect, useState } from 'react';

/**
 * Gọi một hàm async và theo dõi trạng thái loading / data / error.
 * Chạy lại khi deps thay đổi hoặc khi gọi reload(). Bỏ qua kết quả của lần gọi cũ
 * nếu đã có lần gọi mới hơn (tránh hiển thị sai dữ liệu khi người dùng đổi bộ lọc nhanh).
 */
export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    asyncFn().then(
      (data) => active && setState({ data, error: null, loading: false }),
      (error) => active && setState({ data: null, error, loading: false }),
    );
    return () => {
      active = false;
    };
    // deps do nơi gọi truyền vào (giống useEffect), asyncFn được tạo mới mỗi lần render nên không đưa vào
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, reload };
}
