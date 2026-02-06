import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "./index.css";
import "./styles/auth.css";
import "./styles/form.css"; // your existing form css
import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { SettingsProvider } from './hooks/useSettings';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
    <ToastContainer
      position="bottom-right"
      autoClose={3000}
      hideProgressBar={true}
      newestOnTop={true}
      closeOnClick
      pauseOnHover
      draggable
      theme="colored"
      limit={3}
      transition={Slide}
      toastStyle={{ maxWidth: '360px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', padding: '12px 14px' }}
    />
  </StrictMode>,
)
