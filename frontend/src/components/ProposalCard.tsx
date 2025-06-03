import { Hourglass, Zap, XCircle, CheckCircle, Clock3 } from "lucide-react";
import { useState, useEffect, type JSX } from "react";
import { usePublicClient, useWalletClient } from 'wagmi'
import { ProposalState, VoteChoice, type ProposalData } from "../utils/utils";
import { executeProposal } from "../scripts/action";

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
    setVoteChoice: Function;
    setSelectedProposal: Function;
    setShowModal: Function;
}

// TODOS:
// Hides votes btn if already voted. Show "Voted For".
// Use deadline - voteDelay for timer when state is waiting. Then
// refetch when it hits zero and make the deadline as timer
// Show cancel btn
// Show number of votes, quorom % that has voted

export default function ProposalCard({ proposal, setVoteChoice, setSelectedProposal, setShowModal }: Props) {
    const [timeleft, setTimeleft] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const totalVotes = Number(proposal.for + proposal.against + proposal.abstain) || 1; // Avoid division by zero
    const forPct = Math.round((Number(proposal.for) / totalVotes) * 100);
    const againstPct = Math.round((Number(proposal.against) / totalVotes) * 100);
    const abstainPct = Math.round((Number(proposal.abstain) / totalVotes) * 100);

    const {data: walletClient} = useWalletClient();
    const publicClient = usePublicClient();

    useEffect(() => {
        const updateTime = setInterval(() => {
            // Calculate time left
            const now = Date.now() / 1000; // Current time in seconds
            const timeLeftSeconds = Number(proposal.deadline) - now;

            if (timeLeftSeconds < 0) {
                clearInterval(updateTime); // proposal status will show more info if proposal is expired
                return;
            }

            const days = Math.floor(timeLeftSeconds / (24 * 3600));
            const hours = Math.floor((timeLeftSeconds % (24 * 3600)) / 3600);
            const minutes = Math.floor((timeLeftSeconds % 3600) / 60);
            const seconds = Math.floor(timeLeftSeconds % 60);

            const timeleft = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            setTimeleft(timeleft);
        }, 1000)

        // const updateStatus = setInterval(() => {}, 1000 * 60); // after every min
        // const updateVotes = setInterval(() => {}, 1000 * 60); // after every min
    }, []);

    async function handleExecute() {
        if (!walletClient) {
            console.error("Wallet not connected");
            return;
        }

        try {
            setIsLoading(true);
            const txHash = await executeProposal(proposal.id, walletClient);
            console.log("Execution tx sent. TxHash:", txHash);
              
            publicClient?.waitForTransactionReceipt({hash: txHash}).then(() => console.log("Execution mined"));
            // TODO: update state
        } catch (error) {
            console.error("Error executing proposal:", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div
            className="bg-white border border-gray-200 rounded-xl shadow p-5"
        >
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-4">
                <div className="">
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
                    <span className="text-xs text-gray-500">{forPct}%</span>
                </div>

                <div>
                    <span className="font-medium">Against</span>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1">
                        <div
                            className="bg-red-500 h-2"
                            style={{ width: `${againstPct}%` }}
                        ></div>
                    </div>
                    <span className="text-xs text-gray-500">{againstPct}%</span>
                </div>

                <div>
                    <span className="font-medium">Abstain</span>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1">
                        <div
                            className="bg-yellow-400 h-2"
                            style={{ width: `${abstainPct}%` }}
                        ></div>
                    </div>
                    <span className="text-xs text-gray-500">{abstainPct}%</span>
                </div>
            </div>

            {timeleft && <div className="text-sm text-gray-600 flex items-center mb-4">
                <Clock3 className="w-4 h-4 mr-1" />
                {timeleft}
            </div>}

            {/* Show vote buttons if active */}
            {proposal.status === ProposalState.Active && (
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

            {/* Show execute button if succeeded */}
            {proposal.status === ProposalState.Succeeded && (
                <div className="flex gap-3 flex-wrap">
                    <button
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:cursor-not-allowed"
                        onClick={handleExecute}
                        disabled={isLoading}
                    >
                        {isLoading ? "Sending..." : "Execute"}
                    </button>
                </div>
            )}
        </div>
    );
}