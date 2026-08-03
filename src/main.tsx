import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "./styles/form.css"; // legacy form/button utilities still used by a few screens
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import { FinanceDataProvider } from './hooks/useFinanceData';
import { SystemSettingsProvider } from './hooks/useSystemSettings';
import { UserDocProvider } from './hooks/useUserDoc';
import { QueryClientProvider } from '@tanstack/react-query';
import { portfolioQueryClient } from './features/portfolio/hooks/queryClient';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SystemSettingsProvider>
        <UserDocProvider>
          <ThemeProvider>
            <FinanceDataProvider>
              <QueryClientProvider client={portfolioQueryClient}>
                <App />
              </QueryClientProvider>
            </FinanceDataProvider>
          </ThemeProvider>
        </UserDocProvider>
      </SystemSettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
