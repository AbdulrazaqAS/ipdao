import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'


const originalLog = console.log;

console.log = (...args) => {
  const logEntry = args
    .map(arg =>
      typeof arg === "object" && arg !== null
        ? JSON.stringify(arg, null, 2) // pretty JSON
        : String(arg)
    )
    .join(" ");

  const key = `log-${Date.now()}`;
  localStorage.setItem(key, logEntry);

  originalLog(...args); // still log to the real console if available
};

const originalError = console.error;

console.error = (...args) => {
  const logEntry = args
    .map(arg =>
      typeof arg === "object" && arg !== null
        ? JSON.stringify(arg, null, 2) // pretty JSON
        : String(arg)
    )
    .join(" ");

  const key = `log-${Date.now()}`;
  localStorage.setItem(key, logEntry);

  originalError(...args); // still log to the real console if available
};

import { TomoEVMKitProvider } from '@tomo-inc/tomo-evm-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from './utils/config'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <TomoEVMKitProvider>
          <App />
        </TomoEVMKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
)