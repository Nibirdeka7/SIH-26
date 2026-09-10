import React, { useState } from 'react';
import { patientApi } from '../../api/patientApi';
import { formatDateTime } from '../../utils/dateFormat';

// Saves the current visit as "checked-in" with a server-generated
// timestamp so the record can't be backdated from the client.
export default function CheckInButton({ patientId, checkedInAt, onChecked }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const { data } = await patientApi.checkIn(patientId, { note: note || undefined });
      onChecked?.(data);
    } finally {
      setLoading(false);
    }
  };

  if (checkedInAt) {
    return (
      <div className="badge badge-checked-in" style={{ padding: '0.5rem 1rem' }}>
        Checked-in at {formatDateTime(checkedInAt)}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <input
        placeholder="Optional visit note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border)' }}
      />
      <button className="btn-primary" onClick={handleCheckIn} disabled={loading}>
        {loading ? 'Saving…' : 'Mark as Checked-in'}
      </button>
    </div>
  );
}
