import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi'

export function Account() {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })

  return (
    <div className="p-1 bg-primary rounded-xl text-center flex gap-x-2">
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} />}
      {address && <div>{ensName ? `${ensName} (${address})` : `${address.slice(0,4)}...${address.slice(-3)}`}</div>}
      <button className="p-1 bg-background rounded-xl hover:bg-background/80" onClick={() => disconnect()}>Disconnect</button>
    </div>
  )
}