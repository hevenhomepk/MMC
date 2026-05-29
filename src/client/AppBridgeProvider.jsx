// src/client/AppBridgeProvider.jsx
import React from 'react';
import { Provider } from '@shopify/app-bridge-react';
import { Context } from '@shopify/app-bridge';

export default function AppBridgeProvider({ children }) {
  const config = {
    apiKey: process.env.REACT_APP_SHOPIFY_API_KEY,
    shopOrigin: new URLSearchParams(window.location.search).get('shop'),
    forceRedirect: true
  };
  return <Provider config={config}>{children}</Provider>;
}
