import { http, createConfig } from 'wagmi'
import { storyAeneid } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

const projectId = '<WALLETCONNECT_PROJECT_ID>'

export const config = createConfig({
  chains: [storyAeneid],
  connectors: [
    // injected(),
    metaMask(),
  ],
  transports: {
    [storyAeneid.id]: http(),
  },
})