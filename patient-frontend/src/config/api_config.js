/**
 * Central API Service Endpoints & Configuration
 * SIH-2026 Healthcare Platform Backend Routes
 */

export const API_BASE_URLS = {
  CONVERSATION: 'http://localhost:8001/api/v1',
  DOCUMENT: 'http://localhost:8000/api/v1',
  SUMMARY: 'http://localhost:8002/api/v1',
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
