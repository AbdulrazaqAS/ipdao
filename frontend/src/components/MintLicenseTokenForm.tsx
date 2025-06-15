import { useEffect, useState, type FormEvent } from 'react'
import { custom, formatEther, parseEther, zeroAddress, type Address } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';
import { handleError, handleSuccess } from '../utils/utils';
import { StoryClient } from '@story-protocol/core-sdk';
import { getTokenSymbol } from '../scripts/getters';

const inputsClass = "w-full px-4 py-2 rounded-lg bg-background border border-muted placeholder-muted";

interface Props {
    assetId: Address;
    mintingFee: number;
    revShare: number;
    mintingFeeToken?: Address;
    licenseTermsId: string;
    setShowLicenseMintForm: Function;
}

export default function MintLicenseTokenForm({ assetId, mintingFee, mintingFeeToken, revShare, licenseTermsId, setShowLicenseMintForm }: Props) {
    const [mintAmount, setMintAmount] = useState(1);
    const [maxMintFee, setMaxMintFee] = useState(formatEther(BigInt(mintingFee)));
    const [maxRevShare, setMaxRevShare] = useState((revShare / (10 ** 6)).toString());  // Convert to percentage (assuming revShare is in basis points, e.g., 10000 = 100%)
    const [isLoading, setIsLoading] = useState(false);
    const [feeTokenSymbol, setFeeTokenSymbol] = useState<string>("");

    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!walletClient) {
            handleError(new Error("Please connect your wallet"));
            return;
        }

        try {
            setIsLoading(true);
            const storyClient = StoryClient.newClient({
                wallet: walletClient,
                transport: custom(walletClient.transport),
                chainId: walletClient!.chain.id.toString() as "1315" | "1514",
            })

            const response = await storyClient.license.mintLicenseTokens({
                licenseTermsId: licenseTermsId,
                licensorIpId: assetId,
                amount: mintAmount,
                maxMintingFee: parseEther(maxMintFee),
                maxRevenueShare: maxRevShare,
                txOptions: { waitForTransaction: true },
            })

            handleSuccess("License minted successfully!");
            console.log('License minted:', {
                'Transaction Hash': response.txHash,
                'License Token IDs': response.licenseTokenIds,
            })
            setShowLicenseMintForm(false);
        } catch (error) {
            console.error("Error minting license:", error);
            handleError(error as Error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!mintingFeeToken || mintingFeeToken === zeroAddress) return;
        getTokenSymbol(mintingFeeToken, publicClient!).then(setFeeTokenSymbol).catch(console.error);
    }, [mintingFeeToken, publicClient]);

    useEffect(() => {
        setMaxMintFee(formatEther(BigInt(mintingFee * mintAmount)));
    }, [mintAmount]);

    return (
        <form onSubmit={handleSubmit} className="bg-surface text-text rounded-2xl shadow-lg space-y-6">
            <div className="bg-background rounded-lg p-4">
                <div className="mt-4 space-y-2">
                    <div><label>Amount to mint:<input type="number" placeholder="Amount to mint" value={mintAmount} min={1} onChange={(e) => setMintAmount(Number(e.target.value))} className={inputsClass} required /></label></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <label>Max Minting Fee:<input type="number" placeholder="Max Minting Fee" value={maxMintFee} min={0} step={0.000001} onChange={(e) => setMaxMintFee(e.target.value)} className={inputsClass} required /></label>
                        <label>Max Revenue Share (%):<input type="number" placeholder="Max Revenue Share" min="0" max="100" value={maxRevShare} onChange={(e) => setMaxRevShare(e.target.value)} className={inputsClass} required /></label>
                    </div>
                    <div className="space-y-1">
                        {mintingFeeToken && mintingFeeToken !== zeroAddress && <p className="text-muted text-sm break-all">Fee Token: {feeTokenSymbol} {mintingFeeToken}</p>}
                        <p className="text-muted text-sm">Note: Max Minting Fee and Max Revenue Share should be those specified in the license (or greater). They are used to protect you from fluctuations in the minting fee and revenue share. If the actual values (while minting) are higher than the max values, the transaction will fail.</p>
                    </div>
                </div>
            </div>

            <div className='flex space-x-4'>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-primary text-background font-semibold py-2 px-6 rounded-lg w-full hover:opacity-80 transition disabled:cursor-not-allowed"
                >
                    Mint
                    {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
                </button>
                <button
                    type="button"
                    onClick={() => setShowLicenseMintForm(false)}
                    className="bg-secondary text-background font-semibold py-2 px-6 rounded-lg w-full hover:opacity-80 transition"
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}
