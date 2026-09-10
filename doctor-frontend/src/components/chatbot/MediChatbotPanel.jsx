import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { mediChatbotService } from '../../services/mediChatbotService';
import { DUMMY_CHECKED_IN_HISTORY } from '../../data/dummyPatients';
import './MediChatbotPanel.css';

// const DEFAULT_SUGGESTIONS = [
//   'Drug interactions with Metformin',
//   'Differential diagnosis for acute chest pain',
//   'First-line antibiotics for Strep Pharyngitis',
//   'Blood pressure targets in Diabetic Nephropathy',
// ];

export default function MediChatbotPanel({ isOpen, onClose }) {
  const location = useLocation();

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
      text: `Hello, Doctor.\n\nI'm your clinical assistant. You can ask me about:\n- **Pharmacology:** Drug interactions, contraindications, dosages\n- **Symptoms:** Differential diagnosis and red flags\n- **Patient Records:** Lab reports, clinical findings, and triage guidance`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

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
          text: `Unable to generate a response right now (${err.message}). Please check your network connection and try again.`,
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
        text: `Conversation cleared. Ready for your clinical queries or patient record questions.`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
      },
    ]);
  };

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
      <div
        className="medi-chatbot-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`medi-chatbot-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Medi Clinical Assistant"
      >
        <header className="medi-chat-header">
          <div className="medi-chat-header-info">
            <div className="medi-chat-avatar" aria-hidden="true">
              M
            </div>
            <div>
              <h2 className="medi-chat-title">Medi Clinical Assistant</h2>
              <span className="medi-chat-subtitle">Decision-support co-pilot</span>
            </div>
          </div>

          <div className="medi-chat-header-actions">
            <button
              type="button"
              className="medi-chat-text-btn"
              onClick={handleClearChat}
              title="Clear conversation"
              aria-label="Clear chat"
            >
              Clear
            </button>
            <button
              type="button"
              className="medi-chat-icon-btn"
              onClick={onClose}
              title="Close assistant"
              aria-label="Close assistant"
            >
              &times;
            </button>
          </div>
        </header>

        <div className="medi-chat-context-bar">
          <span>Context:</span>
          {currentPatient ? (
            <span className="medi-chat-context-chip" title={`Patient: ${currentPatient.name}`}>
              {currentPatient.name} ({currentPatient.reason})
            </span>
          ) : (
            <span>General Clinical &amp; Pharmacology</span>
          )}
        </div>

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

          {isThinking && (
            <div className="medi-msg medi-msg-assistant">
              <div className="medi-typing-indicator" aria-label="Assistant is preparing a response">
                <span className="medi-typing-dot" />
                <span className="medi-typing-dot" />
                <span className="medi-typing-dot" />
                <span style={{ fontSize: '0.75rem', color: '#0f6e5c', marginLeft: '0.35rem', fontWeight: 500 }}>
                  Preparing response...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

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
                  Summarize {currentPatient.name}'s chart
                </button>
              )}
              {/* {DEFAULT_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  className="medi-prompt-pill"
                  onClick={() => handleSendMessage(sug)}
                >
                  {sug}
                </button>
              ))} */}
            </div>
          </div>
        )}

        <footer className="medi-chat-footer">
          <div className="medi-chat-input-row">
            <textarea
              ref={inputRef}
              className="medi-chat-input"
              rows={2}
              placeholder={
                currentPatient
                  ? `Ask about ${currentPatient.name}'s case, drugs, or symptoms...`
                  : 'Ask about medicine, symptom, dosage, or report...'
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
              title="Send message"
              aria-label="Send message"
            >
              Send
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