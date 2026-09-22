import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Event } from '../types';
import { apiService } from '../services/api';

interface EventContextType {
  events: Event[];
  activeEvent: Event;
  isLoadingEvents: boolean;
  refreshEvents: () => Promise<Event[]>;
  setActiveEvent: (event: Event) => void;
  selectEventById: (id: number) => void;
  updateActiveEvent: (updated: Partial<Event>) => void;
  removeEvent: (id: number) => void;
  addEvent: (event: Event) => void;
}

const DEFAULT_EVENT: Event = {
  id: 1,
  title: 'EventHub AI Summit 2026',
  description: 'Hội thảo quốc tế hàng đầu về Generative AI, RAG Vector Search và Tự Động Hóa Quản Trị Sự Kiện.',
  category_id: 1,
  location: 'GEM Center, TP. Hồ Chí Minh',
  location_address: 'Số 8 Nguyễn Bỉnh Khiêm, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
  google_maps_url: 'https://maps.google.com/maps?q=GEM+Center+Ho+Chi+Minh&t=&z=16&ie=UTF8&iwloc=&output=embed',
  start_time: '15-16 Oct 2026, 08:30 AM',
  end_time: '16 Oct 2026, 17:30 PM',
  start_date: '15/10/2026 08:30',
  end_date: '16/10/2026 17:30',
  status: 'ONGOING',
  wifiName: 'EventHub_VIP_Guest',
  wifiPassword: 'EventHub2026!',
};

const EventContext = createContext<EventContextType>({
  events: [DEFAULT_EVENT],
  activeEvent: DEFAULT_EVENT,
  isLoadingEvents: false,
  refreshEvents: async () => [DEFAULT_EVENT],
  setActiveEvent: () => {},
  selectEventById: () => {},
  updateActiveEvent: () => {},
  removeEvent: () => {},
  addEvent: () => {},
});

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([DEFAULT_EVENT]);
  const [activeEvent, setActiveEventState] = useState<Event>(DEFAULT_EVENT);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);

  const refreshEvents = useCallback(async (): Promise<Event[]> => {
    setIsLoadingEvents(true);
    try {
      const fetched = await apiService.getEvents();
      if (fetched && Array.isArray(fetched)) {
        setEvents(fetched);

        // Check if there is a saved selected event ID in localStorage
        const savedIdStr = localStorage.getItem('eventhub_selected_event_id');
        const savedId = savedIdStr ? parseInt(savedIdStr, 10) : null;
        const matched = savedId ? fetched.find((e) => e.id === savedId) : null;

        if (matched) {
          setActiveEventState(matched);
        } else if (fetched.length > 0) {
          // If activeEvent is default or not in fetched list, pick the first
          setActiveEventState((prev) => {
            const currentExists = fetched.find((e) => e.id === prev.id);
            return currentExists || fetched[0];
          });
        } else {
          setActiveEventState(DEFAULT_EVENT);
        }
        return fetched;
      }
      return [DEFAULT_EVENT];
    } catch (err) {
      console.warn('Failed to load events list:', err);
      return [DEFAULT_EVENT];
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const setActiveEvent = (event: Event) => {
    setActiveEventState(event);
    if (event.id) {
      localStorage.setItem('eventhub_selected_event_id', event.id.toString());
    }
  };

  const selectEventById = (id: number) => {
    const found = events.find((e) => e.id === id);
    if (found) {
      setActiveEvent(found);
    }
  };

  const updateActiveEvent = (updated: Partial<Event>) => {
    setActiveEventState((prev) => {
      const merged = { ...prev, ...updated };
      // Also update in events array
      setEvents((currentEvents) =>
        currentEvents.map((e) => (e.id === merged.id ? { ...e, ...merged } : e))
      );
      return merged;
    });
  };

  const removeEvent = (id: number) => {
    setEvents((prev) => {
      const filtered = prev.filter((e) => e.id !== id);
      if (activeEvent.id === id) {
        if (filtered.length > 0) {
          setActiveEvent(filtered[0]);
        } else {
          setActiveEvent(DEFAULT_EVENT);
        }
      }
      return filtered;
    });
  };

  const addEvent = (newEvent: Event) => {
    setEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== newEvent.id)]);
    setActiveEvent(newEvent);
  };

  return (
    <EventContext.Provider
      value={{
        events,
        activeEvent,
        isLoadingEvents,
        refreshEvents,
        setActiveEvent,
        selectEventById,
        updateActiveEvent,
        removeEvent,
        addEvent,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => useContext(EventContext);
