import { useEffect, useRef, useState } from "react";

export function useToast(duration = 4000) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function showToast(msg: string) {
    if (timer.current) clearTimeout(timer.current);
    setToast(msg);
    timer.current = setTimeout(() => setToast(null), duration);
  }
  return { toast, showToast };
}
