import { useConnectModal, useAccountModal } from '@tomo-inc/tomo-evm-kit';
import { useAccount } from 'wagmi';

const TomoConnectButton = () => {
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { address, isConnected, isDisconnected, isConnecting } = useAccount();

  function handleClick() {
    if (isDisconnected) openConnectModal();
    else if (isConnected) openAccountModal();
  }

  return (
    // <button className="w-full bg-primary px-3 py-1 rounded border hover:cursor-pointer hover:bg-primary/85" onClick={handleClick}>
    //   {isDisconnected && "Connect Wallet"}
    //   {isConnected && address && `${address.slice(0,7)}...${address.slice(-4)}`}
    // </button>
    <div class="group w-full inline-block">
      <button class="relative w-full bg-primary px-5 py-2 rounded border hover:cursor-pointer hover:bg-primary/85"  onClick={handleClick}>
        <span class="block group-hover:hidden">
          {isDisconnected && "Connect Wallet"}
          {isConnected && address && `${address.slice(0,7)}...${address.slice(-4)}`}
          {isConnecting && "Connecting..."}
        </span>
        <span class="hidden group-hover:block">
          {isDisconnected && "Connect Wallet"}
          {isConnected && address && "Disconnect"}
          {isConnecting && "Connecting..."}
        </span>
      </button>
    </div>
  );
};

export default TomoConnectButton;