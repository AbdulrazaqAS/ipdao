import { Hourglass, Zap, XCircle, CheckCircle, Clock3 } from "lucide-react";
import { useState, useEffect, type JSX } from "react";
import { usePublicClient, useWalletClient } from 'wagmi'
import { handleError, handleSuccess, ProposalState, VoteChoice, type ProposalData } from "../utils/utils";
import { cancelProposal, executeProposal } from "../scripts/actions";
import { formatEther } from "viem";
import { getParticipationThreshold, getUserVotingPower } from "../scripts/getters";

const StatusColor: Record<ProposalState, string> = {
    [ProposalState.Pending]: "bg-yellow-100 text-yellow-800",
    [ProposalState.Active]: "bg-blue-100 text-blue-800",
    [ProposalState.Canceled]: "bg-gray-100 text-gray-800",
    [ProposalState.Defeated]: "bg-red-100 text-red-800",
    [ProposalState.Succeeded]: "bg-green-100 text-green-800",
    [ProposalState.Queued]: "bg-blue-200 text-blue-900",
    [ProposalState.Expired]: "bg-gray-200 text-gray-800",
    [ProposalState.Executed]: "bg-green-200 text-green-900",
};

const StatusIcon: Record<ProposalState, JSX.Element> = {
    [ProposalState.Pending]: <Hourglass className="w-4 h-4 mr-1 inline" />,
    [ProposalState.Active]: <Zap className="w-4 h-4 mr-1 inline" />,
    [ProposalState.Canceled]: <XCircle className="w-4 h-4 mr-1 inline" />,
    [ProposalState.Defeated]: <XCircle className="w-4 h-4 mr-1 inline" />,
    [ProposalState.Succeeded]: <CheckCircle className="w-4 h-4 mr-1 inline" />,
    [ProposalState.Queued]: <CheckCircle className="w-4 h-4 mr-1 inline" />,
    [ProposalState.Expired]: <XCircle className="w-4 h-4 mr-1 inline" />,
    [ProposalState.Executed]: <CheckCircle className="w-4 h-4 mr-1 inline" />,
};

interface Props {
    proposal: ProposalData;
    votingPeriod: number;
    setVoteChoice: Function;
    setSelectedProposal: Function;
    setShowModal: Function;
}

// TODOS:
// Show quorom % that has voted
// Add confirmation modals for execute and cancel

export default function ProposalCard({ proposal, votingPeriod, setVoteChoice, setSelectedProposal, setShowModal }: Props) {
    const [timeleft, setTimeleft] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [userVotingPower, setUserVotingPower] = useState(0n);
    const [participationThreshold, setParticipationThreshold] = useState(0n);

    const totalVotes = Number(proposal.for + proposal.against + proposal.abstain) || 1; // Avoid division by zero
    const forPct = Math.round((Number(proposal.for) / totalVotes) * 100);
    const againstPct = Math.round((Number(proposal.against) / totalVotes) * 100);
    const abstainPct = Math.round((Number(proposal.abstain) / totalVotes) * 100);

    const forEth = formatEther(proposal.for);
    const againstEth = formatEther(proposal.against);
    const abstainEth = formatEther(proposal.abstain);

    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    useEffect(() => {
        const updateTime = setInterval(() => {
            // Calculate time left. Only these states have timer.
            if (proposal.state !== ProposalState.Pending && proposal.state !== ProposalState.Active) {
                clearInterval(updateTime);
                return;
            }

            const now = Date.now() / 1000; // Current time in seconds
            let timeLeftSeconds = Number(proposal.deadline) - now;

            // if in pending status (i.e timeLeftSeconds > votingPeriod), show countdown to active state
            if (timeLeftSeconds > votingPeriod) timeLeftSeconds = timeLeftSeconds - votingPeriod;

            if (timeLeftSeconds <= 0) {
                if (proposal.state === ProposalState.Pending) {
                    // TODO: Update state to active
                } else if (proposal.state === ProposalState.Active) {
                    clearInterval(updateTime);
                    setTimeleft("");
                    // TODO: update proposal status
                } else {  // Any other state
                    clearInterval(updateTime);
                    setTimeleft("");
                }
                return;
            }

            const days = Math.floor(timeLeftSeconds / (24 * 3600));
            const hours = Math.floor((timeLeftSeconds % (24 * 3600)) / 3600);
            const minutes = Math.floor((timeLeftSeconds % 3600) / 60);
            const seconds = Math.floor(timeLeftSeconds % 60);

            const timeleft = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            setTimeleft(timeleft);
        }, 1000);

        getParticipationThreshold(publicClient!).then(setParticipationThreshold).catch(console.error);

        return () => clearInterval(updateTime);
    }, []);

    useEffect(() => {
        if (!walletClient) return;
        getUserVotingPower(walletClient.account.address, publicClient!).then(setUserVotingPower).catch(console.error);
    }, [walletClient]);

    async function handleExecute() {
        if (!walletClient) {
            handleError(new Error("Please connect your wallet"));
            return;
        }

        if (userVotingPower < participationThreshold) {
            handleError(new Error(`No enough voting power to participate`));
            return;
        }

        try {
            setIsLoading(true);
            const txHash = await executeProposal(proposal.id, walletClient);

            publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
                if (txReceipt.status === "reverted") handleError(new Error("Failed to execute proposal"));
                else {
                    // TODO: update state and remove btn
                    handleSuccess("Proposal executed successfully!");
                }
            });
        } catch (error) {
            handleError(error as Error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCancel() {
        if (!walletClient) {
            handleError(new Error("Please connect your wallet"));
            return;
        }

        if (userVotingPower < participationThreshold) {
            handleError(new Error(`No enough voting power to participate`));
            return;
        }

        try {
            setIsLoading(true);
            const txHash = await cancelProposal(proposal.id, walletClient);

            publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
                if (txReceipt.status === "reverted") handleError(new Error("Failed to cancel proposal"));
                else {
                    handleSuccess("Proposal cancelled successfully!");
                    // TODO: update state and remove btn
                }
            });
        } catch (error) {
            handleError(error as Error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div
            className="bg-white border border-gray-200 rounded-xl shadow p-5"
        >
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-4">
                <div className="whitespace-pre-line break-all">
                    <p className="text-md text-gray-900">
                        #{proposal.id.toString().slice(0, 5)}...{proposal.id.toString().slice(-5)}
                    </p>
                    <p className="text-sm text-gray-600">By: {proposal.proposer}</p>
                    <h2 className="text-xl font-semibold text-gray-800">{proposal.description || proposal.descriptionHash}</h2>
                </div>
                <span
                    className={`text-sm h-full px-3 py-1 rounded-full inline-flex items-center ${StatusColor[proposal.status]}`}
                >
                    {StatusIcon[proposal.status]} {ProposalState[proposal.status]}
                </span>
            </div>

            <div className="space-y-2 text-sm mb-4">
                <div>
                    <span className="font-medium">For</span>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1">
                        <div
                            className="bg-green-500 h-2"
                            style={{ width: `${forPct}%` }}
                        ></div>
                    </div>
                    <span className="text-xs text-gray-500">{forEth} | {forPct}%</span>
                </div>

                <div>
                    <span className="font-medium">Against</span>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1">
                        <div
                            className="bg-red-500 h-2"
                            style={{ width: `${againstPct}%` }}
                        ></div>
                    </div>
                    <span className="text-xs text-gray-500">{againstEth} | {againstPct}%</span>
                </div>

                <div>
                    <span className="font-medium">Abstain</span>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1">
                        <div
                            className="bg-yellow-400 h-2"
                            style={{ width: `${abstainPct}%` }}
                        ></div>
                    </div>
                    <span className="text-xs text-gray-500">{abstainEth} | {abstainPct}%</span>
                </div>
            </div>

            {timeleft && <div className="text-sm text-gray-600 flex items-center mb-4">
                <Clock3 className="w-4 h-4 mr-1" />
                {timeleft}
            </div>}

            {/* Show vote buttons if active, wallet connected, and has not vote */}
            {proposal.status === ProposalState.Active && walletClient && !proposal.hasVoted && (
                <div className="flex gap-3 flex-wrap">
                    <button
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        onClick={() => {
                            setVoteChoice(VoteChoice.For);
                            setSelectedProposal(proposal);
                            setShowModal(true);
                        }}
                    >
                        Vote For
                    </button>
                    <button
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        onClick={() => {
                            setVoteChoice(VoteChoice.Against);
                            setSelectedProposal(proposal);
                            setShowModal(true);
                        }}
                    >
                        Vote Against
                    </button>
                    <button
                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                        onClick={() => {
                            setVoteChoice(VoteChoice.Abstain);
                            setSelectedProposal(proposal);
                            setShowModal(true);
                        }}
                    >
                        Abstain
                    </button>
                </div>
            )}

            {/* Show vote choice if has already voted */}
            {walletClient && proposal.hasVoted && (
                <p className="text-md text-gray-900">
                    Already voted on this proposal.
                </p>
            )}

            {/* Show execute button if succeeded */}
            {proposal.status === ProposalState.Succeeded && (
                <div className="flex gap-3 flex-wrap">
                    <button
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:cursor-not-allowed"
                        onClick={handleExecute}
                        disabled={isLoading}
                    >
                        {isLoading ? "Sending" : "Execute"}
                        {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
                    </button>
                </div>
            )}

            {/* Show cancel  button if pending and the user is the proposer */}
            {proposal.status === ProposalState.Pending && walletClient && walletClient.account.address === proposal.proposer && (
                <div className="flex gap-3 flex-wrap">
                    <button
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:cursor-not-allowed"
                        onClick={handleCancel}
                        disabled={isLoading}
                    >
                        {isLoading ? "Sending" : "Cancel"}
                        {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
                    </button>
                </div>
            )}
        </div>
    );
}