import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { getProposals, getProposalsCount, getProposalsDeadlines, getProposalsProposers, getProposalsStates, getProposalsVotes } from "../scripts/proposal";
import { ProposalState, type ProposalData } from "../utils/utils";
import ProposalCard from "./ProposalCard";

export default function ProposalsPage() {
  const [selectedTab, setSelectedTab] = useState("All");
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [voteChoice, setVoteChoice] = useState<"For" | "Against" | "Abstain" | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(null);

  // FIlter out number keys from tabs.
  const tabs = ["All", ...Object.keys(ProposalState).filter((e) => e.length > 1)];
  const publicClient = usePublicClient();

  const filteredProposals = proposals.filter((p) =>
    selectedTab === "All" ? true : ProposalState[p.status] === selectedTab
  );

  useEffect(() => {
    async function fetchProposals() {
      try {
        const proposalCount = await getProposalsCount(publicClient!);
        const indices = Array.from({length: Number(proposalCount)}, (_, i) => i).reverse();  // reverse to fetch by descending
        
        const proposalsDetails = await getProposals(indices, publicClient!);
        const proposalIds = proposalsDetails.map((p) => p.id);

        const proposalsVotes = await getProposalsVotes(proposalIds, publicClient!);
        const proposalsDeadline = await getProposalsDeadlines(proposalIds, publicClient!);
        const proposalsProposer = await getProposalsProposers(proposalIds, publicClient!);
        const proposalsStates = await getProposalsStates(proposalIds, publicClient!);

        const proposals = proposalsDetails.map((details, index) => {
          const votes = proposalsVotes[index];
          const deadline = proposalsDeadline[index];
          const proposer = proposalsProposer[index];
          const state = proposalsStates[index] as ProposalState;

          return {
            ...details,
            ...votes,
            deadline,
            state,
            status: state,
            proposer: proposer,
          } as ProposalData
        });
        setProposals(proposals);
        console.log("Proposals fetched:", proposals);
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
        {filteredProposals.map((proposal) =>
          <ProposalCard key={proposal.id} proposal={proposal} setSelectedProposal={setSelectedProposal} setShowModal={setShowModal} setVoteChoice={setVoteChoice}/>
        )}

        {filteredProposals.length === 0 && (
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
              <span className="italic text-gray-900">"{selectedProposal.descriptionHash}"</span>?
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
