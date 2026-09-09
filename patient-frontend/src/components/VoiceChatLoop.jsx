import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { audioUtils } from '../utils/audio_player';

export default function VoiceChatLoop({
  messages,
  onSendMessage,
  isListening,
  onToggleListening,
  isProcessing,
  currentAudioBase64,
  currentLanguage,
}) {
  const [textInput, setTextInput] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Handle auto-playing TTS when new audio base64 is received
  useEffect(() => {
    if (currentAudioBase64) {
      setIsPlayingAudio(true);
      audioUtils.playBase64Audio(currentAudioBase64).then(() => {
        setIsPlayingAudio(false);
      });
    }
  }, [currentAudioBase64]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    onSendMessage(textInput.trim());
    setTextInput('');
  };

  const handlePlayDoctorVoice = (msg) => {
    if (msg.audioBase64) {
      setIsPlayingAudio(true);
      audioUtils.playBase64Audio(msg.audioBase64).then(() => setIsPlayingAudio(false));
    } else {
      audioUtils.speakBrowserText(msg.text, currentLanguage === 'hi' ? 'hi-IN' : 'en-US');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.2)', border: '1px solid var(--cyan-500)' }}>
            <Bot size={20} color="var(--cyan-500)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem' }}>Dynamic Intake Doctor</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SOCRATES & AYUSH Clinical Assessment</p>
          </div>
        </div>

        {/* Audio Visualizer Bar */}
        {(isListening || isPlayingAudio || isProcessing) && (
          <div className="audio-visualizer-bars">
            <div className="audio-bar"></div>
            <div className="audio-bar"></div>
            <div className="audio-bar"></div>
            <div className="audio-bar"></div>
            <div className="audio-bar"></div>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          maxHeight: '420px',
        }}
      >
        {messages.map((msg, index) => {
          const isBot = msg.sender === 'bot' || msg.role === 'assistant';
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '10px',
                alignSelf: isBot ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
              }}
            >
              {isBot && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary-500), var(--cyan-500))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={16} color="#ffffff" />
                </div>
              )}

              <div
                style={{
                  background: isBot
                    ? 'rgba(30, 41, 59, 0.85)'
                    : 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                  border: isBot ? '1px solid var(--border-glass)' : 'none',
                  borderRadius: isBot ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                  padding: '12px 16px',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                  boxShadow: 'var(--shadow-lg)',
                  position: 'relative',
                }}
              >
                <p>{msg.text}</p>

                {/* Re-play audio button for bot responses */}
                {isBot && (
                  <button
                    onClick={() => handlePlayDoctorVoice(msg)}
                    style={{
                      marginTop: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: 'var(--cyan-500)',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Volume2 size={12} /> Listen Voice
                  </button>
                )}
              </div>

              {!isBot && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--purple-500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={16} color="#ffffff" />
                </div>
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>AI Doctor is analyzing symptoms & formulating clinical query...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Controls */}
      <form onSubmit={handleSend} style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        {/* Mic Toggle Button */}
        <div style={{ position: 'relative' }}>
          {isListening && <div className="mic-ripple-ring" />}
          <button
            type="button"
            onClick={onToggleListening}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: isListening ? 'var(--danger-500)' : 'rgba(16, 185, 129, 0.15)',
              border: isListening ? '2px solid #ffffff' : '1px solid var(--primary-500)',
              color: isListening ? '#ffffff' : 'var(--primary-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isListening ? 'Stop Mic' : 'Speak Voice Input'}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>

        {/* Text Field Input */}
        <input
          type="text"
          placeholder={isListening ? 'Listening to your voice...' : 'Describe symptoms or answer doctor...'}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={isProcessing}
          style={{ flex: 1, height: '46px' }}
        />

        {/* Submit Send Button */}
        <button
          type="submit"
          className="btn-primary"
          disabled={!textInput.trim() || isProcessing}
          style={{ height: '46px', padding: '0 18px' }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
