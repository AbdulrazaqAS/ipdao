import * as React from 'react'
import { useConnect } from 'wagmi'

export function WalletOptions() {
  const { connectors, connect } = useConnect()

  return connectors.map((connector) => (
    <button
      className="bg-primary text-background px-4 py-2 rounded-md hover:bg-accent transition"
      key={connector.uid}
      onClick={() => connect({ connector })}
    >
      Connect {connector.name}
    </button>
  ))
}