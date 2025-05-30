import { useState, useEffect } from "react";
import { encodeFunctionData, parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import VotesERC20TokenABI from '../assets/abis/VotesERC20TokenABI.json'
import IPAGovernorABI from '../assets/abis/IPAGovernorABI.json'

const IPAGovernorAddress = import.meta.env.VITE_IPA_GOVERNOR!;

interface Props {
  setShowNewProposalForm: Function;
}

interface Call {
  contract: string;
  functionName: string;
  abi: string;
  args: string;
  value: string;
}

export default function NewProposalForm({setShowNewProposalForm}: Props) {
  const [calls, setCalls] = useState<Array<Call>>([
    {
      contract: "0x84E13D0d7396f881F3f78505e14af04AE987cBE9",
      functionName: "mint",
      abi: "",
      args: '["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 25000000000000000000]',
      value: "0"
    }
  ]);
  const [description, setDescription] = useState("Minting 25 tokens to Hardhat0");

  const addCall = () => {
    setCalls([...calls, { contract: "", functionName: "", abi: "", args: "", value: "0" }]);
  };

  const updateCall = (index: number, field: string, value: string) => {
    const updated = [...calls];
    updated[index][field as keyof Call] = value;
    setCalls(updated);
  };

  const {data: hash, error: txError, isPending, writeContract} = useWriteContract();
  const {isLoading: isIndexing, isSuccess: isIndexed} = useWaitForTransactionReceipt({hash});

  const generateProposalArgs = () => {
    const targets: string[] = [];
    const values: bigint[] = [];
    const calldatas: string[] = [];

    for (const call of calls) {
      try {
        // const abiJson = JSON.parse(call.abi);
        const abiJson = VotesERC20TokenABI;
        const argsParsed = JSON.parse(call.args);
        const calldata = encodeFunctionData({
          abi: abiJson,
          functionName: call.functionName,
          args: argsParsed
        });
        targets.push(call.contract);
        values.push(BigInt(call.value));
        calldatas.push(calldata);
      } catch (err: any) {
        alert(`Encoding error: ${err.message}`);
        return;
      }
    }

    console.log({ targets, values, calldatas, description });
    return [targets, values, calldatas, description];
  };

  const handleSubmit = () => {
    writeContract({
      abi: IPAGovernorABI,
      address: IPAGovernorAddress,
      functionName: "propose",
      args: generateProposalArgs()
    });
  }

  useEffect(() => {
    if (hash) console.log("Hash:", hash);
    if (isIndexing) console.log("Indexing tx");
    if (isIndexed) console.log("Tx Indexed");
    console.log({txError, hash, isIndexing, isIndexed});
  }, [isIndexing, isIndexed, hash, txError]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Create New Proposal</h1>

      {calls.map((call, index) => (
        <div key={index} className="border rounded-lg p-4 mb-4 space-y-3">
          <input
            type="text"
            placeholder="Contract Address"
            className="w-full border p-2 rounded"
            value={call.contract}
            onChange={(e) => updateCall(index, "contract", e.target.value)}
          />
          <input
            type="text"
            placeholder="Function Name"
            className="w-full border p-2 rounded"
            value={call.functionName}
            onChange={(e) => updateCall(index, "functionName", e.target.value)}
          />
          {/*<textarea
            placeholder='ABI (JSON format: [{"inputs":[],"name":"myFn",...}])'
            className="w-full border p-2 rounded text-sm"
            rows={3}
            value={call.abi}
            onChange={(e) => updateCall(index, "abi", e.target.value)}
          />*/}
          <input
            type="text"
            placeholder='Arguments (e.g., ["0xabc", 42])'
            className="w-full border p-2 rounded"
            value={call.args}
            onChange={(e) => updateCall(index, "args", e.target.value)}
          />
          <input
            type="text"
            placeholder="ETH value (in wei)"
            className="w-full border p-2 rounded"
            value={call.value}
            onChange={(e) => updateCall(index, "value", e.target.value)}
          />
        </div>
      ))}

      <button
        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 mb-4"
        onClick={addCall}
      >
        Add Contract Call
      </button>

      <textarea
        placeholder="Proposal Description"
        className="w-full border p-3 rounded mb-4"
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex gap-x-3">
        <button
          className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? "Submitting..." : "Submit Proposal"}
        </button>
        <button
          className="w-full bg-danger text-white py-2 rounded hover:bg-danger/90 disabled:cursor-not-allowed"
          onClick={() => setShowNewProposalForm(false)}
          disabled={isPending}
        >
          Close Proposal
      </button>
      </div>
    </div>
  );
}
