import { useEffect, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { getProposals, getProposalsCount, getProposalsDeadlines, getProposalsDescriptions, getProposalsProposers, getProposalsStates, getProposalsVotes, getVotingPeriod, hasVoted } from "../scripts/getters";
import { ProposalState, type ProposalData, VoteChoice, handleError, handleSuccess } from "../utils/utils";
import ProposalCard from "./ProposalCard";
import { castVote } from "../scripts/actions";

export default function ProposalsPage() {
  const [selectedTab, setSelectedTab] = useState("All");
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [voteChoice, setVoteChoice] = useState<VoteChoice>();
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProposals, setIsLoadingProposals] = useState(true);
  const [votingPeriod, setVotingPeriod] = useState(0n);

  // FIlter out number keys from tabs.
  const tabs = ["All", ...Object.keys(ProposalState).filter((e) => e.length > 1)];

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const filteredProposals = proposals.filter((p) =>
    selectedTab === "All" ? true : ProposalState[p.status] === selectedTab
  );

  async function handleCastVote() {
    if (!walletClient) {
      console.error("Wallet not connected");
      return;
    }

    try {
      setIsLoading(true);
      const txHash = await castVote(selectedProposal!.id, voteChoice!, walletClient);
      console.log(`Voted ${voteChoice} on proposal ${selectedProposal!.id}`);

      publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
        if (txReceipt.status === "reverted") handleError(new Error("Vote transaction reverted"));
        else {
          const votedProposalIndex = proposals.findIndex((p) => p.id === selectedProposal?.id);
          const updatedProposals = [...proposals];
          updatedProposals[votedProposalIndex].hasVoted = true;
          setProposals(updatedProposals);
          handleSuccess("Vote cast successfully!");
        }
      });
    } catch (error) {
      handleError(error as Error);
    } finally {
      setShowModal(false);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function fetchProposals() {
      try {
        const proposalCount = await getProposalsCount(publicClient!);
        const indices = Array.from({ length: Number(proposalCount) }, (_, i) => i).reverse();  // reverse to fetch by descending

        const proposalsDetails = await getProposals(indices, publicClient!);
        const proposalIds = proposalsDetails.map((p) => p.id);

        const proposalsVotes = await getProposalsVotes(proposalIds, publicClient!);
        const proposalsDeadline = await getProposalsDeadlines(proposalIds, publicClient!);
        const proposalsProposer = await getProposalsProposers(proposalIds, publicClient!);
        const proposalsStates = await getProposalsStates(proposalIds, publicClient!);
        const descriptions = await getProposalsDescriptions(publicClient!);

        const proposalsPromise = proposalsDetails.map(async (details, index) => {
          const votes = proposalsVotes[index];
          const deadline = proposalsDeadline[index];
          const proposer = proposalsProposer[index];
          const state = proposalsStates[index] as ProposalState;
          const description = descriptions.find(desc => details.id === desc.proposalId)?.description || null;

          let userHasVoted = false;
          if (walletClient) userHasVoted = await hasVoted(details.id, walletClient.account.address, publicClient!);

          return {
            ...details,
            ...votes,
            deadline,
            state,
            status: state,
            proposer: proposer,
            description,
            hasVoted: userHasVoted,
          } as ProposalData
        });

        const proposals = await Promise.all(proposalsPromise);
        setProposals(proposals);
        console.log("Proposals fetched:", proposals);
      } catch (error) {
        console.error("Error fetching proposals:", error);
      } finally {
        setIsLoadingProposals(false);
      }
    }

    fetchProposals();

    getVotingPeriod(publicClient!).then(setVotingPeriod).catch(console.error);

  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-text mb-6">Proposals</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded text-sm font-medium transition ${selectedTab === tab
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
      <div className="grid grid-col-1 gap-6">
        {filteredProposals.map((proposal) =>
          <ProposalCard key={proposal.id} proposal={proposal} votingPeriod={Number(votingPeriod)} setSelectedProposal={setSelectedProposal} setShowModal={setShowModal} setVoteChoice={setVoteChoice} />
        )}

        {isLoadingProposals ? (
          <div className="text-center text-gray-500 py-6">Loading proposals...</div>
        ) : (
          filteredProposals.length === 0 && (
          <div className="text-center text-gray-500 py-6">No proposals found.</div>
        ))}
      </div>

      {/* voteChoice !== undefined and not just voteChoice bcoz "against" is zero which will make voteChoice false */}
      {showModal && selectedProposal && voteChoice !== undefined && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full shadow-xl text-center">
            <h2 className="text-xl font-semibold mb-2">Confirm Vote</h2>
            <p className="text-gray-700 mb-4">
              Are you sure you want to vote <span className="font-bold">{VoteChoice[voteChoice]}</span> on:
              <br />
              <span className="italic text-gray-900">"{selectedProposal.id.toString().slice(0, 5)}...{selectedProposal.id.toString().slice(-5)}"</span>?
            </p>
            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 disabled:cursor-not-allowed"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded text-white disabled:cursor-not-allowed ${voteChoice === VoteChoice.For
                    ? "bg-green-600 hover:bg-green-700"
                    : voteChoice === VoteChoice.Against
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-yellow-500 hover:bg-yellow-600"
                  }`}
                onClick={handleCastVote}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
