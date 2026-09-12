import { API_BASE_URLS } from '../config/api_config';

const FETCH_TIMEOUT_MS = 60000; // Document vision/OCR upload can take 15-30s

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
 * Service to handle prescription/lab report photo upload & OCR processing (Port 8000)
 */
export const documentService = {
  /**
   * Check health status of Document Service backend
   * Backend returns { status: 'ok' } or { status: 'running' }
   */
  async checkHealth() {
    try {
      let response = await fetchWithTimeout(`${API_BASE_URLS.DOCUMENT}/health`, {}, 5000).catch(() => null);
      if (!response || !response.ok) {
        response = await fetchWithTimeout(`${API_BASE_URLS.DOCUMENT}/`, {}, 5000).catch(() => null);
      }
      if (!response || !response.ok) return { status: 'error', service: 'document-service' };
      const data = await response.json();
      const isOnline = data.status === 'ok' || data.status === 'healthy' || data.status === 'running';
      return { status: isOnline ? 'ok' : 'error', service: 'document-service', raw: data };
    } catch (err) {
      console.warn('[DocumentService] Health check failed:', err.message);
      return { status: 'unreachable', service: 'document-service' };
    }
  },

  /**
   * Upload a single image file for medical document OCR extraction
   */
  async analyzeDocument(file, sessionId = null, documentType = null) {
    return this.uploadMultipleDocuments([file], sessionId, documentType);
  },

  /**
   * Upload one or more medical documents (prescriptions, lab reports, discharge summaries)
   * Returns the backend response or throws a user-friendly error.
   */
  async uploadMultipleDocuments(files, sessionId = null, documentType = null) {
    const formData = new FormData();

    const fileList = Array.isArray(files) ? files : [files];
    fileList.forEach((file) => {
      if (file) {
        formData.append('files', file);
      }
    });

    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    if (documentType) {
      // Map 'OTHER' to 'UNKNOWN' to align with backend DocumentType Enum
      const normalizedDocType = documentType === 'OTHER' ? 'UNKNOWN' : documentType;
      formData.append('document_type', normalizedDocType);
    }

    let response;
    try {
      response = await fetchWithTimeout(`${API_BASE_URLS.DOCUMENT}/documents`, {
        method: 'POST',
        // Do NOT set Content-Type — browser sets it with the multipart boundary
        body: formData,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Document upload timed out. Please try a smaller file or check your connection.');
      }
      if (err.name === 'TypeError') {
        throw new Error(
          'Connection failed: Please ensure Document Service backend is running on ' +
          `${API_BASE_URLS.DOCUMENT}.`
        );
      }
      throw err;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      let formattedMsg = errorText || response.statusText;
      try {
        const parsedErr = JSON.parse(errorText);
        if (parsedErr.detail) {
          formattedMsg = typeof parsedErr.detail === 'string'
            ? parsedErr.detail
            : Array.isArray(parsedErr.detail)
            ? parsedErr.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
            : JSON.stringify(parsedErr.detail);
        }
      } catch (_) {}
      throw new Error(`Document Service error (${response.status}): ${formattedMsg}`);
    }

    return await response.json();
  },
};
