
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global Fetch Interceptor to dynamically inject custom Gemini Keys to our service calls
if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: async function (input: RequestInfo | URL, init?: RequestInit) {
        const urlString = typeof input === 'string' ? input : (input && 'url' in (input as any)) ? (input as any).url : '';
        if (urlString.includes('/api/gemini')) {
          init = init || {};
          const headers = init.headers ? { ...(init.headers as any) } : {};
          const customKey = localStorage.getItem('multisphere_gemini_apikey');
          if (customKey && customKey.trim() !== '') {
            headers['X-Gemini-Key'] = customKey.trim();
          }
          init.headers = headers;
        }
        return originalFetch(input, init);
      }
    });
  } catch (error) {
    console.error("Fetch interceptor failed to mount safely:", error);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
