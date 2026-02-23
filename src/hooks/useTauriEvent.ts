import { useEffect, useRef } from "react";
import { listenEvent } from "@/lib/platform";

export function useTauriEvent<T>(event: string, handler: (payload: T) => void) {
  // Stable ref — handler can change identity without re-registering the listener
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    const p = listenEvent<T>(event, (payload) => handlerRef.current(payload));
    return () => { p.then((fn) => fn()); };
  }, [event]); // only re-register if the event name changes
}
