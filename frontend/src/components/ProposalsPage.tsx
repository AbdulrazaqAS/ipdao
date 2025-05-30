import { useEffect, useState } from "react";
import { Clock3, CheckCircle, Hourglass, XCircle, Zap } from "lucide-react";
import { usePublicClient, useReadContract } from "wagmi";
import IPAGovernorABI from '../assets/abis/IPAGovernorABI.json'
import { getProposalByIndex, getProposals, getProposalsDeadlines, getProposalsProposers, getProposalsStates, getProposalsVotes } from "../scripts/proposal";

const IPAGovernorAddress = import.meta.env.VITE_IPA_GOVERNOR!;

type Proposal = {
  id: number;
  title: string;
  status: "Pending" | "Active" | "Succeeded" | "Executed" | "Failed";
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  timeLeft: string;
};

const proposalsData: Proposal[] = [
  {
    id: 1,
    title: "Fund Research Grant",
    status: "Active",
    forVotes: 72,
    againstVotes: 20,
    abstainVotes: 8,
    timeLeft: "2d 4h",
  },
  {
    id: 2,
    title: "Upgrade Treasury Module",
    status: "Succeeded",
    forVotes: 90,
    againstVotes: 5,
    abstainVotes: 5,
    timeLeft: "Ended",
  },
  {
    id: 3,
    title: "Terminate Risky Partner",
    status: "Failed",
    forVotes: 25,
    againstVotes: 70,
    abstainVotes: 5,
    timeLeft: "Ended",
  },
];

const statusColor = {
  Pending: "bg-yellow-100 text-yellow-800",
  Active: "bg-blue-100 text-blue-800",
  Succeeded: "bg-green-100 text-green-800",
  Executed: "bg-green-200 text-green-900",
  Failed: "bg-red-100 text-red-800",
};

const statusIcon = {
  Pending: <Hourglass className="w-4 h-4 mr-1 inline" />,
  Active: <Zap className="w-4 h-4 mr-1 inline" />,
  Succeeded: <CheckCircle className="w-4 h-4 mr-1 inline" />,
  Executed: <CheckCircle className="w-4 h-4 mr-1 inline" />,
  Failed: <XCircle className="w-4 h-4 mr-1 inline" />,
};

export default function ProposalsPage() {
  const [selectedTab, setSelectedTab] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [voteChoice, setVoteChoice] = useState<"For" | "Against" | "Abstain" | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);


  const tabs = ["All", "Active", "Succeeded", "Failed"];

  const filtered = proposalsData.filter((p) =>
    selectedTab === "All" ? true : p.status === selectedTab
  );

  // const {
  //   data: proposalData,
  //   isLoading: isLoadingProposal,
  //   error: errorFetchingProposal,
  // } = useReadContract({
  //   abi: IPAGovernorABI,
  //   address: IPAGovernorAddress,
  //   functionName: "proposalDetailsAt",
  //   args: [0],
  //   query: {
  //     enabled: true, // only run if expanded is not null
  //   },
  // });

  const publicClient = usePublicClient();

  useEffect(() => {
    console.log("Batching:", publicClient?.batch);

    async function fetchProposals() {
      try {
        const proposals = await getProposals(0, 3, publicClient!);
        const proposalIds = proposals.map((p) => p.id);
        console.log("proposalIds:", proposalIds);

        const proposalsVotes = await getProposalsVotes(proposalIds, publicClient!);
        const proposalsDeadline = await getProposalsDeadlines(proposalIds, publicClient!);
        const proposalsProposer = await getProposalsProposers(proposalIds, publicClient!);
        const proposalsStatus = await getProposalsStates(proposalIds, publicClient!);
      } catch (error) {
        console.error("Error fetching proposals:", error);
      }
    }

    fetchProposals();

  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-text mb-6">Proposals</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              selectedTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
            onClick={() => setSelectedTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Proposal cards */}
      <div className="grid gap-6">
        {filtered.map((proposal) => {
          const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
          const forPct = Math.round((proposal.forVotes / totalVotes) * 100);
          const againstPct = Math.round((proposal.againstVotes / totalVotes) * 100);
          const abstainPct = 100 - forPct - againstPct;

          return (
            <div
              key={proposal.id}
              className="bg-white border border-gray-200 rounded-xl shadow p-5"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{proposal.title}</h2>
                <span
                  className={`text-sm px-3 py-1 rounded-full inline-flex items-center ${statusColor[proposal.status]}`}
                >
                  {statusIcon[proposal.status]} {proposal.status}
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

              <div className="text-sm text-gray-600 flex items-center mb-4">
                <Clock3 className="w-4 h-4 mr-1" />
                {proposal.timeLeft}
              </div>

              {proposal.status === "Active" && (
                // <div className="flex gap-3 flex-wrap">
                //   <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                //     Vote For
                //   </button>
                //   <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                //     Vote Against
                //   </button>
                //   <button className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">
                //     Abstain
                //   </button>
                // </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    onClick={() => {
                      setVoteChoice("For");
                      setSelectedProposal(proposal);
                      setShowModal(true);
                    }}
                  >
                    Vote For
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    onClick={() => {
                      setVoteChoice("Against");
                      setSelectedProposal(proposal);
                      setShowModal(true);
                    }}
                  >
                    Vote Against
                  </button>
                  <button
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                    onClick={() => {
                      setVoteChoice("Abstain");
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
        })}

        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-6">No proposals found.</div>
        )}
      </div>
      {showModal && selectedProposal && voteChoice && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full shadow-xl text-center">
            <h2 className="text-xl font-semibold mb-2">Confirm Vote</h2>
            <p className="text-gray-700 mb-4">
              Are you sure you want to vote <span className="font-bold">{voteChoice}</span> on:
              <br />
              <span className="italic text-gray-900">"{selectedProposal.title}"</span>?
            </p>
            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded text-white ${
                  voteChoice === "For"
                    ? "bg-green-600 hover:bg-green-700"
                    : voteChoice === "Against"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-yellow-500 hover:bg-yellow-600"
                }`}
                onClick={() => {
                  // Replace with actual vote logic
                  console.log(`Voted ${voteChoice} on proposal ${selectedProposal.id}`);
                  setShowModal(false);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
