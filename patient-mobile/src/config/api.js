/**
 * Central API Endpoints & Ports Configuration
 * SIH-2026 MediKiosk Microservices Architecture
 */

import { Platform } from 'react-native';

// Local Network LAN IP Address from system ipconfig (Ethernet: 192.168.222.241)
const LOCAL_LAN_IP = process.env.EXPO_PUBLIC_API_HOST || '192.168.222.241';

const resolveHost = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
    return 'localhost';
  }

  try {
    const Constants = require('expo-constants').default || require('expo-constants');
    if (Constants) {
      const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
      if (typeof hostUri === 'string' && hostUri.includes(':')) {
        const ip = hostUri.split(':')[0];
        if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
          return ip;
        }
      }
    }
  } catch (err) {
    console.warn('[API Config] Exception resolving host IP:', err);
  }

  if (LOCAL_LAN_IP) {
    return LOCAL_LAN_IP;
  }

  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

const HOST = resolveHost();

export const API_CONFIG = {
  HOST,
  CONVERSATION_BASE_URL: `http://${HOST}:8001/api/v1`,
  DOCUMENT_BASE_URL: `http://${HOST}:8000/api/v1`,
  SUMMARY_BASE_URL: `http://${HOST}:8002/api/v1`,
  WS_CONVERSATION_BASE_URL: `ws://${HOST}:8001/api/v1`,
  TIMEOUT_MS: 15000,
};

export const API_ENDPOINTS = {
  // Conversation Service (Port 8001)
  START_SESSION: `${API_CONFIG.CONVERSATION_BASE_URL}/sessions/start`,
  PROCESS_TURN: `${API_CONFIG.CONVERSATION_BASE_URL}/sessions/turn`,
  GET_SESSION: (id) => `${API_CONFIG.CONVERSATION_BASE_URL}/sessions/${id}`,
  PAUSE_SESSION: (id) => `${API_CONFIG.CONVERSATION_BASE_URL}/sessions/${id}/pause`,
  RESUME_SESSION: (id) => `${API_CONFIG.CONVERSATION_BASE_URL}/sessions/${id}/resume`,
  COMPLETE_SESSION: (id) => `${API_CONFIG.CONVERSATION_BASE_URL}/sessions/${id}/complete`,
  WS_INTAKE_LOOP: (id) => `${API_CONFIG.WS_CONVERSATION_BASE_URL}/sessions/${id}/ws`,

  // Document Service (Port 8000)
  UPLOAD_DOCUMENTS: `${API_CONFIG.DOCUMENT_BASE_URL}/documents`,

  // Summary Service (Port 8002)
  GENERATE_SUMMARY: `${API_CONFIG.SUMMARY_BASE_URL}/summary/generate`,
  CONFIRM_SUMMARY: (id) => `${API_CONFIG.SUMMARY_BASE_URL}/summary/${id}/confirm`,
  GET_SUMMARY: (id) => `${API_CONFIG.SUMMARY_BASE_URL}/summary/${id}`,
};
