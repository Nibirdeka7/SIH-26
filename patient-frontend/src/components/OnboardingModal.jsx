import React, { useState } from 'react';
import { User, Calendar, Languages, Play, Sparkles } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../config/api_config';

export default function OnboardingModal({ isOpen, onStartSession }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('35');
  const [gender, setGender] = useState('male');
  const [language, setLanguage] = useState('hi');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onStartSession({
        name: name.trim() || 'Patient',
        age: parseInt(age, 10) || 30,
        gender,
        preferredLanguage: language,
        initialComplaint: chiefComplaint.trim(),
      });
    } catch (err) {
      console.error('Start session error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel" style={{ maxWidth: '540px', width: '100%', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary-500), var(--cyan-500))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
              marginBottom: '12px',
            }}
          >
            <Sparkles size={28} color="#ffffff" />
          </div>
          <h2>Welcome to Digital Clinical Intake</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            AI Assistant will ask tailored questions to evaluate your condition and prioritize your OPD visit.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Language Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
              <Languages size={14} style={{ marginRight: '6px', display: 'inline' }} />
              Preferred Language / भाषा चुनें
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ width: '100%' }}
              required
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} - {lang.englishName}
                </option>
              ))}
            </select>
          </div>

          {/* Patient Details Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
                <User size={14} style={{ marginRight: '6px', display: 'inline' }} />
                Full Name
              </label>
              <input
                type="text"
                placeholder="Optional / Anonymous"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
                <Calendar size={14} style={{ marginRight: '6px', display: 'inline' }} />
                Age
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Initial Chief Symptom */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
              What health problem brings you to the clinic today?
            </label>
            <textarea
              rows="3"
              placeholder="e.g., Severe chest discomfort radiating to arm, or 3 days of fever and throat pain..."
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              style={{ width: '100%', resize: 'none' }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '14px', marginTop: '8px', fontSize: '1rem' }}
          >
            {loading ? (
              <span>Starting Session...</span>
            ) : (
              <>
                <Play size={18} />
                <span>Begin Intake Assessment</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
