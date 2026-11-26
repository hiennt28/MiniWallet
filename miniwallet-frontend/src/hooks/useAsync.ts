import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { toApiError, type ApiError } from '../api/walletApi';

interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

export interface AsyncResult<T> extends AsyncState<T> {
  reload: () => void;
}

/**
 * Gọi một hàm async và theo dõi trạng thái loading / data / error.
 * Chạy lại khi deps thay đổi hoặc khi gọi reload(). Bỏ qua kết quả của lần gọi cũ
 * nếu đã có lần gọi mới hơn (tránh hiển thị sai dữ liệu khi người dùng đổi bộ lọc nhanh).
 */
export function useAsync<T>(asyncFn: () => Promise<T>, deps: DependencyList = []): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    asyncFn().then(
      (data) => {
        if (active) setState({ data, error: null, loading: false });
      },
      (error: unknown) => {
        if (active) setState({ data: null, error: toApiError(error), loading: false });
      },
    );
    return () => {
      active = false;
    };
    // deps do nơi gọi truyền vào (giống useEffect), asyncFn được tạo mới mỗi lần render nên không đưa vào
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, reload };
}
