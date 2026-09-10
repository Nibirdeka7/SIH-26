import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from './Modal.jsx';

export default function SettingsModal({ open, onClose }) {
  const { doctor } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [audioAlerts, setAudioAlerts] = useState(false);
  const [autoExpandAi, setAutoExpandAi] = useState(true);
  const [toastDuration, setToastDuration] = useState('5');
  const [savedMessage, setSavedMessage] = useState(false);

  if (!open) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onClose();
    }, 900);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ padding: '0.5rem 0' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: 'var(--text)' }}>
          Doctor Portal Settings
        </h3>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Profile Section */}
          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Dr. {doctor?.name || 'Practitioner'}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
              {doctor?.specialization || 'General Medicine'} • {doctor?.medicalRegistrationId ? `Reg: ${doctor.medicalRegistrationId}` : 'Verified OPD Physician'}
            </div>
          </div>

          {/* Notification Preferences */}
          <div>
            <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.92rem', color: 'var(--primary)' }}>
              Notifications & Alerts
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                />
                Show popup alert near sidebar on new notifications
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={audioAlerts}
                  onChange={(e) => setAudioAlerts(e.target.checked)}
                />
                Play soft chime on critical patient summary ready
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                <span style={{ color: 'var(--text)' }}>Toast popup display duration:</span>
                <select
                  value={toastDuration}
                  onChange={(e) => setToastDuration(e.target.value)}
                  style={{ padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                >
                  <option value="4">4 Seconds</option>
                  <option value="5">5 Seconds (Default)</option>
                  <option value="6">6 Seconds</option>
                </select>
              </div>
            </div>
          </div>

          {/* Consultation Workflow Preferences */}
          <div>
            <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.92rem', color: 'var(--primary)' }}>
              Clinical Workflow
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoExpandAi}
                  onChange={(e) => setAutoExpandAi(e.target.checked)}
                />
                Auto-focus AI summary review tab when opening patient chart
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            {savedMessage && (
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                ✓ Settings updated
              </span>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

