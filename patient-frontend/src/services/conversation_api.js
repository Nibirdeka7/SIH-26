import { API_BASE_URLS } from '../config/api_config';

const FETCH_TIMEOUT_MS = 15000;

/**
 * Helper: fetch with configurable timeout to avoid hanging on offline backends
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
 * Service to handle clinical intake dynamic questioning loop with Conversation Service (Port 8001)
 */
export const conversationService = {
  /**
   * Start a new triage intake session
   */
  async startSession({ patientId, name, age, gender, preferredLanguage = 'hi' }) {
    const response = await fetchWithTimeout(`${API_BASE_URLS.CONVERSATION}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId || `p_${Date.now()}`,
        patient_name: name || 'Anonymous',
        age: parseInt(age, 10) || 30,
        gender: gender || 'unknown',
        language: preferredLanguage,
        intake_mode: 'allopathy',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to start intake session (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return {
      session_id: data.session_id,
      patient_id: data.patient_id,
      // Prefer initial_question, fall back to greeting
      question: data.initial_question || data.greeting || 'Hello, what symptoms are you experiencing today?',
      current_question: data.current_question || null,
      audio_base64: data.greeting_audio_url || null,
      suggested_options: data.suggested_quick_responses || [],
    };
  },

  /**
   * Submit patient answer turn (text, touch option, or audio) and get dynamic question response & triage status
   */
  async submitTurn({ sessionId, text, selectedOption = null, audioBase64 = null, language = 'hi' }) {
    const response = await fetchWithTimeout(`${API_BASE_URLS.CONVERSATION}/sessions/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_text: text || '',
        selected_option: selectedOption || null,
        audio_base64: audioBase64 || null,
        language: language,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to process turn (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const triage = data.triage || {};

    return {
      session_id: data.session_id,
      turn_id: data.turn_id,
      // ai_response_native preferred over english for the chat bubble
      question: data.ai_response_native || data.ai_response_english || 'Please tell me more about your symptoms.',
      current_question: data.current_question || null,
      audio_base64: data.response_audio_base64 || null,
      triage_priority: triage.triage_level || 'ROUTINE',
      is_critical: triage.is_critical || false,
      red_flags: triage.red_flags || [],
      suggested_options: data.suggested_quick_responses || [],
      extracted_clinical_updates: data.extracted_clinical_updates || {},
      is_completed: data.is_completed || false,
    };
  },

  /**
   * Fetch session details and medical history graph state
   */
  async getSessionDetails(sessionId) {
    const response = await fetchWithTimeout(`${API_BASE_URLS.CONVERSATION}/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch session (${response.status}): ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Pause intake session
   */
  async pauseSession(sessionId) {
    const response = await fetchWithTimeout(
      `${API_BASE_URLS.CONVERSATION}/sessions/${sessionId}/pause`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(`Failed to pause session: ${response.statusText}`);
    return await response.json();
  },

  /**
   * Resume intake session
   */
  async resumeSession(sessionId) {
    const response = await fetchWithTimeout(
      `${API_BASE_URLS.CONVERSATION}/sessions/${sessionId}/resume`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(`Failed to resume session: ${response.statusText}`);
    return await response.json();
  },

  /**
   * Complete intake session
   */
  async completeSession(sessionId) {
    const response = await fetchWithTimeout(
      `${API_BASE_URLS.CONVERSATION}/sessions/${sessionId}/complete`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(`Failed to complete session: ${response.statusText}`);
    return await response.json();
  },
};
