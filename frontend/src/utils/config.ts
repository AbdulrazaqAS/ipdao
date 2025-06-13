import { getDefaultConfig } from '@tomo-inc/tomo-evm-kit';
import { storyAeneid } from 'wagmi/chains';
import { metaMaskWallet, rainbowWallet, walletConnectWallet } from '@tomo-inc/tomo-evm-kit/wallets';

export const config = getDefaultConfig({
  clientId: import.meta.env.VITE_TOMO_CLIENT_ID!,
  appName: 'CreatorDao',
  projectId: import.meta.env.VITE_CONNECTID!,
  chains: [storyAeneid],
  ssr: false, // If your dApp uses server-side rendering (SSR)
  wallets: [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet, 
        rainbowWallet, 
        walletConnectWallet, // Add other wallets if needed
      ],
    },
  ],
});
