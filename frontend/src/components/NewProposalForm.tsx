import { useState, useEffect, type FormEvent } from "react";
import { encodeFunctionData, parseEther } from "viem";
import { usePublicClient, useWalletClient } from 'wagmi'
import VotesERC20TokenABI from '../assets/abis/VotesERC20TokenABI.json'
import IPAManagerABI from '../assets/abis/IPAManagerABI.json'
import IPAGovernorABI from '../assets/abis/IPAGovernorABI.json'
import QiuzManagerABI from '../assets/abis/QuizManagerABI.json'
import { handleError, handleSuccess, type ProposalArgs } from "../utils/utils";
import { propose } from "../scripts/action";
import { getProposalsCount, getProposalThreshold, getUserVotingPower } from "../scripts/proposal";
import { X } from "lucide-react";

interface Props {
  setShowNewProposalForm: Function;
}

interface Call {
  target: string;
  functionName: string;
  abi: string;
  args: string;
  value: string;
}

const ABIS = [
  {
    name: "Governance Token",
    abi: VotesERC20TokenABI
  },
  {
    name: "IP Assets Manager",
    abi: IPAManagerABI
  },
  {
    name: "Governor",
    abi: IPAGovernorABI
  },
  {
    name: "Quiz Manager",
    abi: QiuzManagerABI
  }
];


// TODO: Make it more user friendly. Show availbale contracts and all
//       possible functions and then inputs based on the func.
export default function NewProposalForm({ setShowNewProposalForm }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [proposalIndex, setProposalIndex] = useState<bigint>();
  const [userVotingPower, setUserVotingPower] = useState(0n);
  const [proposalThreshold, setProposalThreshold] = useState(0n);
  const [description, setDescription] = useState("Minting 25 tokens to Dev1");
  const [calls, setCalls] = useState<Array<Call>>([
    {
      target: "0x84E13D0d7396f881F3f78505e14af04AE987cBE9",
      functionName: "mint",
      abi: ABIS[0].name,  // default
      args: '["0xDaaE14a470e36796ADf9c75766D3d8ADD0a3D94c", 25000000000000000000]',
      value: "0"
    }
  ]);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const addCall = () => {
    setCalls([...calls, { target: "", functionName: "", abi: "", args: "", value: "0" }]);
  };

  const removeCall = (index: number) => {
    const filteredCalls = calls.filter((_, i) => i !== index);
    if (filteredCalls.length === 0) setShowNewProposalForm(false);
    setCalls(filteredCalls);
  }

  const updateCall = (index: number, field: string, value: string) => {
    const updated = [...calls];
    updated[index][field as keyof Call] = value;
    setCalls(updated);
  };

  const generateProposalArgs = (): ProposalArgs => {
    const targets: Array<`0x${string}`> = [];
    const values: bigint[] = [];
    const calldatas: Array<`0x${string}`> = [];

    for (const call of calls) {
      try {
        const abiObj = ABIS.find((abi) => abi.name === call.abi);
        if (!abiObj) {
          throw new Error(`ABI not found for ${call.abi}`);
        }

        const abi = abiObj.abi;
        const argsParsed = JSON.parse(call.args);
        const calldata = encodeFunctionData({
          abi,
          functionName: call.functionName,
          args: argsParsed
        });

        targets.push(call.target as `0x${string}`);
        values.push(parseEther(call.value));
        calldatas.push(calldata);
      } catch (err: any) {
        throw err;
      }
    }

    // Added # for splitting the value when in use
    const indexedDescription = proposalIndex!.toString() + "#" + description;

    console.log({ targets, values, calldatas, description: indexedDescription });
    return { targets, values, calldatas, description: indexedDescription };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!walletClient) {
      handleError(new Error("Please connect your wallet to create a proposal"));
      return;
    }

    if (userVotingPower < proposalThreshold) {
      handleError(new Error(`No enough voting power to create a proposal`));
      return;
    }

    try {
      setIsLoading(true);
      const args = generateProposalArgs();
      const txHash = await propose(args, walletClient);
      handleSuccess("Proposal submitted successfully!");

      publicClient?.waitForTransactionReceipt({ hash: txHash }).then(() => console.log("Proposal indexed"));
      setShowNewProposalForm(false);
    } catch (err: any) {
      console.error(`Encoding error: ${err}`)
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    getProposalsCount(publicClient!).then(setProposalIndex).catch(console.error);
    getProposalThreshold(publicClient!).then(setProposalThreshold).catch(console.error);
  }, []);

  useEffect(() => {
    if (!walletClient) return;
    getUserVotingPower(walletClient.account.address, publicClient!).then(setUserVotingPower).catch(console.error);
  }, [walletClient]);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">
        Create New Proposal #{proposalIndex !== undefined ? Number(proposalIndex) : " Loading index..."}
      </h1>

      {calls.map((call, index) => (
        <div key={index} className="border rounded-lg p-4 mb-4 space-y-3">
          <div className="flex justify-between">
            <p className="text-2xl">Contract call #{index + 1}</p>
            <X color="red" size={30} onClick={() => removeCall(index)} className="hover:cursor-pointer" />
          </div>
          <input
            type="text"
            placeholder="Target Address"
            className="w-full border p-2 rounded"
            value={call.target}
            minLength={42}
            maxLength={42}
            onChange={(e) => updateCall(index, "target", e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Function Name"
            className="w-full border p-2 rounded"
            value={call.functionName}
            onChange={(e) => updateCall(index, "functionName", e.target.value)}
            required
          />
          <select
            className="w-full border p-2 text-sm rounded"
            value={call.abi}
            onChange={(e) => updateCall(index, "abi", e.target.value)}
          >
            {ABIS.map((abi) => (
              <option key={abi.name} value={abi.name} className="bg-background">
                {abi.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder='Arguments (e.g., ["0xabc", 42])'
            className="w-full border p-2 rounded"
            value={call.args}
            onChange={(e) => updateCall(index, "args", e.target.value)}
          />
          <input
            type="text"
            placeholder="ETH value"
            className="w-full border p-2 rounded"
            value={call.value}
            onChange={(e) => updateCall(index, "value", e.target.value)}
            required
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
          type="submit"
          className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90 disabled:cursor-not-allowed"
          disabled={isLoading || proposalIndex === undefined}
        >
          {isLoading ? "Submitting" : "Submit Proposal"}
          {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
        </button>
        <button
          className="w-full bg-danger text-white py-2 rounded hover:bg-danger/90 disabled:cursor-not-allowed"
          onClick={() => setShowNewProposalForm(false)}
          disabled={isLoading}
        >
          Close Proposal
        </button>
      </div>
    </form>
  );
}
