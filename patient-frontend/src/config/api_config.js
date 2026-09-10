/**
 * Central API Service Endpoints & Configuration
 * SIH-2026 Healthcare Platform Backend Routes
 *
 * Override via environment variables in .env:
 *   VITE_CONVERSATION_URL=http://192.168.x.x:8001/api/v1
 *   VITE_DOCUMENT_URL=http://192.168.x.x:8000/api/v1
 *   VITE_SUMMARY_URL=http://192.168.x.x:8002/api/v1
 */

const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';

export const API_BASE_URLS = {
  CONVERSATION: import.meta.env.VITE_CONVERSATION_URL || `http://${API_HOST}:8001/api/v1`,
  DOCUMENT: import.meta.env.VITE_DOCUMENT_URL || `http://${API_HOST}:8000/api/v1`,
  SUMMARY: import.meta.env.VITE_SUMMARY_URL || `http://${API_HOST}:8002/api/v1`,
};

export const SUPPORTED_LANGUAGES = [
  { code: 'hi', name: 'हिंदी', englishName: 'Hindi' },
  { code: 'en', name: 'English', englishName: 'English' },
  { code: 'bn', name: 'বাংলা', englishName: 'Bengali' },
  { code: 'ta', name: 'தமிழ்', englishName: 'Tamil' },
  { code: 'te', name: 'తెలుగు', englishName: 'Telugu' },
  { code: 'mr', name: 'मराठी', englishName: 'Marathi' },
  { code: 'gu', name: 'ગુજરાતી', englishName: 'Gujarati' },
  { code: 'kn', name: 'ಕನ್ನಡ', englishName: 'Kannada' },
  { code: 'ml', name: 'മലയാളം', englishName: 'Malayalam' },
  { code: 'as', name: 'অসমীয়া', englishName: 'Assamese' },
];
