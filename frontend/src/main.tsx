import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { TomoEVMKitProvider } from '@tomo-inc/tomo-evm-kit';
//import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from './utils/tomoconfig'

import '@tomo-inc/tomo-evm-kit/styles.css';
//import '@rainbow-me/rainbowkit/styles.css';

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