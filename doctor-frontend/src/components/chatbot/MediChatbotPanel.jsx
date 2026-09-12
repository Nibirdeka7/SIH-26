import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { mediChatbotService } from '../../services/mediChatbotService';
import { DUMMY_CHECKED_IN_HISTORY } from '../../data/dummyPatients';
import './MediChatbotPanel.css';

const DEFAULT_SUGGESTIONS = [
  'Drug interactions with Metformin',
  'Differential diagnosis for acute chest pain',
  'First-line antibiotics for Strep Pharyngitis',
  'Blood pressure targets in Diabetic Nephropathy',
];

export default function MediChatbotPanel({ isOpen, onClose }) {
  const location = useLocation();

  // Detect if doctor is currently reviewing a specific patient chart
  const patientMatch = location.pathname.match(/\/patient\/([^/]+)/);
  const currentPatientId = patientMatch ? patientMatch[1] : null;

  const currentPatient = currentPatientId
    ? DUMMY_CHECKED_IN_HISTORY.find((p) => p.id === currentPatientId) || {
        id: currentPatientId,
        name: `Patient ${currentPatientId}`,
      }
    : null;

  const [messages, setMessages] = useState([
    {
      id: 'm_welcome',
      sender: 'assistant',
      text: `Hello Doctor! 🩺 I am your clinical co-pilot powered by **Gemini Flash**.\n\nYou can ask me about:\n- **Pharmacology:** Drug interactions, contraindications, dosages\n- **Symptoms:** Differential diagnosis and red flags\n- **Patient Records:** Lab reports, clinical findings, and triage guidance`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(mediChatbotService.getApiKey());
  const [hasApiKey, setHasApiKey] = useState(Boolean(mediChatbotService.getApiKey()));

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, isOpen]);

  // Focus input when panel slides in
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    mediChatbotService.setApiKey(apiKeyInput);
    setHasApiKey(Boolean(apiKeyInput.trim()));
    setShowConfig(false);
  };

  const handleSendMessage = async (textToSend = inputText) => {
    const query = (textToSend || '').trim();
    if (!query || isThinking) return;

    const userMessage = {
      id: `usr_${Date.now()}`,
      sender: 'doctor',
      text: query,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsThinking(true);

    try {
      const patientContext = currentPatient
        ? {
            id: currentPatient.id,
            name: currentPatient.name,
            age: currentPatient.age,
            gender: currentPatient.gender,
            reason: currentPatient.reason,
          }
        : null;

      const res = await mediChatbotService.askChatbot({
        message: query,
        patientContext,
        chatHistory: messages,
      });

      const botMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Error generating clinical response: ${err.message}. Please verify your network or Gemini API key.`,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `m_welcome_${Date.now()}`,
        sender: 'assistant',
        text: `Conversation cleared. Ready for your clinical queries or patient record questions!`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
      },
    ]);
  };

  // Helper to render simple markdown formatting (headers, bold, lists) safely
  const renderFormattedText = (rawText) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx}>{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} style={{ marginLeft: '1rem', listStyleType: 'disc' }}>
            {parseBold(line.substring(2))}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={idx} style={{ marginLeft: '1.25rem', listStyleType: 'decimal' }}>
            {parseBold(line.replace(/^\d+\.\s/, ''))}
          </li>
        );
      }
      if (!line.trim()) {
        return <div key={idx} style={{ height: '0.45rem' }} />;
      }
      return <p key={idx} style={{ margin: '0.2rem 0' }}>{parseBold(line)}</p>;
    });
  };

  const parseBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="medi-chatbot-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Vertical Panel from Right */}
      <aside
        className={`medi-chatbot-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Medi AI Assistant"
      >
        {/* Header */}
        <header className="medi-chat-header">
          <div className="medi-chat-header-info">
            <div className="medi-chat-avatar" aria-hidden="true">
              🩺
            </div>
            <div>
              <h2 className="medi-chat-title">Medi AI Assistant</h2>
              <span className="medi-chat-model-tag" title="Powered by Google Gemini Flash">
                <span>⚡</span>
                <span>Gemini Flash {hasApiKey ? '(Active)' : '(Demo Mode)'}</span>
              </span>
            </div>
          </div>

          <div className="medi-chat-header-actions">
            <button
              type="button"
              className="medi-chat-icon-btn"
              onClick={() => setShowConfig((prev) => !prev)}
              title="Configure Gemini API Key"
              aria-label="Configure Gemini API Key"
            >
              🔑
            </button>
            <button
              type="button"
              className="medi-chat-icon-btn"
              onClick={handleClearChat}
              title="Clear conversation"
              aria-label="Clear chat"
            >
              🗑️
            </button>
            <button
              type="button"
              className="medi-chat-icon-btn"
              onClick={onClose}
              title="Close assistant"
              aria-label="Close assistant"
            >
              ✕
            </button>
          </div>
        </header>

        {/* API Key Configuration Dropdown */}
        {showConfig && (
          <form className="medi-chat-api-config" onSubmit={handleSaveApiKey}>
            <div style={{ fontWeight: 600, color: '#0f6e5c' }}>
              Google Gemini API Key
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.75rem' }}>
              Add your API key below to route queries directly to live Gemini Flash. Keys are preserved locally.
            </p>
            <div className="medi-chat-api-input-wrap">
              <input
                type="password"
                className="medi-chat-api-input"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                Save
              </button>
            </div>
          </form>
        )}

        {/* Current Context Bar */}
        <div className="medi-chat-context-bar">
          <span>Context:</span>
          {currentPatient ? (
            <span className="medi-chat-context-chip" title={`Patient: ${currentPatient.name}`}>
              👤 {currentPatient.name} ({currentPatient.reason})
            </span>
          ) : (
            <span>🌐 General Clinical & Pharmacology</span>
          )}
        </div>

        {/* Messages Stream */}
        <div className="medi-chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`medi-msg ${
                msg.sender === 'doctor' ? 'medi-msg-user' : 'medi-msg-assistant'
              }`}
            >
              <div className="medi-msg-bubble">
                {renderFormattedText(msg.text)}
              </div>
              <span className="medi-msg-time">{msg.timestamp}</span>
            </div>
          ))}

          {/* Typing Indicator */}
          {isThinking && (
            <div className="medi-msg medi-msg-assistant">
              <div className="medi-typing-indicator" aria-label="Gemini Flash is analyzing">
                <span className="medi-typing-dot" />
                <span className="medi-typing-dot" />
                <span className="medi-typing-dot" />
                <span style={{ fontSize: '0.75rem', color: '#0f6e5c', marginLeft: '0.35rem', fontWeight: 500 }}>
                  Gemini Flash analyzing...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts (when only welcome message is present or patient chart is active) */}
        {messages.length <= 2 && !isThinking && (
          <div style={{ padding: '0 1.15rem 0.5rem', background: '#fafbfc' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Suggested Inquiries:
            </div>
            <div className="medi-chat-prompts">
              {currentPatient && (
                <button
                  type="button"
                  className="medi-prompt-pill"
                  onClick={() => handleSendMessage(`Summarize clinical findings and suggest next steps for ${currentPatient.name}`)}
                >
                  📋 Summarize {currentPatient.name}'s chart
                </button>
              )}
              {DEFAULT_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  className="medi-prompt-pill"
                  onClick={() => handleSendMessage(sug)}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <footer className="medi-chat-footer">
          <div className="medi-chat-input-row">
            <textarea
              ref={inputRef}
              className="medi-chat-input"
              rows={1}
              placeholder={
                currentPatient
                  ? `Ask about ${currentPatient.name}'s case, drugs, or symptoms...`
                  : 'Ask about any medicine, symptom, dosage, or report...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isThinking}
            />
            <button
              type="button"
              className="medi-chat-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isThinking}
              title="Send to Medi AI"
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
          <p className="medi-chat-disclaimer">
            Medi AI is an assistive decision-support co-pilot for physicians.
          </p>
        </footer>
      </aside>
    </>
  );
}

