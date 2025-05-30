import { useState } from "react";
import { useWalletClient } from "wagmi"
import { delegateVote } from "../scripts/action";

export default function ProfilePage() {
    const [delegateAddress, setDelegateAddress] = useState("");

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
        <div className="max-w-xl">
            <input
                className="w-full bg-muted border p-2 rounded"
                value={delegateAddress}
                placeholder="Delegate Address"
                minLength={42}
                maxLength={42}
                onChange={(e) => setDelegateAddress(e.target.value)}
            />
            <button
                className="w-full bg-danger text-white py-2 rounded hover:bg-danger/90 disabled:cursor-not-allowed"
                onClick={handleDelegateVoter}
            >
                Delegate
            </button>
        </div>
    )
}