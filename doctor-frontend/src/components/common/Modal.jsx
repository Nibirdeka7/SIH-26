import React from 'react';
export default function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="panel" style={{ maxWidth: 520, width: '90%' }}>
        <button className="btn-secondary" style={{ float: 'right' }} onClick={onClose}>Close</button>
        {children}
      </div>
    </div>
  );
}
