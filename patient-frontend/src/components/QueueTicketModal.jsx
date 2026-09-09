import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket, Clock, Building, Printer, CheckCircle, RotateCcw } from 'lucide-react';

export default function QueueTicketModal({ isOpen, ticketData, onNewSession }) {
  if (!isOpen || !ticketData) return null;

  const ticketNumber = ticketData.ticket_number || `OPD-${Math.floor(1000 + Math.random() * 9000)}`;
  const specialty = ticketData.specialty || ticketData.recommended_specialty || 'General OPD';
  const estimatedWait = ticketData.estimated_wait || '12 - 15 Mins';
  const roomNumber = ticketData.room || 'Room 102 (First Floor)';
  const qrPayload = JSON.stringify({
    ticket_id: ticketNumber,
    patient_id: ticketData.patient_id || 'P-8821',
    session_id: ticketData.session_id,
    specialty,
    priority: ticketData.priority || 'P3_ROUTINE',
    timestamp: new Date().toISOString(),
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div
        className="glass-panel"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '32px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(8, 12, 20, 0.98) 100%)',
          border: '1px solid var(--primary-500)',
          boxShadow: 'var(--shadow-glow)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <CheckCircle size={28} color="var(--primary-500)" />
        </div>

        <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>OPD Queue Ticket Generated</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Present this QR code at the doctor consulting room door
        </p>

        {/* Ticket Card View */}
        <div
          style={{
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', tracking: '1px' }}>
            Queue Token
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#059669', letterSpacing: '-1px', margin: '4px 0 12px 0' }}>
            {ticketNumber}
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px', marginBottom: '16px' }}>
            <QRCodeSVG value={qrPayload} size={150} level="H" />
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} color="#059669" />
              <span><strong>Department:</strong> {specialty}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#059669" />
              <span><strong>Est. Wait Time:</strong> {estimatedWait}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: '#ffffff',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Printer size={18} />
            <span>Print Ticket</span>
          </button>

          <button
            onClick={onNewSession}
            className="btn-primary"
            style={{ flex: 1, padding: '12px' }}
          >
            <RotateCcw size={18} />
            <span>Next Patient</span>
          </button>
        </div>
      </div>
    </div>
  );
}
