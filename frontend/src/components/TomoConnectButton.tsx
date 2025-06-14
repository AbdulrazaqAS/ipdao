import { useConnectModal, useAccountModal } from '@tomo-inc/tomo-evm-kit';
import { useAccount } from 'wagmi';

const TomoConnectButton = () => {
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { address, isConnected, isDisconnected } = useAccount();

  function handleClick() {
    if (isDisconnected) openConnectModal();
    else if (isConnected) openAccountModal();
  }

  return (
    <button className="w-full bg-primary px-3 py-1 rounded border" onClick={handleClick}>
      {isDisconnected && "Connect Wallet"}
      {isConnected && address && `${address.slice(0,7)}...${address.slice(-4)}`}
    </button>
  );
};

export default TomoConnectButton;