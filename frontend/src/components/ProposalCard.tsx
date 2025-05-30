import { Hourglass, Zap, XCircle, CheckCircle, Clock3 } from "lucide-react";
import { useState, useEffect, type JSX } from "react";
import { ProposalState, Vote, type ProposalData } from "../utils/utils";

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

export default function ProposalCard({ proposal, setVoteChoice, setSelectedProposal, setShowModal }: Props) {
    const [timeleft, setTimeleft] = useState("");
    
    const totalVotes = Number(proposal.for + proposal.against + proposal.abstain) || 1; // Avoid division by zero
    const forPct = Math.round((Number(proposal.for) / totalVotes) * 100);
    const againstPct = Math.round((Number(proposal.against) / totalVotes) * 100);
    const abstainPct = Math.round((Number(proposal.abstain) / totalVotes) * 100);

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
    }, []);

    return (
        <div
            className="bg-white border border-gray-200 rounded-xl shadow p-5"
        >
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Description Hash: {proposal.descriptionHash}</h2>
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
                            setVoteChoice(Vote.Abstain);
                            setSelectedProposal(proposal);
                            setShowModal(true);
                        }}
                    >
                        Vote For
                    </button>
                    <button
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        onClick={() => {
                            setVoteChoice(Vote.Against);
                            setSelectedProposal(proposal);
                            setShowModal(true);
                        }}
                    >
                        Vote Against
                    </button>
                    <button
                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                        onClick={() => {
                            setVoteChoice(Vote.Abstain);
                            setSelectedProposal(proposal);
                            setShowModal(true);
                        }}
                    >
                        Abstain
                    </button>
                </div>
            )}
        </div>
    );
}