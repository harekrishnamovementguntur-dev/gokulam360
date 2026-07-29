'use client';

import { useState } from 'react';

export default function ParticipationFixturePage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createFixture = async () => {
    setLoading(true);
    setError('');
    try {
      const token = window.localStorage.getItem('g360_token');
      const response = await fetch('/api/dev-fixtures/membership-term-participation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: '{}',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create fixture');
      setResult(data);
    } catch (fixtureError) {
      setError(fixtureError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'system-ui' }}>
      <h1>PR16 Development Fixture</h1>
      <p>
        This unlinked page is available for preview verification only. It creates or reuses
        a complete Student → Active Membership → Program → Program Offering → Term chain.
      </p>
      <button type="button" onClick={createFixture} disabled={loading} style={{ padding: '0.7rem 1rem' }}>
        {loading ? 'Preparing fixture…' : 'Prepare Participation Fixture'}
      </button>
      {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
      {result && (
        <pre style={{ marginTop: '1.5rem', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
