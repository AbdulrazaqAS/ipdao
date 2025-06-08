import { useState } from "react";
import { useWalletClient } from "wagmi"
import { delegateVote } from "../scripts/action";
import NewQuizForm from "./NewQuizForm";

export default function ProfilePage() {
    const [delegateAddress, setDelegateAddress] = useState("");
    const [showNewQuizForm, setShowNewQuizForm] = useState(false);

    const {data: walletClient} = useWalletClient();

    async function handleDelegateVoter() {
        if (!walletClient) {
            console.error("Wallet not connected");
            return;
        }

        if (!delegateAddress) return;

        try {
            await delegateVote(delegateAddress as `0x${string}`, walletClient);
        } catch (error) {
            console.error("Error delegating vote:", error);
        }
    }
    return (
        <div className="max-w-6xl space-y-3">
            <div>
                <input
                    className="w-lg bg-muted border p-2 rounded"
                    value={delegateAddress}
                    placeholder="Delegate Address"
                    minLength={42}
                    maxLength={42}
                    onChange={(e) => setDelegateAddress(e.target.value)}
                />
                <button
                    className="bg-danger text-white p-2 rounded hover:bg-danger/90 disabled:cursor-not-allowed"
                    onClick={handleDelegateVoter}
                >
                    Delegate
                </button>
            </div>
            <div>
                {showNewQuizForm ?
                  <NewQuizForm setShowNewQuizForm={setShowNewQuizForm}/>
                  :
                  <button
                    onClick={() => {setShowNewQuizForm(true)}}
                    className="bg-primary text-white px-6 py-3 rounded-xl text-lg font-medium hover:bg-primary/90 transition"
                  >
                    Create Proposal
                  </button>}
              </div>
        </div>
    )
}