import { useEffect } from 'react';

export const EVENT_SYNC_BUS = 'EVENTHUB_EVENTS_SYNC';

export type EventSyncAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'REGISTER' | 'CANCEL' | 'REMINDER';

export interface EventSyncPayload {
  action: EventSyncAction;
  eventId?: number;
  data?: any;
  timestamp: number;
}

/**
 * Broadcast event changes across all components and browser tabs (Single Source of Truth)
 */
export function notifyEventChange(action: EventSyncAction, eventId?: number, data?: any): void {
  const payload: EventSyncPayload = {
    action,
    eventId,
    data,
    timestamp: Date.now(),
  };

  // 1. Dispatch custom DOM event for current tab components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_SYNC_BUS, { detail: payload }));
  }

  // 2. BroadcastChannel to notify other open tabs
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('eventhub_sync_channel');
      bc.postMessage(payload);
      bc.close();
    }
  } catch (err) {
    // Ignore BroadcastChannel errors on unsupported environments
  }
}

/**
 * React hook to listen for event changes and automatically trigger refetching
 */
export function useEventSync(onSync: (payload: EventSyncPayload) => void): void {
  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<EventSyncPayload>;
      if (customEvent.detail) {
        onSync(customEvent.detail);
      }
    };

    window.addEventListener(EVENT_SYNC_BUS, handleCustomEvent);

    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('eventhub_sync_channel');
        bc.onmessage = (event: MessageEvent<EventSyncPayload>) => {
          if (event.data) {
            onSync(event.data);
          }
        };
      }
    } catch (err) {
      // Fallback
    }

    return () => {
      window.removeEventListener(EVENT_SYNC_BUS, handleCustomEvent);
      bc?.close();
    };
  }, [onSync]);
}
