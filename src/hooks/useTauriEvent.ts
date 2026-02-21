import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

export function useTauriEvent<T>(event: string, handler: (payload: T) => void) {
  // Stable ref — handler can change identity without re-registering the listener
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    const p = listen<T>(event, (e) => handlerRef.current(e.payload));
    return () => { p.then((fn) => fn()); };
  }, [event]); // only re-register if the event name changes
}
