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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserContext>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UserContext>
  </StrictMode>,
);