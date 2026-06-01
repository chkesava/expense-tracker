import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "./index.css";
import "./styles/auth.css";
import "./styles/form.css"; // your existing form css
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)
