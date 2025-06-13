import { http, createConfig } from 'wagmi'
import { storyAeneid } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

export const config = createConfig({
  chains: [storyAeneid],
  connectors: [
    metaMask(),
  ],
  transports: {
    [storyAeneid.id]: http(),
  },
  batch: {
    multicall: true, // TODO: Add batchsize limit to avoid exceeding provider limits
  }
})
