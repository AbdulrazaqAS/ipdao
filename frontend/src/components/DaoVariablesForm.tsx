import React, { useState, useEffect } from "react";
import { usePublicClient, useWalletClient } from 'wagmi';
import { encodeFunctionData, type Address, parseEther } from "viem";
import { handleError, handleSuccess, type ProposalArgs } from '../utils/utils';
import { getProposalsCount, getProposalThreshold, getUserVotingPower } from '../scripts/getters';
import { propose } from '../scripts/actions';
import IPAGovernorABI from '../assets/abis/IPAGovernorABI.json';
import IPAManagerABI from '../assets/abis/IPAManagerABI.json';

const IPA_GOVERNOR_ADDRESS: Address = import.meta.env.VITE_IPA_GOVERNOR;
const IPA_MANAGER_ADDRESS: Address = import.meta.env.VITE_IPA_MANAGER;

const variables = [
    { key: "proposalThreshold", label: "Proposal Threshold", function: "setProposalThreshold", placeholder: "Amount of governance tokens" },
    { key: "participationThreshold", label: "Participation Threshold", function: "setParticipationThreshold", placeholder: "Amount of governance tokens" },
    { key: "votingDelay", label: "Voting Delay", function: "setVotingDelay", placeholder: "Time in seconds" },
    { key: "votingPeriod", label: "Voting Period", function: "setVotingPeriod", placeholder: "Time in seconds" },
    { key: "quorum", label: "Quorum", function: "updateQuorumNumerator", placeholder: "Percentage (0-100)" },
    { key: "daoRoyaltyTokens", label: "DAO Royalty Tokens", function: "setDAORoyaltyToken", placeholder: "Amount of royalty tokens (0-100)" }
];

export default function DaoVariablesForm() {
    const [selected, setSelected] = useState<string>(variables[0].key);
    const [value, setValue] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [userVotingPower, setUserVotingPower] = useState(-1n);
    const [proposalThreshold, setProposalThreshold] = useState(0n);

    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    const handleRadioChange = (key: string) => {
        setSelected(key);
        setValue("");
    };

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

        if (!value) {
            handleError(new Error("Please enter a valid number"));
            return;
        }

        try {

            setSubmitting(true);
            const target = selected != "daoRoyaltyTokens" ? IPA_GOVERNOR_ADDRESS : IPA_MANAGER_ADDRESS;
            const abi = selected != "daoRoyaltyTokens" ? IPAGovernorABI : IPAManagerABI;
            const functionName = variables.find(v => v.key === selected)?.function;

            let bigintValue: bigint;
            if (["proposalThreshold", "participationThreshold"].includes(selected)) bigintValue = parseEther(value);
            else if (["votingDelay", "votingPeriod", "quorum"].includes(selected)) bigintValue = BigInt(value);
            else if (selected === "daoRoyaltyTokens") bigintValue = BigInt(value) * 10n ** 6n;
            else {
                handleError(new Error("Invalid variable selected"));
                return;
            }

            if (!functionName) {
                handleError(new Error("Invalid variable selected"));
                return;
            }

            const targets = [target];
            const values = [0n];
            const calldatas = [encodeFunctionData({
                abi: abi,
                functionName: functionName,
                args: [bigintValue]
            })];

            const proposalIndex = await getProposalsCount(publicClient!);
            // Added # for splitting the value when in use
            const actionName = variables.find(v => v.key === selected)?.label;
            const description = proposalIndex!.toString() +
                `#Proposal to update DAO variable:\n` +
                `- Name: ${actionName}\n` +
                `- Value: ${value}\n`

            const proposalArgs: ProposalArgs = {
                targets,
                values,
                calldatas,
                description
            };

            const txHash = await propose(proposalArgs, walletClient!);

            publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
                if (txReceipt.status === "reverted") handleError(new Error("Proposal to update DAO variable reverted"));
                else {
                    handleSuccess("Proposal to update DAO variable submitted successfully!");
                    setSubmitting(false);
                    setSelected(variables[0].key);
                    setValue("");
                }
            });
        } catch (error) {
            handleError(error as Error);
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (!walletClient) return;
        getUserVotingPower(walletClient.account.address, publicClient!).then(setUserVotingPower).catch(console.error);
        getProposalThreshold(publicClient!).then(setProposalThreshold).catch(console.error);
    }, [walletClient]);

    return (
        <form
            className="rounded-xl p-3 shadow-md flex flex-col gap-6"
            onSubmit={handleSubmit}
        >
            <div className="flex flex-col gap-4">
                {variables.map((v) => (
                    <label
                        key={v.key}
                        className="flex items-center gap-3 cursor-pointer font-medium"
                    >
                        <input
                            type="radio"
                            name="dao-variable"
                            value={v.key}
                            checked={selected === v.key}
                            onChange={() => handleRadioChange(v.key)}
                            className="accent-accent"
                        />
                        {v.label}
                    </label>
                ))}
            </div>
            <div>
                <input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={variables.find(v => v.key === selected)?.placeholder || "Enter value"}
                    className="w-full p-2 rounded-lg border border outline-none"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={!selected || submitting}
                className={`px-2 py-1 rounded border-none text-lg bg-primary text-text transition-colors ${submitting
                    ? "cursor-not-allowed opacity-70"
                    : "hover:bg-primary/90 cursor-pointer"
                    }`}
            >
                {submitting ? "Submitting..." : "Propose Update"}
            </button>
        </form>
    );
}