import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content is available. Refresh now?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
});

async function subscribeToPush() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        console.log('No user found, skipping push subscription');
        return;
      }
      const userData = JSON.parse(storedUser);
      const token = userData?.token;
      if (!token) {
        console.log('No token found, skipping push subscription');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/vapid-public-key`);
      if (!res.ok) {
        throw new Error(`Failed to fetch VAPID public key: ${res.statusText}`);
      }
      const { publicKey } = await res.json();
      if (!publicKey) {
        throw new Error('VAPID public key is missing in response');
      }
      const convertedKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
      await fetch(`${import.meta.env.VITE_API_URL}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
        credentials: 'include',
      });
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  }
}

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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', subscribeToPush);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);