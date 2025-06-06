import { useEffect, useState } from "react";
import { Users, CheckCircle, PieChart, ListOrdered, Clock, Hourglass, BarChartHorizontal, Coins } from "lucide-react";
import NewProposalForm from "./NewProposalForm";
import { usePublicClient, useWalletClient } from "wagmi";
import { getGovernanceToken, getGovernanceTokenBalance, getGovernanceTokenSupply, getProposalsCount, getProposalThreshold, getQuorum, getVotingDelay, getVotingPeriod } from "../scripts/proposal";
import { formatEther } from "viem";

export default function Dashboard() {
  const [showNewProposalForm, setShowNewProposalForm] = useState(false);
  const [votingPeriod, setVotingPeriod] = useState(0);
  const [votingDelay, setVotingDelay] = useState(0);
  const [proposalThreshold, setProposalThreshold] = useState("");
  const [totalProposals, setTotalProposals] = useState(0n);
  const [quorum, setQuorum] = useState(0n);
  const [userBalance, setUserBalance] = useState(0n);
  // const [governanceToken, setGovernanceToken] = useState("");
  const [governanceTokenSupply, setGovernanceTokenSupply] = useState(0n);

  const {data: walletClient} = useWalletClient();
  const publicClient = usePublicClient();

  useEffect(()=>{
    getVotingPeriod(publicClient!).then((period) => {
      const periodMins = Math.floor(Number(period) / 60);
      setVotingPeriod(periodMins);
    }).catch(console.error);

    getVotingDelay(publicClient!).then((delay) => {
      const delayMins = Math.floor(Number(delay) / 60);
      setVotingDelay(delayMins);
    }).catch(console.error);

    getProposalThreshold(publicClient!).then((value) => {
      const valueEth = formatEther(value);
      setProposalThreshold(valueEth);
    }).catch(console.error);

    getQuorum(publicClient!).then(setQuorum).catch(console.error);
    // getGovernanceToken(publicClient!).then(setGovernanceToken).catch(console.error);
    getProposalsCount(publicClient!).then(setTotalProposals).catch(console.error);
    getGovernanceTokenSupply(publicClient!).then(setGovernanceTokenSupply).catch(console.error);
  }, []);
  
  useEffect(()=>{
    if (!walletClient) return;

    getGovernanceTokenBalance(walletClient.account.address, publicClient!).then(setUserBalance).catch(console.error);
  }, [walletClient]);
  return (
    <div className="p-6 max-w-6xl bg-background mx-auto text-text">
      {/* DAO Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold">🛡 IPDAO Governance</h1>
        <p className="text-lg text-muted mt-2">Decentralized governance for intellectual property</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-muted p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Token Holders</p>
            <p className="text-xl font-semibold">324</p>
          </div>
        </div>
        <div className="bg-muted p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <Coins className="w-8 h-8 text-yellow-500" />
          <div>
            <p className="text-sm text-muted-foreground">Token Supply</p>
            <p className="text-xl font-semibold">{governanceTokenSupply}</p>
          </div>
        </div>
        <div className="bg-muted p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <PieChart className="w-8 h-8 text-yellow-500" />
          <div>
            <p className="text-sm text-muted-foreground">Quorum</p>
            <p className="text-xl font-semibold">{quorum}%</p>
          </div>
        </div>
        <div className="bg-muted p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">Proposals Passed</p>
            <p className="text-xl font-semibold">42</p>
          </div>
        </div>
        <div className="bg-muted p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <ListOrdered className="w-8 h-8 text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">Total Proposals</p>
            <p className="text-xl font-semibold">{totalProposals}</p>
          </div>
        </div>
        <div className="bg-muted p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <BarChartHorizontal className="w-8 h-8 text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">Proposal Threshold</p>
            <p className="text-xl font-semibold">{proposalThreshold}</p>
          </div>
        </div>
        <div className="bg-muted p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <Clock className="w-8 h-8 text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">Voting Period</p>
            <p className="text-xl font-semibold">{votingPeriod}</p>
          </div>
        </div>
        <div className="bg-muted p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <Hourglass className="w-8 h-8 text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">Voting Delay</p>
            <p className="text-xl font-semibold">{votingDelay}</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        {showNewProposalForm ?
          <NewProposalForm setShowNewProposalForm={setShowNewProposalForm}/>
          :
          <button
            onClick={() => {setShowNewProposalForm(true)}}
            className="bg-primary text-white px-6 py-3 rounded-xl text-lg font-medium hover:bg-primary/90 transition"
          >
            Create Proposal
          </button>}
      </div>
    </div>
  );
}
