import { useEffect, useState } from 'react';

/** Trả về Date.now() và cập nhật mỗi intervalMs (dùng cho đồng hồ đếm ngược). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
