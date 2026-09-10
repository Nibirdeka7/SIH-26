/**
 * Web Audio Utility for playing Base64 encoded audio from TTS backend
 */

let currentAudio = null;

export const audioUtils = {
  /**
   * Play base64 encoded audio track (e.g. from gTTS or audio generator)
   */
  playBase64Audio(base64String) {
    return new Promise((resolve, reject) => {
      try {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }

        if (!base64String) {
          resolve();
          return;
        }

        const mimeType = base64String.startsWith('SUQz') || base64String.startsWith('/+MY') ? 'audio/mp3' : 'audio/wav';
        const audioSrc = `data:${mimeType};base64,${base64String}`;
        currentAudio = new Audio(audioSrc);

        currentAudio.onended = () => {
          currentAudio = null;
          resolve();
        };

        currentAudio.onerror = (err) => {
          console.warn('Audio playback error:', err);
          currentAudio = null;
          resolve(); // Resolve so workflow isn't blocked
        };

        currentAudio.play().catch((err) => {
          console.warn('Auto-play blocked or failed:', err);
          resolve();
        });
      } catch (e) {
        console.error('Audio initialization error:', e);
        resolve();
      }
    });
  },

  /**
   * Stop currently playing audio
   */
  stopAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  },

  /**
   * Web Speech API Fallback TTS for browser synthesis
   */
  speakBrowserText(text, langCode = 'hi-IN') {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
};
