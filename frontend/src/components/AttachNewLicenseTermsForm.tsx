import { useEffect, useState } from "react";
import { registerLicenseTerms } from "../scripts/actions";
import { StoryClient, type LicenseTerms } from "@story-protocol/core-sdk";
import { getCommercialRemixTerms, getCommercialUseTerms, handleError, handleSuccess } from "../utils/utils";
import { usePublicClient, useWalletClient } from "wagmi";
import IPAManagerABI from '../assets/abis/IPAManagerABI.json'
import type { ProposalArgs } from "../utils/utils";
import { propose } from "../scripts/actions";
import { getProposalsCount, getProposalThreshold, getUserVotingPower } from "../scripts/getters";
import { encodeFunctionData, type Address, parseEther, custom } from "viem";

const IPA_MANAGER_ADDRESS: Address = import.meta.env.VITE_IPA_MANAGER!;

const licenseTermsTypeFields = {
    NonCommercial: {},
    CommercialUse: {
        currency: "",
        defaultMintingFee: "",
        royaltyPolicy: "",
    },
    CommercialRemix: {
        currency: "",
        defaultMintingFee: "",
        royaltyPolicy: "",
        commercialRevShare: "",
    },
    Custom: {
        transferable: false,
        royaltyPolicy: "",
        defaultMintingFee: "",
        expiration: "",
        commercialUse: false,
        commercialAttribution: false,
        commercializerChecker: "",
        commercializerCheckerData: "0x",
        commercialRevShare: "",
        commercialRevCeiling: "",
        derivativesAllowed: false,
        derivativesAttribution: false,
        derivativesApproval: false,
        derivativesReciprocal: false,
        derivativeRevCeiling: "",
        currency: "",
        uri: "", // TODO: find/create a URI for custom licenses
    }
};

type LicenseTermsType = keyof typeof licenseTermsTypeFields;
const licenses: LicenseTermsType[] = ['NonCommercial', 'CommercialUse', 'CommercialRemix', 'Custom'];
const ROYALTY_POLICY_LAP: string = import.meta.env.VITE_ROYALTY_POLICY_LAP!;
const ROYALTY_POLICY_LRP: string = import.meta.env.VITE_ROYALTY_POLICY_LRP!;

interface Props {
    assetId: Address;
    setShowNewLicenseForm: Function;
}

// TODO: Add input checks before submitting
export default function AttachNewLicenseTermsForm({ assetId, setShowNewLicenseForm }: Props) {
    const [licenseType, setLicenseType] = useState<LicenseTermsType>("NonCommercial");
    const [licenseRegistered, setLicenseRegistered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [licenseTermsId, setLicenseTermsId] = useState<bigint>();
    const [userVotingPower, setUserVotingPower] = useState(0n);
    const [proposalThreshold, setProposalThreshold] = useState(0n);

    const [formData, setFormData] = useState<any>({});

    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const changeLicenseTermsType = (type: LicenseTermsType) => {
        setLicenseType(type);
        setFormData({ ...licenseTermsTypeFields[type] });
    };

    const handleRegisterLicenseTerms = async () => {
        let licenseTerms: LicenseTerms;

        if (formData.commercialRevShare < 0 || formData.commercialRevShare > 100) {
            handleError(new Error("Commercial revenue share must be between 0 and 100"));
            return;
        }

        if (licenseType === "NonCommercial") {
            handleSuccess("Non Commercial terms already registered with Id 1");
            setLicenseRegistered(true);
            setLicenseTermsId(1n);
            return;
        } else if (licenseType === "CommercialUse") licenseTerms = getCommercialUseTerms(
            formData.royaltyPolicy,
            formData.defaultMintingFee,
            formData.currency
        )
        else if (licenseType === "CommercialRemix") licenseTerms = getCommercialRemixTerms(
            formData.royaltyPolicy,
            formData.defaultMintingFee,
            formData.commercialRevShare,
            formData.currency,
        );
        else licenseTerms = {
            ...formData,
            defaultMintingFee: parseEther(formData.defaultMintingFee),
            commercialRevShare: Number(formData.commercialRevShare),
        };  // Custom license terms

        console.log("Submitting license terms:", {
            licenseType,
            ...licenseTerms,
        });

        try {
            setIsLoading(true);
            const storyClient = StoryClient.newClient({
                wallet: walletClient!,
                transport: custom(walletClient!.transport),
                chainId: walletClient!.chain.id.toString() as "1315" | "1514",
            })
            console.log("ChainId", walletClient!.chain.id.toString());
            const licenseTermsId = await registerLicenseTerms(licenseTerms, storyClient);

            console.log("License terms registered successfully. ID: ", licenseTermsId);
            setLicenseRegistered(true);
            setLicenseTermsId(licenseTermsId);
            handleSuccess("License terms registered successfully!");
        } catch (error) {
            handleError(error as Error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleProposeAttachLicenseTerms = async () => {
        try {
            setIsLoading(true);
            const targets = [IPA_MANAGER_ADDRESS];
            const values = [0n];
            const calldatas = [encodeFunctionData({
                abi: IPAManagerABI,
                functionName: "attachLicenseTerms",
                args: [assetId, licenseTermsId!]
            })];

            const proposalIndex = await getProposalsCount(publicClient!);
            // Added # for splitting the value when in use
            const description = proposalIndex!.toString() + "#" + `Proposal to attach license terms with ID ${licenseTermsId} to asset with ID ${assetId}`;

            const proposalArgs: ProposalArgs = {
                targets,
                values,
                calldatas,
                description
            };

            console.log("Proposing to attach license terms with args:", proposalArgs);
            const txHash = await propose(proposalArgs, walletClient!);

            publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
                if (txReceipt.status === "reverted") handleError(new Error("License attachment proposal reverted"));
                else {
                    handleSuccess("License attachment proposal submitted successfully!");
                    setShowNewLicenseForm(false);
                }
            });
        } catch (error) {
            handleError(error as Error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!walletClient) {
            handleError(new Error("Please connect your wallet to create a proposal"));
            return;
        }

        if (userVotingPower < proposalThreshold) {
            handleError(new Error(`No enough voting power to create a proposal`));
            return;
        }

        if (!licenseRegistered) {
            handleRegisterLicenseTerms();
        } else {
            handleProposeAttachLicenseTerms();
        }
    }

    useEffect(() => {
        getProposalThreshold(publicClient!).then(setProposalThreshold).catch(console.error);
    }, []);

    useEffect(() => {
        if (!walletClient) return;
        getUserVotingPower(walletClient.account.address, publicClient!).then(setUserVotingPower).catch(console.error);
    }, [walletClient]);

    return (
        <div className="mx-auto p-6 bg-surface text-text rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Attach New License</h2>

            <div className="flex flex-wrap gap-3 mb-4">
                {licenses.map(type => (
                    <button
                        key={type}
                        onClick={() => changeLicenseTermsType(type)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${licenseType === type ? 'bg-primary text-white border-transparent' : 'bg-transparent border-muted text-muted hover:border-primary hover:text-primary'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {licenseType === "NonCommercial" ? (
                <>
                    <p className="text-muted">Non-commercial licenses do not require additional inputs.</p>
                    <div className="sm:col-span-2 md:col-span-3 flex justify-end mt-4">
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="bg-primary text-white px-6 py-2 rounded hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {licenseRegistered ? "Propose Attach License" : "Register License"}
                            {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
                        </button>
                    </div>
                </>
            ) : (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {licenseType === "Custom" && (
                        <>
                            <label>
                                Transferable:
                                <input type="checkbox" name="transferable" checked={formData.transferable} onChange={handleChange} className="ml-2" />
                            </label>
                            <label>
                                Commercial Attribution:
                                <input type="checkbox" name="commercialAttribution" checked={formData.commercialAttribution} onChange={handleChange} className="ml-2" />
                            </label>
                            <label>
                                Commercial Use:
                                <input type="checkbox" name="commercialUse" checked={formData.commercialUse} onChange={handleChange} className="ml-2" />
                            </label>
                            <label>
                                Derivatives Allowed:
                                <input type="checkbox" name="derivativesAllowed" checked={formData.derivativesAllowed} onChange={handleChange} className="ml-2" />
                            </label>
                            <label>
                                Derivatives Attribution:
                                <input type="checkbox" name="derivativesAttribution" checked={formData.derivativesAttribution} onChange={handleChange} className="ml-2" />
                            </label>
                            <label>
                                Derivatives Approval:
                                <input type="checkbox" name="derivativesApproval" checked={formData.derivativesApproval} onChange={handleChange} className="ml-2" />
                            </label>
                            <label>
                                Derivatives Reciprocal:
                                <input type="checkbox" name="derivativesReciprocal" checked={formData.derivativesReciprocal} onChange={handleChange} className="ml-2" />
                            </label>

                            <label>
                                Expiration:
                                <input required type="text" name="expiration" value={formData.expiration} onChange={handleChange} className="input bg-surface border p-2 rounded w-full" />
                            </label>
                            <label>
                                Commercializer Checker:
                                <input required type="text" name="commercializerChecker" value={formData.commercializerChecker} onChange={handleChange} className="input bg-surface border p-2 rounded w-full" />
                            </label>
                            <label>
                                Commercial Revenue Ceiling:
                                <input required type="text" name="commercialRevCeiling" value={formData.commercialRevCeiling} onChange={handleChange} className="input bg-surface border p-2 rounded w-full" />
                            </label>
                            <label>
                                Derivatives Revenue Ceiling:
                                <input required type="text" name="derivativeRevCeiling" value={formData.derivativeRevCeiling} onChange={handleChange} className="input bg-surface border p-2 rounded w-full" />
                            </label>
                        </>
                    )}

                    <>
                        {formData.currency !== undefined && (
                            <label>
                                Currency:
                                <input required type="text" name="currency" value={formData.currency} onChange={handleChange} className="input bg-surface border p-2 rounded w-full" />
                            </label>
                        )}
                        {formData.defaultMintingFee !== undefined && (
                            <label>
                                Default Minting Fee:
                                <input required type="text" name="defaultMintingFee" value={formData.defaultMintingFee} onChange={handleChange} className="input bg-surface border p-2 rounded w-full" />
                            </label>
                        )}
                        {formData.commercialRevShare !== undefined && (
                            <label>
                                Commercial Rev Share (%):
                                <input required type="number" name="commercialRevShare" min="0" max="100" value={formData.commercialRevShare} onChange={handleChange} className="input bg-surface border p-2 rounded w-full" />
                            </label>
                        )}
                        {formData.royaltyPolicy !== undefined && (
                            <div className="flex flex-col">
                                <p className="mb-2">Royalty Policy</p>
                                <label>
                                    <input required type="radio" name="royaltyPolicy" value={ROYALTY_POLICY_LRP} onChange={handleChange} className="mr-3" />
                                    Liquid Relative Percentage (LRP)
                                </label>
                                <label>
                                    <input required type="radio" name="royaltyPolicy" value={ROYALTY_POLICY_LAP} onChange={handleChange} className="mr-3" />
                                    Liquid Absolute Percentage (LAP)
                                </label>
                            </div>
                        )}
                    </>

                    <div className="sm:col-span-2 md:col-span-3 flex justify-end mt-4">
                        <button
                            type="submit"
                            className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/80 transition disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {licenseRegistered ? "Propose Attach License" : "Register License"}
                            {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
