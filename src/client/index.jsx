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
  const [shop, setShop] = useState(() => {
    const urlShop = new URLSearchParams(window.location.search).get('shop');
    if (urlShop) {
      localStorage.setItem('shopify_shop', urlShop);
      return urlShop;
    }
    const savedShop = localStorage.getItem('shopify_shop');
    return savedShop && savedShop !== 'test-store.myshopify.com' ? savedShop : '';
  });

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

  if (!shop) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #e2e8f0)', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: 'var(--text, #0f172a)' }}>🔌 Connect Shopify Store</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted, #64748b)', margin: '0 0 24px 0' }}>Enter your Shopify store domain to load and sync orders.</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const inputShop = e.target.elements.shopDomain.value.trim();
            if (inputShop) {
              const formattedShop = inputShop.includes('.') ? inputShop : `${inputShop}.myshopify.com`;
              localStorage.setItem('shopify_shop', formattedShop);
              setShop(formattedShop);
              window.location.search = `?shop=${formattedShop}`;
            }
          }}>
            <input 
              name="shopDomain"
              type="text" 
              placeholder="store-name.myshopify.com" 
              required
              style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', fontSize: '14px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box', background: 'var(--surface, #fff)', color: 'var(--text, #0f172a)' }}
            />
            <button 
              type="submit"
              style={{ width: '100%', height: '44px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
            >
              Connect Store
            </button>
          </form>
        </div>
      </div>
    );
  }

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
