import React from 'react';
import { createRoot } from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import App from './app/App.tsx';
import './styles/index.css';

const msalConfig = {
  auth: {
    clientId: '17c05679-4464-4598-b402-189af45cc0b8',
    authority: 'https://login.microsoftonline.com/f82b0fb7-0101-410d-8e87-0efa7c1d3978',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>
);