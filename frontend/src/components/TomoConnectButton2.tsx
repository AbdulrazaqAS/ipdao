import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useConnectModal, useAccountModal } from '@tomo-inc/tomo-evm-kit';
import { useAccount, useChains } from 'wagmi';
import { type TomoChain, type TomoAccount} from "../utils/utils";
import { useState, useEffect } from 'react';

export default function TomoConnectButton () {
  const [account, setTomoAccount] = useState<TomoAccount>();
  const [chain, setTomoChain] = useState<TomoChain>();
  const [mounted, setIsMounted] = useState(false);

  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { address, isConnected, isDisconnected } = useAccount();
  const [chain1] = useChains();
  
  const openChainModal = () => {};

  useEffect(() => {
    if (isDisconnected) {
      setTomoAccount(undefined);
      return;
    } else if (!isConnected) return;

    setTomoAccount({
      address: address,
      displayName: `${address.slice(0,7)}...${address.slice(-4)}`,
      hasPendingTransactions: false,  // TODO: Should be truthful
      // balanceDecimals?: string,
      // balanceFormatted?: string,
      // balanceSymbol?: string,
      // displayBalance?: string,
      // ensAvatar?: string,
      // ensName?: string,
    });
  }, [isConnected, isDisconnected, address]);

  useEffect(() => {
    if (!chain) {
      setTomoChain(undefined);
      return;
    }

    console.log(chain1);
    setTomoChain({
        id: chain1.id,
        hasIcon: false,
        name: chain1.name
        // iconUrl?: string
        // iconBackground?: string
        // unsupported?: boolean
    })
  }, [chain1]);

  useEffect(() => {
      setIsMounted(true);
      return () => setIsMounted(false);
  }, []);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const ready = mounted;
        const connected =
          ready &&
          account &&
          chain;
        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button onClick={openConnectModal} type="button">
                    Connect Wallet
                  </button>
                );
              }
              if (chain.unsupported) {
                return (
                  <button onClick={openChainModal} type="button">
                    Wrong network
                  </button>
                );
              }
              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={openChainModal}
                    style={{ display: 'flex', alignItems: 'center' }}
                    type="button"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>
                  <button onClick={openAccountModal} type="button">
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ''}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};