// src/client/components/Dashboard.jsx
import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Placeholder fetch – replace with real endpoint
    fetch('/api/analytics/summary')
      .then(r => r.json())
      .then(d => setStats(d));
  }, []);

  return (
    <div>
      <h2>MMC Dashboard</h2>
      {stats ? (
        <pre>{JSON.stringify(stats, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
