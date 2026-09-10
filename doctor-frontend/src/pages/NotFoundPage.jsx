import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <h2>Page not found</h2>
      <Link to="/">Back to dashboard</Link>
    </div>
  );
}
