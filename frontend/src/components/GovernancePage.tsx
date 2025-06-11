import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { handleError, handleSuccess, type AssetMetadata, type ProposalArgs } from '../utils/utils';
import { usePublicClient, useWalletClient } from 'wagmi';
import { getAssetsIds, getAssetsMetadata, fetchMetadata, getAssetAPIMetadata, getAssetLicenseTerms } from '../scripts/asset';
import type { AssetInitialMetadata } from './AssetsPage';
import { getGovernanceTokenHolders, getProposalsCount, getProposalThreshold, getUserDelegate, getUsersVotingPower, getUserVotingPower } from '../scripts/proposal';
import { encodeFunctionData, formatEther, type Address } from 'viem';
import { delegateVote, propose } from '../scripts/action';
import IPAManagerABI from '../assets/abis/IPAManagerABI.json'

const IPA_MANAGER_ADDRESS: Address = import.meta.env.VITE_IPA_MANAGER;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>("");

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
        "#Proposal to transfer with:\n" +
        `- ID: ${selectedAsset.id}\n` +
        `- To: ${assetTransferRecipient}\n`

      const proposalArgs: ProposalArgs = {
        targets,
        values,
        calldatas,
        description
      };

      console.log("Proposing to transfer asset with args:", proposalArgs);
      const txHash = await propose(proposalArgs, walletClient!);

      publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
        if (txReceipt.status === "reverted") console.error("Proposal reverted");
        else console.log("Proposal mined")
      });

      handleSuccess("Proposal to transfer asset submitted successfully!");
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
    
    if (publicClient?.chain.id === 1315)
      getGovernanceTokenHolders("aeneid").then(holders => {
        const descendingHolders = holders.sort((a, b) => +formatEther(BigInt(b.value)) - +formatEther(BigInt(a.value)));
        setTokenHolders(descendingHolders);
      }).catch(console.error);
    else if (publicClient?.chain.id === 1514)
      getGovernanceTokenHolders("mainnet").then(holders => {
        const descendingHolders = holders.sort((a, b) => +formatEther(BigInt(b.value)) - +formatEther(BigInt(a.value)));
        setTokenHolders(descendingHolders);
      }).catch(console.error);
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

  const ipAssets = [
    {
      name: 'AI Anime Series',
      tokens: [
        { symbol: 'IPT1', amount: '12.4 USDC' },
        { symbol: 'IPT2', amount: '5.7 USDC' },
      ],
    },
    {
      name: 'Pixel Punk World',
      tokens: [
        { symbol: 'PPT1', amount: '8.9 USDC' },
      ],
    },
  ];

  const daoTokens = [
    { symbol: 'USDC', amount: '1,200.50' },
    { symbol: 'DAI', amount: '980.00' },
  ];


  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text mb-6">Governance</h1>

      <Section title="Transfer Assets">
        {assets.length === 0 && <p className="text-muted">No assets available for transfer</p>}
        {assets.length > 0 && (
          <form onSubmit={handleProposeTransferAsset} className="space-y-4">
            {assets.map((asset) => (
              <div key={asset.id} className="mb-3">
                <label>
                  <input type='radio' name='transferAsset' value={asset.id} onChange={() => setSelectedAsset(asset)} className='mr-2'/>
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

      <Section title="Claim Revenue">
        {ipAssets.map((asset) => (
          <div key={asset.name} className="mb-4">
            <details className="rounded bg-muted/10 p-3">
              <summary className="font-semibold cursor-pointer text-text">{asset.name}</summary>
              <ul className="mt-3 space-y-2">
                {asset.tokens.map((token) => (
                  <li
                    key={token.symbol}
                    className="flex items-center justify-between bg-muted/5 px-3 py-2 rounded"
                  >
                    <span className="text-sm">{token.symbol}: {token.amount}</span>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-xs rounded bg-primary text-white">Claim</button>
                      <button className="px-3 py-1 text-xs rounded bg-secondary text-white">Claim for DAO</button>
                    </div>
                  </li>
                ))}
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

      <Section title="Token Holders">
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

      <Section title="DAO Balance">
        <ul className="space-y-2">
          {daoTokens.map((token) => (
            <li
              key={token.symbol}
              className="flex justify-between bg-muted/10 px-4 py-2 rounded text-sm"
            >
              <span>{token.symbol}</span>
              <span>{token.amount}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
};
