import { API_BASE_URLS } from '../config/api_config';

const FETCH_TIMEOUT_MS = 30000; // Summary generation involves LLM calls

/**
 * Helper: fetch with configurable timeout
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Service to generate & confirm bilingual clinical summaries (Port 8002)
 */
export const summaryService = {
  /**
   * Generate structured bilingual clinical summary from completed intake session
   */
  async generateSummary(sessionId, targetLanguage = 'hi') {
    const response = await fetchWithTimeout(`${API_BASE_URLS.SUMMARY}/summary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        target_language: targetLanguage,
        include_documents: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to generate summary (${response.status}): ${errorText}`);
    }

    return await response.json();
  },

  /**
   * Confirm summary accuracy by patient and finalize queue ticket payload.
   *
   * Backend endpoint: POST /summary/{session_id}/confirm
   * The path param must be the session_id, NOT the summary_id.
   */
  async confirmSummary(summaryId, isConfirmed = true, patientFeedback = '') {
    // summaryId here is actually used as the session_id path param per backend contract
    const response = await fetchWithTimeout(
      `${API_BASE_URLS.SUMMARY}/summary/${summaryId}/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: summaryId,
          is_confirmed: isConfirmed,
          feedback: patientFeedback || '',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to confirm summary (${response.status}): ${errorText}`);
    }

    return await response.json();
  },

  /**
   * Get an already-generated summary by session_id
   */
  async getSummary(sessionId) {
    const response = await fetchWithTimeout(`${API_BASE_URLS.SUMMARY}/summary/${sessionId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch summary (${response.status}): ${response.statusText}`);
    }
    return await response.json();
  },
};
