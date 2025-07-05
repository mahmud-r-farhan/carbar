import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import UserContext from './context/UserContext.jsx';
import { registerSW } from 'virtual:pwa-register';


const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content is available. Refresh now?')) {
      updateSW(true); // Trigger the update
    }
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
});

// Register push notification subscription
async function subscribeToPush() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // Get VAPID public key from backend
      const res = await fetch(`${import.meta.env.VITE_API_URL}/vapid-public-key`);
      const { publicKey } = await res.json();
      const convertedKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
      // Send subscription to backend
      await fetch(`${import.meta.env.VITE_API_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
        credentials: 'include',
      });
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  }
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Call subscribeToPush on load
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    subscribeToPush();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserContext>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UserContext>
  </StrictMode>,
);