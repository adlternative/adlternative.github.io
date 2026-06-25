// Lightweight event bus for pane-to-pane communication.
// Zero dependencies, <30 lines.

type Handler = (data: any) => void;

export interface EventBus {
  on(event: string, fn: Handler): void;
  off(event: string, fn: Handler): void;
  emit(event: string, data?: any): void;
}

export function createBus(): EventBus {
  const map = new Map<string, Set<Handler>>();
  return {
    on(event, fn) {
      let set = map.get(event);
      if (!set) { set = new Set(); map.set(event, set); }
      set.add(fn);
    },
    off(event, fn) {
      map.get(event)?.delete(fn);
    },
    emit(event, data) {
      map.get(event)?.forEach((fn) => { try { fn(data); } catch { /* swallow */ } });
    },
  };
}
