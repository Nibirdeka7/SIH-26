import React from 'react';
import { AlertOctagon, PhoneCall, ArrowRight, ShieldAlert, HeartHandshake } from 'lucide-react';

export default function CriticalAlertModal({ isOpen, redFlags = [], onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="emergency-panel">
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid var(--danger-500)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <AlertOctagon size={36} color="var(--danger-500)" />
        </div>

        <h2 style={{ color: '#fca5a5', fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>
          CRITICAL MEDICAL EMERGENCY DETECTED
        </h2>

        <p style={{ color: '#e2e8f0', fontSize: '1.05rem', marginBottom: '20px', lineHeight: '1.6' }}>
          Your reported symptoms contain critical red-flag emergency criteria. Please proceed directly to the <strong>Emergency Room (ER - Bay 1)</strong> without waiting in the normal OPD line.
        </p>

        {/* Detected Red Flags List */}
        {redFlags.length > 0 && (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px dashed var(--danger-500)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '24px',
            }}
          >
            <h4 style={{ color: '#f87171', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '8px' }}>
              Detected Critical Criteria:
            </h4>
            <ul style={{ paddingLeft: '20px', color: '#fecaca', fontSize: '0.95rem' }}>
              {redFlags.map((flag, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          <button
            className="btn-danger"
            style={{ padding: '14px 28px', fontSize: '1.05rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            onClick={() => alert('Emergency alert sent to ER Nursing desk!')}
          >
            <PhoneCall size={20} />
            <span>Notify Duty Doctor & Nurse Now</span>
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border-glass)',
              color: '#ffffff',
              padding: '14px 24px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600',
            }}
          >
            I am with Medical Staff (Continue Intake)
          </button>
        </div>
      </div>
    </div>
  );
}
