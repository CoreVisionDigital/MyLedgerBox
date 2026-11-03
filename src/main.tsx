import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function mount() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    try {
      createRoot(rootElement).render(<App />);
    } catch (err) {
      console.error('Fatal initialization error:', err);
      rootElement.innerHTML = `
        <div style="min-height:100vh;background:#0f172a;color:#ffffff;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center;">
          <div style="background:#ffffff;color:#0f172a;padding:32px;border-radius:20px;max-width:440px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
            <div style="width:48px;height:48px;background:#ecfdf5;color:#059669;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-weight:900;font-size:20px;">MLB</div>
            <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;">MyLedgerBox Financial Engine</h2>
            <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.5;">Click below to reload and restore session data.</p>
            <button onclick="window.location.reload()" style="background:#059669;color:#ffffff;border:none;padding:10px 20px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;">Reload Application</button>
          </div>
        </div>
      `;
    }
  } else {
    console.error('Fatal: #root element not found in DOM.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
