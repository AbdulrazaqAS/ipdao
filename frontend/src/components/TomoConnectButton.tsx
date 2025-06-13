import { useConnectModal } from '@tomo-inc/tomo-evm-kit';

const TomoConnectButton = () => {
  const { openConnectModal } = useConnectModal();

  return (
    <button onClick={openConnectModal}>
      Connect Wallet
    </button>
  );
};

export default TomoConnectButton;