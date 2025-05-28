import { useState } from "react";
import { Users, CheckCircle, PieChart } from "lucide-react";
import NewProposalForm from "./NewProposalForm";

export default function Dashboard() {
  const [showNewProposalForm, setShowNewProposalForm] = useState(false);
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
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">Proposals Passed</p>
            <p className="text-xl font-semibold">42</p>
          </div>
        </div>
        <div className="bg-muted p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <PieChart className="w-8 h-8 text-yellow-500" />
          <div>
            <p className="text-sm text-muted-foreground">Quorum</p>
            <p className="text-xl font-semibold">15%</p>
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
            ➕ Create Proposal
          </button>}
      </div>
    </div>
  );
}
