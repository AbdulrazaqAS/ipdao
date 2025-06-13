import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { handleError, handleSuccess, type AssetMetadata, type ProposalArgs } from '../utils/utils';
import { usePublicClient, useWalletClient } from 'wagmi';
import type { AssetInitialMetadata } from './AssetsPage';
import { getAssetsIds, getAssetsMetadata, fetchMetadata, getAssetAPIMetadata, getAddressERC20s, getAddressNFTs, getAssetsVaultsAddresses, getAssetsVaultsTokens, getClaimableRevenue, getGovernanceTokenHolders, getProposalsCount, getProposalThreshold, getTokenName, getTokenSymbol, getUserDelegate, getUsersVotingPower, getUserVotingPower, getRoyaltyTokenBalance } from '../scripts/getters';
import { custom, encodeFunctionData, formatEther, type Address, zeroAddress } from 'viem';
import { claimIPRevenue, delegateVote, propose } from '../scripts/actions';
import IPAManagerABI from '../assets/abis/IPAManagerABI.json'
import { StoryClient } from '@story-protocol/core-sdk';
import DaoContractsList from './DaoContractsList';

const IPA_MANAGER_ADDRESS: Address = import.meta.env.VITE_IPA_MANAGER;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  // const [selectedAsset, setSelectedAsset] = useState<string>("");

  return (
    <div className="rounded-xl bg-surface p-4 mb-4 transition-all">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {open ? (
          <ChevronUp className="text-muted" />
        ) : (
          <ChevronDown className="text-muted" />
        )}
      </div>
      {open && <div className="mt-3 text-text text-sm">{children}</div>}
    </div>
  );
};

export default function GovernancePage() {
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetMetadata>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userVotingPower, setUserVotingPower] = useState(0n);
  const [proposalThreshold, setProposalThreshold] = useState(0n);
  const [assetTransferRecipient, setAssetTransferRecipient] = useState<string>("");
  const [delegateTo, setDelegateTo] = useState('');
  const [currentDelegate, setCurrentDelegate] = useState<string>();
  const [tokenHolders, setTokenHolders] = useState<{ address: string; value: string }[]>([]);
  const [votingPowers, setVotingPowers] = useState<bigint[]>([]);
  const [assetsTokens, setAssetsTokens] = useState<{ address: String; symbol: string; daoAmount: string; userAmount: bigint | undefined; name: string }[][]>([[]]);
  const [daoERC20Tokens, setDaoERC20Tokens] = useState<{ value: string; address: string; name: string; symbol: string, decimals: string }[]>([]);
  const [daoERC721Tokens, setDaoERC721Tokens] = useState<{ value: string; address: string; name: string; symbol: string }[]>([]);
  const [royaltyTransfer, setRoyaltyTransfer] = useState<{ recipient: string; amount: string }[]>([{ recipient: "", amount: "" }]);
  const [ipAccountsRoyaltyTokens, setIpAccountsRoyaltyTokens] = useState<Array<bigint | undefined>>([]);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  async function getAssetNFTMetadata(assetId: Address) {
    const assetApiMetadata = await getAssetAPIMetadata(assetId, publicClient!.chain.id);
    return assetApiMetadata.nftMetadata;
  }

  async function handleProposeTransferAsset(event: React.FormEvent) {
    event.preventDefault();

    if (!walletClient) {
      handleError(new Error("Please connect your wallet to create a proposal"));
      return;
    }

    if (userVotingPower < proposalThreshold) {
      handleError(new Error(`No enough voting power to create a proposal`));
      return;
    }

    if (!selectedAsset) {
      handleError(new Error("Please select an asset to transfer"));
      return;
    }

    try {
      setIsLoading(true);
      const assetNftMetadata = await getAssetNFTMetadata(selectedAsset!.id);
      const nftContract = assetNftMetadata.tokenContract;
      const nftTokenId = assetNftMetadata.tokenId;

      const targets = [IPA_MANAGER_ADDRESS];
      const values = [0n];
      const calldatas = [encodeFunctionData({
        abi: IPAManagerABI,
        functionName: "transferAsset",
        args: [selectedAsset.id, nftContract, assetTransferRecipient, nftTokenId]
      })];

      const proposalIndex = await getProposalsCount(publicClient!);
      // Added # for splitting the value when in use
      const description = proposalIndex!.toString() +
        "#Proposal to transfer asset with:\n" +
        `- ID: ${selectedAsset.id}\n` +
        `- To: ${assetTransferRecipient}\n`

      const proposalArgs: ProposalArgs = {
        targets,
        values,
        calldatas,
        description
      };

      const txHash = await propose(proposalArgs, walletClient!);

      publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
        if (txReceipt.status === "reverted") handleError(new Error("Proposal to transfer asset reverted"));
        else {
          handleSuccess("Proposal to transfer asset submitted successfully!");
        }
      });

    } catch (error) {
      console.error("Error proposing to transfer asset:", error);
      handleError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProposeTransferRoyalTokens(event: React.FormEvent) {
    event.preventDefault();

    if (!walletClient) {
      handleError(new Error("Please connect your wallet to create a proposal"));
      return;
    }

    if (userVotingPower < proposalThreshold) {
      handleError(new Error(`No enough voting power to create a proposal`));
      return;
    }

    if (!selectedAsset) {
      handleError(new Error("Please select an asset to transfer its royalty tokens"));
      return;
    }

    try {
      setIsLoading(true);
      const recipients = royaltyTransfer.map(transfer => transfer.recipient);
      const amounts = royaltyTransfer.map(transfer => BigInt(+transfer.amount * 10 ** 6));
      const totalAmount = amounts.reduce((acc, amount) => acc + amount, 0n);
      const availableTokens = ipAccountsRoyaltyTokens[assets.findIndex(asset => asset.id === selectedAsset.id)];
      if (!availableTokens) {
        handleError(new Error("No available royalty tokens for this asset"));
        return;
      }
      if (totalAmount > availableTokens) {
        handleError(new Error("Total amount of royalty transfers exceeded available tokens"));
        return;
      }

      const targets = [IPA_MANAGER_ADDRESS];
      const values = [0n];
      const calldatas = [encodeFunctionData({
        abi: IPAManagerABI,
        functionName: "transferRoyaltyTokens",
        args: [selectedAsset.id, recipients, amounts]
      })];

      const proposalIndex = await getProposalsCount(publicClient!);
      // Added # for splitting the value when in use
      const description = proposalIndex!.toString() +
        "#Proposal to transfer royalty tokens of asset with:\n" +
        `- ID: ${selectedAsset.id}\n` +
        `- To: ${recipients.join(", ")}\n` +
        `- Amounts: ${amounts.join(", ")}\n`

      const proposalArgs: ProposalArgs = {
        targets,
        values,
        calldatas,
        description
      };

      const txHash = await propose(proposalArgs, walletClient!);
      publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
        if (txReceipt.status === "reverted") handleError(new Error("Proposal to transfer royalty tokens reverted"));
        else {
          handleSuccess("Proposal to transfer royalty tokens submitted successfully!");
          setRoyaltyTransfer([{ recipient: "", amount: "" }]); // Reset the transfers
        }
      });

    } catch (error) {
      console.error("Error proposing to transfer asset:", error);
      handleError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelegateVotes() {
    if (!walletClient) {
      handleError(new Error("Please connect your wallet to delegate votes"));
      return;
    }

    if (!delegateTo) {
      handleError(new Error("Please enter a valid address to delegate votes"));
      return;
    }

    try {
      setIsLoading(true);
      const txHash = await delegateVote(delegateTo as `0x${string}`, walletClient);
      publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
        if (txReceipt.status === "reverted") console.error("Failed to delegate votes");
        else {
          handleSuccess("Votes delegated successfully!");
          setDelegateTo('');
          // Refresh delegated to address
        }
      });
    } catch (error) {
      console.error("Error delegating votes:", error);
      handleError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClaimRevenue(assetId: Address, token: Address, claimer: Address, amount: bigint | undefined) {
    if (!assetId || !token || !claimer) {
      handleError(new Error("Invalid asset ID, token or claimer address"));
      return;
    }

    if (!walletClient) {
      handleError(new Error("Please connect your wallet to claim revenue"));
      return;
    }

    if (!amount || amount <= 0n){
      handleError(new Error("Amount must be greater than zero"));
      return;
    }

    try {
      setIsLoading(true);
      const storyClient = StoryClient.newClient({
        wallet: walletClient,
        transport: custom(walletClient!.transport),
        chainId: publicClient!.chain.id.toString() as "1315" | "1514",
      });

      await claimIPRevenue(storyClient, claimer, assetId, [token]);
    } catch (error) {
      console.error("Error claiming revenue:", error);
      handleError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function fetchAssets() {
      try {
        const assetIds = await getAssetsIds(publicClient!);
        const assetsCoreMetadata = await getAssetsMetadata(assetIds, publicClient!);

        const assetsData = await Promise.all(
          assetsCoreMetadata.map((data) => fetchMetadata(data.metadataURI))
        ) as AssetInitialMetadata[];

        const assets: AssetMetadata[] = assetsData.map((data, i) => {
          return {
            ...data,
            id: assetIds[i],
            registrationDate: assetsCoreMetadata[i].registrationDate,
            owner: assetsCoreMetadata[i].owner,
            nftTokenURI: assetsCoreMetadata[i].nftTokenURI,
          }
        });

        setAssets(assets);
      } catch (error) {
        console.error("Error fetching assets:", error);
      }
    }

    fetchAssets();
    getProposalThreshold(publicClient!).then(setProposalThreshold).catch(console.error);

    let chainName: "aeneid" | "mainnet";
    if (publicClient?.chain.id === 1315) chainName = "aeneid";
    else if (publicClient?.chain.id === 1514) chainName = "mainnet";
    else {
      console.error("Unsupported chain ID:", publicClient?.chain.id);
      handleError(new Error("Unsupported chain ID. Please switch to Story - Aeneid or Mainnet."));
      return;
    }

    getGovernanceTokenHolders(chainName).then(holders => {
      const descendingHolders = holders.sort((a, b) => +formatEther(BigInt(b.value)) - +formatEther(BigInt(a.value)));
      setTokenHolders(descendingHolders);
    }).catch(console.error);

    getAddressERC20s(IPA_MANAGER_ADDRESS, chainName).then(setDaoERC20Tokens).catch(console.error);
    getAddressNFTs(IPA_MANAGER_ADDRESS, chainName).then(setDaoERC721Tokens).catch(console.error);
  }, []);

  useEffect(() => {
    if (!tokenHolders || tokenHolders.length === 0) return;
    getUsersVotingPower(tokenHolders.map(holder => holder.address as Address), publicClient!).then(setVotingPowers).catch(console.error);
  }, [tokenHolders]);

  useEffect(() => {
    if (!walletClient) return;

    getUserVotingPower(walletClient.account.address, publicClient!).then(setUserVotingPower).catch(console.error);
    getUserDelegate(walletClient.account.address, publicClient!).then(setCurrentDelegate).catch(console.error);
  }, [walletClient]);

  useEffect(() => {
    if (assets.length === 0) return;

    async function fetchAssetsTokens() {
      const storyClient = StoryClient.newClient({
        account: "0xDaaE14a470e36796ADf9c75766D3d8ADD0a3D94c",  // just an address
        transport: custom(publicClient!.transport),
        chainId: publicClient!.chain.id.toString() as "1315" | "1514",
      })

      const vaultsAddresses = await getAssetsVaultsAddresses(assets.map(asset => asset.id), storyClient);
      const vaultsTokens = await getAssetsVaultsTokens(vaultsAddresses, publicClient!);
      const vaultsTokensBalance = await Promise.all(
        vaultsTokens.map((vault, i) => {
          return Promise.all(
            vault.map(async (token) => {
              const daoClaimable = await getClaimableRevenue(storyClient, IPA_MANAGER_ADDRESS, assets[i].id, token);
              let userClaimable: bigint | undefined = undefined;
              if (walletClient) userClaimable = await getClaimableRevenue(storyClient, walletClient.account.address, assets[i].id, token);
              return { daoClaimable, userClaimable };
            })
          );
        })
      );
      const formattedVaultsTokens = await Promise.all(vaultsTokens.map((vault, i) => {
        return Promise.all(vault.map(async (token, j) => {
          return {
            address: token,
            name: await getTokenName(token, publicClient!),
            symbol: await getTokenSymbol(token, publicClient!),
            daoAmount: formatEther(BigInt(vaultsTokensBalance[i][j].daoClaimable ?? "0")),
            userAmount: vaultsTokensBalance[i][j].userClaimable,
          };
        }));
      }));
      setAssetsTokens(formattedVaultsTokens);
    }
    fetchAssetsTokens().catch(console.error);
  }, [walletClient, assets]);  // refetch when walletClient or assets change

  useEffect(() => {
    if (assets.length === 0) return;

    async function fetchIPAccountsRoyaltyTokens() {
      const storyClient = StoryClient.newClient({
        account: "0xDaaE14a470e36796ADf9c75766D3d8ADD0a3D94c",  // just an address
        transport: custom(publicClient!.transport),
        chainId: publicClient!.chain.id.toString() as "1315" | "1514",
      })

      const vaultsAddresses = await getAssetsVaultsAddresses(assets.map(asset => asset.id), storyClient);
      const balances = await Promise.all(
        vaultsAddresses.map((vault, i) => {
          if (vault === zeroAddress) return Promise.resolve(undefined);
          else return getRoyaltyTokenBalance(vault, assets[i].id, publicClient!)
        })
      );
      setIpAccountsRoyaltyTokens(balances);
    }

    fetchIPAccountsRoyaltyTokens();
  }, [assets]);

  return (
    <div className="mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text mb-6">Governance</h1>

      <Section title="Transfer Assets">
        {assets.length === 0 && <p className="text-muted">No assets available for transfer</p>}
        {assets.length > 0 && (
          <form onSubmit={handleProposeTransferAsset} className="space-y-4">
            {assets.map((asset) => (
              <div key={asset.id} className="mb-3">
                <label>
                  <input type='radio' name='transferAsset' value={asset.id} onChange={() => setSelectedAsset(asset)} className='mr-2' />
                  {asset.title} - <span className="text-muted">{asset.id.slice(0, 6)}...{asset.id.slice(-6)}</span>
                </label>
              </div>
            ))}
            <div>
              <input
                type="text"
                value={assetTransferRecipient}
                minLength={42}
                maxLength={42}
                pattern="^0x[a-fA-F0-9]{40}$"
                onChange={(e) => setAssetTransferRecipient(e.target.value)}
                placeholder="0xRecipientAddress"
                className="w-full rounded px-3 py-2 border bg-background text-sm text-text border-muted focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary text-white px-3 py-2 rounded hover:bg-primary/90 disabled:cursor-not-allowed"
            >
              Propose Transfer
              {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
            </button>
          </form>
        )}
      </Section>

      <Section title="Transfer Royalty Tokens">
        {assets.length === 0 && <p className="text-muted">No assets available</p>}
        {assets.length > 0 && (
          <form onSubmit={handleProposeTransferRoyalTokens} className="space-y-4">
            {assets.map((asset) => (
              <div key={asset.id} className="mb-3">
                <label>
                  <input type='radio' name='royaltyTransferAsset' value={asset.id} onChange={() => setSelectedAsset(asset)} className='mr-2' />
                  {asset.title} - <span className="text-muted">{asset.id.slice(0, 6)}...{asset.id.slice(-6)}</span>
                </label>
              </div>
            ))}
            <div>
              {selectedAsset && (
                <p>
                  Available Royalty Tokens:{" "}
                  {ipAccountsRoyaltyTokens[assets.findIndex(asset => asset.id === selectedAsset.id)] ?? "Vault not initiated"}{" "}
                  {ipAccountsRoyaltyTokens[assets.findIndex(asset => asset.id === selectedAsset.id)] !== undefined ?
                    `(${ipAccountsRoyaltyTokens[assets.findIndex(asset => asset.id === selectedAsset.id)]! / 10n ** 6n}%)`
                    :
                    ""
                  }
                </p>
              )}
              {royaltyTransfer.map((transfer, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={transfer.recipient}
                    minLength={42}
                    maxLength={42}
                    pattern="^0x[a-fA-F0-9]{40}$"
                    onChange={(e) => {
                      const newTransfers = [...royaltyTransfer];
                      newTransfers[index].recipient = e.target.value;
                      setRoyaltyTransfer(newTransfers);
                    }}
                    placeholder="0xRecipientAddress"
                    className="w-full rounded px-3 py-2 border bg-background text-sm text-text border-muted focus:outline-none"
                    required
                  />
                  <input
                    type="number"
                    value={transfer.amount}
                    min={0}
                    max={100}
                    step={0.0000001}
                    onChange={(e) => {
                      const newTransfers = [...royaltyTransfer];
                      newTransfers[index].amount = e.target.value;
                      setRoyaltyTransfer(newTransfers);
                    }}
                    placeholder="Amount % (0-100)"
                    className="w-full rounded px-3 py-2 border bg-background text-sm text-text border-muted focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setRoyaltyTransfer(prev => prev.filter((_, i) => i !== index))}
                    className="bg-danger text-white px-3 py-2 rounded hover:bg-danger/90 hover:cursor-pointer"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>

            <div className='flex items-center gap-2'>
              <button
                type="button"
                onClick={() => setRoyaltyTransfer([...royaltyTransfer, { recipient: "", amount: "" }])}
                className="bg-secondary text-white px-3 py-2 rounded hover:bg-secondary/90 hover:bg-secondary/90 hover:cursor-pointer"
              >
                Add Transfer
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-white px-3 py-2 rounded hover:bg-primary/90 disabled:cursor-not-allowed hover:bg-primary/90 hover:cursor-pointer"
              >
                Propose Transfer
                {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
              </button>
            </div>
          </form>
        )}
      </Section>

      <Section title="Claim Revenue">
        {assets.map((asset, index) => (
          <div key={index} className="mb-4">
            <details className="rounded bg-muted/10 p-3">
              <summary className="font-semibold cursor-pointer text-text">
                {asset.title} - <span className="text-muted">{asset.id.slice(0, 6)}...{asset.id.slice(-6)}</span>
              </summary>
              <ul className="mt-3 space-y-2">
                {assetsTokens[index]?.map((token) => (
                  <div key={token.symbol} className="space-y-2">
                    {token.userAmount !== undefined && (
                      <li
                        className="flex items-center justify-between bg-muted/5 px-3 py-2 rounded"
                      >
                        <span className="text-sm">{token.name} ({token.symbol}): {formatEther(BigInt(token.userAmount))}</span>
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1 text-xs rounded bg-primary text-white hover:bg-primary/90 hover:cursor-pointer"
                            onClick={() => handleClaimRevenue(asset.id, token.address as Address, walletClient!.account.address, token.userAmount)}
                          >
                            Claim
                          </button>
                        </div>
                      </li>
                    )}
                    <li
                      className="flex items-center justify-between bg-muted/5 px-3 py-2 rounded"
                    >
                      <span className="text-sm">{token.name} ({token.symbol}): {token.daoAmount}</span>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 text-xs rounded bg-secondary text-white hover:bg-secondary/90 hover:cursor-pointer"
                          onClick={() => handleClaimRevenue(asset.id, token.address as Address, IPA_MANAGER_ADDRESS, token.daoAmount)}
                        >
                          Claim for DAO
                        </button>
                      </div>
                    </li>
                  </div>
                ))}
                {assetsTokens[index]?.length === 0 && (
                  <li className="text-sm text-muted">No tokens available for this asset</li>
                )}
              </ul>
            </details>
          </div>
        ))}
      </Section>

      <Section title="Delegate Votes">
        <div className="space-y-2">
          <div className="text-sm">Current Delegate: <span className="font-mono text-muted">{currentDelegate || "Wallet not connected"}</span></div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={delegateTo}
              minLength={42}
              maxLength={42}
              pattern="^0x[a-fA-F0-9]{40}$"
              onChange={(e) => setDelegateTo(e.target.value)}
              placeholder="0xDelegateAddress"
              className="w-full rounded px-3 py-2 border bg-background text-sm text-text border-muted focus:outline-none"
            />
            <button onClick={handleDelegateVotes} className="px-4 py-2 bg-primary text-white text-sm rounded">Delegate</button>
            {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
          </div>
        </div>
      </Section>

      <Section title="Governance Tokens Holders">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="text-muted border-b border-muted/20">
                <th className="py-2 px-2">Address</th>
                <th className="py-2 px-2">Amount</th>
                <th className="py-2 px-2">Voting Power</th>
              </tr>
            </thead>
            <tbody>
              {tokenHolders.map((holder, idx) => (
                <tr key={idx} className="border-b border-muted/10">
                  <td className="py-2 px-2 font-mono">{holder.address}</td>
                  <td className="py-2 px-2">{formatEther(BigInt(holder.value))}</td>
                  <td className="py-2 px-2">{formatEther(BigInt(votingPowers[idx] ?? "0"))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="DAO Tokens (ERC-20)">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="text-muted border-b border-muted/20">
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">Symbol</th>
                <th className="py-2 px-2">Address</th>
                <th className="py-2 px-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {daoERC20Tokens.map((token, idx) => (
                <tr key={idx} className="border-b border-muted/10">
                  <td className="py-2 px-2 font-mono">{token.name}</td>
                  <td className="py-2 px-2">{token.symbol}</td>
                  {/* <td className="py-2 px-2">{token.address.slice(0, 6)}...{token.address.slice(-4)}</td> */}
                  <td className="py-2 px-2">{token.address}</td>
                  <td className="py-2 px-2">{formatEther(BigInt(token.value))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="DAO Tokens (ERC-721)">
        <p className='text-muted'>These are the NFTs owned by the IP Assets Manager (DAO). Not all might have been registered/added as IP assets</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="text-muted border-b border-muted/20">
                <th className="py-2 px-2">Name</th>
                <th className="py-2 px-2">Symbol</th>
                <th className="py-2 px-2">Address</th>
                <th className="py-2 px-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {daoERC721Tokens.map((token, idx) => (
                <tr key={idx} className="border-b border-muted/10">
                  <td className="py-2 px-2 font-mono">{token.name}</td>
                  <td className="py-2 px-2">{token.symbol}</td>
                  {/* <td className="py-2 px-2">{token.address.slice(0, 6)}...{token.address.slice(-4)}</td> */}
                  <td className="py-2 px-2">{token.address}</td>
                  <td className="py-2 px-2">{token.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </Section>

      <Section title="DAO Contracts">
        <DaoContractsList />
      </Section>
    </div>
  );
};
