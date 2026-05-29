// src/client/index.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import TcsAccountList from './components/TcsAccountList';
import PostExAccountList from './components/PostExAccountList';
import BookingWorkbench from './components/BookingWorkbench';
import CourierManager from './components/CourierManager';
import CourierHistory from './components/CourierHistory';
import CourierLogs from './components/CourierLogs';
import LoadsheetScanner from './components/LoadsheetScanner';
import LoadsheetLogs from './components/LoadsheetLogs';
import ReturnScanner from './components/ReturnScanner';
import ReturnSheets from './components/ReturnSheets';
import ReturnPending from './components/ReturnPending';
import ReturnReceived from './components/ReturnReceived';
import CourierPerformance from './components/CourierPerformance';
import CourierReport from './components/CourierReport';
import CourierCalendar from './components/CourierCalendar';
import ShipperSettings from './components/ShipperSettings';

function App() {
  const [route, setRoute] = useState(window.location.hash || '#dashboard');
  const shop = new URLSearchParams(window.location.search).get('shop') || 'test-store.myshopify.com';

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isSettings = route === '#tcs';
  const isPostEx = route === '#postex';
  const isBookings = route === '#bookings';
  const isCourierManager = route === '#courier-settings';
  const isHistoryTcs = route === '#history-tcs';
  const isHistoryPostex = route === '#history-postex';
  const isLogs = route.startsWith('#logs');
  const isLoadsheetScanner = route === '#loadsheet-scanner';
  const isLoadsheetLogs = route.startsWith('#loadsheet-logs');
  const isReturnAdd = route === '#return-add';
  const isReturnSheets = route === '#return-sheets';
  const isReturnPending = route === '#return-pending';
  const isReturnReceived = route === '#return-received';
  const isAnalyticsPerformance = route === '#analytics-performance';
  const isAnalyticsReport = route === '#analytics-report';
  const isAnalyticsCalendar = route === '#analytics-calendar';
  const isShipperSettings = route === '#shipper';
  const courierFilter = route === '#logs-tcs' ? 'TCS' : route === '#logs-postex' ? 'PostEx' : null;
  const loadsheetCourierFilter = route === '#loadsheet-logs-tcs' ? 'TCS' : route === '#loadsheet-logs-postex' ? 'PostEx' : null;

  useEffect(() => {
    // Hide or show all static sections based on the route
    const staticIds = ['dashboard', 'credits', 'couriers', 'modules', 'plans'];
    const anyReactRoute = isSettings || isPostEx || isBookings || isCourierManager || isHistoryTcs || isHistoryPostex || isLogs || isLoadsheetScanner || isLoadsheetLogs || isReturnAdd || isReturnSheets || isReturnPending || isReturnReceived || isAnalyticsPerformance || isAnalyticsReport || isAnalyticsCalendar || isShipperSettings;
    
    staticIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = anyReactRoute ? 'none' : '';
    });

    // Also update active link in nav
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      const isLogsLink = href === '#logs' && isLogs;
      link.classList.toggle('active', href === route || isLogsLink);
    });

    if (anyReactRoute) {
      window.scrollTo(0, 0);
    }
  }, [route, isSettings, isPostEx, isBookings, isCourierManager, isHistoryTcs, isHistoryPostex, isLogs, isLoadsheetScanner, isLoadsheetLogs, isReturnAdd, isReturnSheets, isReturnPending, isReturnReceived, isAnalyticsPerformance, isAnalyticsReport, isAnalyticsCalendar, isShipperSettings]);

  if (!isSettings && !isPostEx && !isBookings && !isCourierManager && !isHistoryTcs && !isHistoryPostex && !isLogs && !isLoadsheetScanner && !isLoadsheetLogs && !isReturnAdd && !isReturnSheets && !isReturnPending && !isReturnReceived && !isAnalyticsPerformance && !isAnalyticsReport && !isAnalyticsCalendar && !isShipperSettings) {
    return null;
  }

  return (
    <div style={{ padding: '20px', minHeight: '80vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => window.location.hash = '#dashboard'}
          style={{ padding: '10px 20px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}
        >
          ← Dashboard
        </button>
        {(isHistoryTcs || isHistoryPostex) && (
          <button 
            onClick={() => window.location.hash = '#courier-settings'}
            style={{ padding: '10px 20px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}
          >
            ← Courier List
          </button>
        )}
      </div>
      
      {isSettings && <TcsAccountList shop={shop} />}
      {isPostEx && <PostExAccountList shop={shop} />}
      {isBookings && <BookingWorkbench shop={shop} />}
      {isHistoryTcs && <CourierHistory shop={shop} courierId="tcs" />}
      {isHistoryPostex && <CourierHistory shop={shop} courierId="postex" />}
      {isLogs && <CourierLogs shop={shop} courierFilter={courierFilter} />}
      {isLoadsheetScanner && <LoadsheetScanner shop={shop} />}
      {isLoadsheetLogs && <LoadsheetLogs shop={shop} courierFilter={loadsheetCourierFilter} />}
      {isReturnAdd && <ReturnScanner shop={shop} />}
      {isReturnSheets && <ReturnSheets shop={shop} />}
      {isReturnPending && <ReturnPending shop={shop} />}
      {isReturnReceived && <ReturnReceived shop={shop} />}
      {isAnalyticsPerformance && <CourierPerformance shop={shop} />}
      {isAnalyticsReport && <CourierReport shop={shop} />}
      {isAnalyticsCalendar && <CourierCalendar shop={shop} />}
      {isShipperSettings && <ShipperSettings shop={shop} />}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
