// src/client/components/LandingPage.jsx
import React, { useState, useCallback } from 'react';
import { Tabs, Card } from '@shopify/polaris';

const tabs = [
  { id: 'dashboard', content: 'Dashboard' },
  { id: 'addBooking', content: 'Add Booking' },
  { id: 'courierLogs', content: 'Courier Logs' },
  { id: 'loadsheet', content: 'Loadsheet' },
  { id: 'return', content: 'Return' },
  { id: 'analytics', content: 'Analytics' },
  { id: 'modules', content: 'Modules' },
  { id: 'courierSettings', content: 'Courier Settings' },
  { id: 'shipperSettings', content: 'Shipper Settings' },
  { id: 'plans', content: 'Plans' },
  { id: 'guides', content: 'Guides' }
];

export default function LandingPage() {
  const [selected, setSelected] = useState(0);
  const handleTabChange = useCallback((selectedIndex) => setSelected(selectedIndex), []);

  const renderContent = () => {
    const tabId = tabs[selected].id;
    return (
      <Card sectioned title={tabs[selected].content}>
        <p>{`Content for ${tabs[selected].content} goes here.`}</p>
      </Card>
    );
  };

  return (
    <div style={{margin: '20px'}}>
      <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} />
      {renderContent()}
    </div>
  );
}
