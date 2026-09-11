/**
 * MediKiosk Shared Local DB Sync Service (Patient Kiosk Frontend)
 * Synchronizes sessions, OCR document findings, and patient ticket state
 * with the Doctor Dashboard via BroadcastChannel and shared storage.
 */

const CHANNEL_NAME = 'medikiosk_shared_db_channel';
const LOCAL_STORAGE_KEY = 'medikiosk_shared_db';

class SharedDbService {
  constructor() {
    this.channel = null;
    this.listeners = [];

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.notifyListeners(event.data);
        };
      } catch (e) {
        console.warn('[SharedDB] BroadcastChannel initialization notice:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notifyListeners({ type: 'STORAGE_SYNC', payload: data });
          } catch (_) {}
        }
      });
    }
  }

  getStore() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      sessions: {},
      summaries: {},
      documents: [],
      queue: [],
    };
  }

  saveStore(store) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
    } catch (_) {}
  }

  broadcast(type, payload) {
    const store = this.getStore();
    if (type === 'NEW_SESSION') {
      store.sessions[payload.session_id] = payload;
    } else if (type === 'NEW_DOCUMENT') {
      store.documents.push(payload);
    } else if (type === 'NEW_SUMMARY') {
      store.summaries[payload.session_id] = payload;
    }
    this.saveStore(store);

    if (this.channel) {
      try {
        this.channel.postMessage({ type, payload, timestamp: Date.now() });
      } catch (_) {}
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach((fn) => {
      try { fn(data); } catch (_) {}
    });
  }
}

export const sharedDbService = new SharedDbService();
