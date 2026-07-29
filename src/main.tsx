import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "./index.css";
import "./styles/auth.css";
import "./styles/form.css"; // your existing form css
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import { FinanceDataProvider } from './hooks/useFinanceData';
import { QueryClientProvider } from '@tanstack/react-query';
import { portfolioQueryClient } from './features/portfolio/hooks/queryClient';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <FinanceDataProvider>
          <QueryClientProvider client={portfolioQueryClient}>
            <App />
          </QueryClientProvider>
        </FinanceDataProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)
