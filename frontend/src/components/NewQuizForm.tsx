import { useState } from 'react';
import { encodeFunctionData, parseEther, type Address } from 'viem';
import { propose, uploadJsonToIPFS } from '../scripts/action';
import { getProposalsCount, getQuizzesCount } from '../scripts/proposal';
import { usePublicClient, useWalletClient } from 'wagmi';
import QuizManagerABI from '../assets/abis/QuizManagerABI.json';
import type { ProposalArgs } from '../utils/utils';

const QuizManagerAddress: Address = import.meta.env.VITE_QUIZ_MANAGER!;

interface Question {
    question: string;
    answer: string;
    options: string[];
}

interface QuizMetadata {
    title: string;
    questions: Question[];
    questionsPerUser: number;
    maxTrials: number;
    minScore: number;
    deadline: string;
    prizeAmount: bigint;
}

export default function NewQuizForm() {
    const [title, setTitle] = useState("");
    const [maxTrials, setMaxTrials] = useState("");
    const [minScore, setMinScore] = useState("");
    const [deadline, setDeadline] = useState("");
    const [prizeAmount, setPrizeAmount] = useState("");
    const [questionsPerUser, setQuestionsPerUser] = useState("");
    const [questions, setQuestions] = useState<Question[]>([{ question: '', answer: '', options: [''] }]);

    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    const handleQuestionChange = (index: number, field: keyof Question, value: string, optionIndex?: number) => {
        const updated = [...questions];
        if (field !== "options") updated[index][field] = value;
        else {
            if (!optionIndex) {
                console.error("Option index not specified");
                return;
            }
            updated[index]["options"][optionIndex] = value;
        }
        setQuestions(updated);
    };

    const addQuestion = () => {
        if (questions.length >= 255) return; // max score in contract in uint8. Each question should be 1 score.
        setQuestions([...questions, { question: '', answer: '', options: [] }]);
    };

    const removeQuestion = (index: number) => {
        const updated = questions.filter((_, i) => i !== index);
        setQuestions(updated);
    };

    const generateQuizMetadata = (): QuizMetadata => {
        const title2 = title.trim();
        // TODO: Refine/trim questions and options

        if (!minScore || !maxTrials || !questionsPerUser || !prizeAmount || !deadline || !title2) {
            throw new Error("Invalid quiz parameters");
        }

        return {
            title: title2,
            deadline,
            maxTrials: Number(maxTrials),
            minScore: Number(minScore),
            prizeAmount: parseEther(prizeAmount),
            questionsPerUser: Number(questionsPerUser),
            questions
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!walletClient) {
            console.error("Wallet not connected");
            return;
        }

        try {
            const quizMetadata = generateQuizMetadata();
            const quizzesCount = await getQuizzesCount(publicClient!);
            const metadataFileName = "QuizMetadata" + quizzesCount;
            const metadataCid = uploadJsonToIPFS(quizMetadata, metadataFileName);
            if (!metadataCid) throw new Error("Error uploading quiz metadata");

            const metadataUri = `https://ipfs.io/ipfs/${metadataCid}`;
            console.log("Quiz metadata URI:", metadataUri);

            console.log("Submit quiz:", questions);
            const targets = [QuizManagerAddress];
            const values = [0n];
            const calldatas = [encodeFunctionData({
                abi: QuizManagerABI,
                functionName: "createQuiz",
                args: [maxTrials, minScore, deadline, prizeAmount, metadataUri]
            })];

            const proposalIndex = await getProposalsCount(publicClient!);
            
            // Added # for splitting the value when in use
            const description = proposalIndex!.toString() +
                "#Proposal to create new airdrop by quiz.\n" +
                `Quiz URI: ${metadataUri}`

            const proposalArgs: ProposalArgs = {
                targets,
                values,
                calldatas,
                description
            };

            console.log("Proposing to create new quiz with args:", proposalArgs);
            const txHash = await propose(proposalArgs, walletClient);
            console.log("Proposal waiting to be indexed. TxHash:", txHash); // TODO: Show this in frontend

            publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
                if (txReceipt.status === "reverted") console.error("Proposal reverted");
                else console.log("Proposal mined")
            });
        } catch (error) {
            console.error("Error submitting quiz proposal", error);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-surface text-text max-w-3xl mx-auto p-6 rounded-lg shadow-md space-y-6"
        >
            <h2 className="text-xl font-semibold text-primary">Create New Quiz</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm text-muted">Title</label>
                    <input
                        type="text"
                        required
                        className="w-full p-2 bg-background border border-muted rounded"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-sm text-muted">Max Trials</label>
                    <input
                        type="number"
                        min={1}
                        required
                        className="w-full p-2 bg-background border border-muted rounded"
                        value={maxTrials}
                        onChange={(e) => setMaxTrials(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-sm text-muted">Min Score</label>
                    <input
                        type="number"
                        min={1}
                        max={255}
                        required
                        className="w-full p-2 bg-background border border-muted rounded"
                        value={minScore}
                        onChange={(e) => setMinScore(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-sm text-muted">Deadline (UTC)</label>
                    <input
                        type="datetime-local"
                        required
                        className="w-full p-2 bg-background border border-muted rounded"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-sm text-muted">Prize</label>
                    <input
                        type="number"
                        min={0}
                        required
                        className="w-full p-2 bg-background border border-muted rounded"
                        value={prizeAmount}
                        onChange={(e) => setPrizeAmount(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-sm text-muted">Questions Per User</label>
                    <input
                        type="number"
                        min={0}
                        required
                        className="w-full p-2 bg-background border border-muted rounded"
                        value={questionsPerUser}
                        onChange={(e) => setQuestionsPerUser(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary">Questions</h3>
                {questions.map((qa, index) => (
                    <div
                        key={index}
                        className="bg-background border border-muted rounded-md p-4 space-y-2"
                    >
                        <div>
                            <label className="text-sm text-muted">Question {index + 1}</label>
                            <input
                                type="text"
                                className="w-full p-2 bg-surface border border-muted rounded"
                                value={qa.question}
                                onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm text-muted">Options</label>
                            <div className='space-y-1'>
                                {qa.options.map((option, oIndex) => (
                                    <div className="w-full p-2 bg-surface rounded">
                                        <input
                                            type="radio"
                                            name={`options${index}`}
                                            className="p-2 rounded"
                                            value={oIndex}
                                            onChange={(e) => handleQuestionChange(index, 'answer', e.target.value)}
                                            checked={option === qa.answer}
                                            required
                                        />
                                        <input
                                            type="text"
                                            name={`options${index}`}
                                            className="w-full border border-muted"
                                            value={option}
                                            onChange={(e) => handleQuestionChange(index, 'options', e.target.value, oIndex)}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            type="button"
                            className="text-danger text-sm mt-1"
                            onClick={() => removeQuestion(index)}
                        >
                            Remove
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className="bg-secondary text-background px-4 py-2 rounded hover:opacity-90 transition"
                    onClick={addQuestion}
                >
                    Add Question
                </button>
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    className="bg-primary text-background px-6 py-2 rounded hover:opacity-90 transition"
                >
                    Submit Quiz Proposal
                </button>
            </div>
        </form>
    );
}
