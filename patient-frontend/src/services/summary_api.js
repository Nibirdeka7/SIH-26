import { API_BASE_URLS } from '../config/api_config';

/**
 * Service to generate & confirm bilingual clinical summaries (Port 8002)
 */
export const summaryService = {
  /**
   * Generate structured bilingual clinical summary from completed intake session
   */
  async generateSummary(sessionId, targetLanguage = 'hi') {
    const response = await fetch(`${API_BASE_URLS.SUMMARY}/summary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        target_language: targetLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate summary: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Confirm summary accuracy by patient and finalize queue ticket payload
   */
  async confirmSummary(summaryId, isConfirmed = true, patientFeedback = '') {
    const response = await fetch(`${API_BASE_URLS.SUMMARY}/summary/${summaryId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_confirmed: isConfirmed,
        feedback: patientFeedback,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to confirm summary: ${response.statusText}`);
    }
    return await response.json();
  },
};
