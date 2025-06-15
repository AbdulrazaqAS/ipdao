import { useEffect, useState } from 'react';
import { encodeFunctionData, parseEther, type Address } from 'viem';
import { encryptAnswersOnserver, propose, uploadJsonToIPFS } from '../scripts/actions';
import { getProposalsCount, getProposalThreshold, getQuizzesCount, getUserVotingPower } from '../scripts/getters';
import { usePublicClient, useWalletClient } from 'wagmi';
import QuizManagerABI from '../assets/abis/QuizManagerABI.json';
import { type ProposalArgs, handleError, handleSuccess, type QuizMetadata} from '../utils/utils';

const QuizManagerAddress: Address = import.meta.env.VITE_QUIZ_MANAGER!;

export interface QuizQuestion {
    question: string;
    answer: string;
    options: string[];
}

interface Props {
    setShowNewQuizForm: Function;
}

export default function NewQuizForm({ setShowNewQuizForm }: Props) {
    const [title, setTitle] = useState("");
    const [maxTrials, setMaxTrials] = useState("");
    const [maxWinners, setMaxWinners] = useState("");
    const [minScore, setMinScore] = useState("");
    const [deadline, setDeadline] = useState("");
    const [prizeAmount, setPrizeAmount] = useState("");
    const [prizeToken, setPrizeToken] = useState("0x1514000000000000000000000000000000000000");
    const [questionsPerUser, setQuestionsPerUser] = useState("");
    const [questions, setQuestions] = useState<QuizQuestion[]>([{ question: '', answer: '', options: ['', '', '', ''] }]);
    const [isLoading, setIsLoading] = useState(false);
    const [userVotingPower, setUserVotingPower] = useState(-1n);
    const [proposalThreshold, setProposalThreshold] = useState(0n);

    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    const handleQuestionChange = (index: number, field: keyof QuizQuestion, value: string, optionIndex?: number) => {
        const updated = [...questions];
        if (field === "answer") {
            if (!updated[index]["options"][+value]) return;  // If option value is empty, dont select as answer
            updated[index][field] = value;
        } else if (field === "question") {
            updated[index][field] = value;
        } else {
            if (optionIndex == undefined) {  // optionIndex !== undefined and not !optionIndex bcoz index can be 0
                console.error("Option index not specified");
                return;
            }
            updated[index]["options"][optionIndex] = value;
        }
        setQuestions(updated);
    };

    const addQuestion = () => {
        if (questions.length >= 255) return; // max score in contract in uint8. Each question should be 1 score.
        setQuestions([...questions, { question: '', answer: '', options: ['', '', '', ''] }]);
    };

    const removeQuestion = (index: number) => {
        const updated = questions.filter((_, i) => i !== index);
        if (updated.length <= 0) return;  // Dont remove last one
        setQuestions(updated);
    };

    const addQuestionOption = (questionIndex: number) => {
        const updated = [...questions];
        updated[questionIndex].options.push("");
        setQuestions(updated);
    };

    const removeQuestionOption = (questionIndex: number, optionIndex: number) => {
        const updated = [...questions];
        updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
        updated[questionIndex].answer = "";
        if (updated[questionIndex].options.length <= 3) return;  // Must have at least 4 options
        setQuestions(updated);
    };

    const checkQuizInputs = () => {
        const title2 = title.trim();

        if (!minScore || !maxTrials || !questionsPerUser || !prizeAmount || !deadline || !title2 || !prizeToken || !maxWinners) {
            throw new Error("Invalid quiz parameters");
        }

        if (+minScore > questions.length) {
            throw new Error("Min score must be less than number of questions. Each question 1 point.");
        }

        if (+maxWinners <= 0) {
            throw new Error("Max winners must be greater than 0");
        }

        if (+questionsPerUser <= 0) {
            throw new Error("Questions per user must be greater than 0");
        }

        if (+questionsPerUser > questions.length) {
            throw new Error("Questions per user must be less than or equal to total questions");
        }

        if (+minScore > +questionsPerUser) {
            throw new Error("Questions per user must be greater than or equal to min score");
        }

        questions.forEach((q, index) => {
            if (q.options.length < 4) {
                throw new Error(`Question ${index + 1} must have at least 4 options`);
            }
            if (!q.question.trim()) {
                throw new Error(`Question ${index + 1} cannot be empty`);
            }
            if (!q.answer || !q.options[+q.answer]) {
                throw new Error(`Question ${index + 1} must have a valid answer selected`);
            }
            if (q.options.some(o => !o.trim())) {
                throw new Error(`Question ${index + 1} cannot have empty options`);
            }
        });

        const deadlineMilSecs = new Date(deadline).getTime();
        if (deadlineMilSecs <= Date.now()) {
            throw new Error("Deadline must be in the future");
        }
    }

    const generateQuizMetadata = (quizId: number, encryptedAnswers: string): QuizMetadata => {
        return {
            quizId,
            title: title.trim(),
            deadline: Math.floor(new Date(deadline).getTime() / 1000).toString(),
            maxTrials: Number(maxTrials),
            minScore: Number(minScore),
            prizeAmount: parseEther(prizeAmount),
            questionsPerUser: Number(questionsPerUser),
            questions: questions.map((q) => ({
                question: q.question.trim(),
                options: q.options.map((o) => o.trim()).filter(o => o.length > 0),
            })),
            maxWinners: Number(maxWinners),
            prizeToken: prizeToken as Address,
            encryptedAnswers
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
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
            checkQuizInputs();
            const answers = questions.map(q => q.answer);
            const {encryptedAnswers} = await encryptAnswersOnserver(answers);
            const quizzesCount = await getQuizzesCount(publicClient!);
            const quizMetadata = generateQuizMetadata(Number(quizzesCount), encryptedAnswers);
            const metadataFileName = "QuizMetadata" + quizzesCount;
            const metadataCid = await uploadJsonToIPFS(quizMetadata, metadataFileName);
            if (!metadataCid) throw new Error("Error uploading quiz metadata");

            const metadataUri = `https://ipfs.io/ipfs/${metadataCid}`;
            console.log("Quiz metadata URI:", metadataUri);

            const targets = [QuizManagerAddress];
            const values = [0n];
            const calldatas = [encodeFunctionData({
                abi: QuizManagerABI,
                functionName: "createQuiz",
                args: [
                    quizMetadata.maxTrials,
                    quizMetadata.minScore,
                    quizMetadata.deadline,
                    quizMetadata.prizeAmount,
                    quizMetadata.maxWinners,
                    quizMetadata.prizeToken,
                    metadataUri
                ],
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

            console.log("Proposal Args:", proposalArgs);
            const txHash = await propose(proposalArgs, walletClient);

            publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
                if (txReceipt.status === "reverted") handleError(new Error("Quiz proposal reverted"));
                else {
                    handleSuccess("Quiz proposal submitted successfully!");
                    setShowNewQuizForm(false);
                }
            }).catch(console.error).finally(() => {
                setIsLoading(false);
            });
            
        } catch (error) {
            console.error("Error submitting quiz proposal", error);
            handleError(error as Error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        getProposalThreshold(publicClient!).then(setProposalThreshold).catch(console.error);
    }, []);

    useEffect(() => {
        if (!walletClient) return;
        getUserVotingPower(walletClient.account.address, publicClient!).then(setUserVotingPower).catch(console.error);
    }, [walletClient]);

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-surface text-text mx-auto p-6 rounded-lg shadow-md space-y-6"
        >
            <h2 className="text-xl font-semibold text-primary">Create New Quiz</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
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
                        step={"any"}
                        required
                        className="w-full p-2 bg-background border border-muted rounded"
                        value={prizeAmount}
                        onChange={(e) => setPrizeAmount(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-sm text-muted">Prize Token Address</label>
                    <input
                        type="text"
                        required
                        minLength={42}
                        maxLength={42}
                        pattern='0x[a-fA-F0-9]{40}'
                        className="w-full p-2 bg-background border border-muted rounded"
                        value={prizeToken}
                        onChange={(e) => setPrizeToken(e.target.value)}
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

                <div>
                    <label className="text-sm text-muted">Max Winners</label>
                    <input
                        type="number"
                        min={1}
                        required
                        className="w-full p-2 bg-background border border-muted rounded"
                        value={maxWinners}
                        onChange={(e) => setMaxWinners(e.target.value)}
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
                                    <div key={oIndex} className="w-full flex p-2 bg-surface rounded">
                                        <div className="mr-4">
                                            <input
                                                type="radio"
                                                name={`options${index}`}
                                                className="p-2 rounded"
                                                value={oIndex}
                                                onChange={(e) => handleQuestionChange(index, 'answer', e.target.value)}
                                                checked={oIndex.toString() === qa.answer}
                                                required
                                            />
                                        </div>
                                        <div className="w-full mr-2">
                                            <input
                                                type="text"
                                                name={`options${index}`}
                                                className="w-full px-2 border rounded border-muted"
                                                value={option}
                                                onChange={(e) => handleQuestionChange(index, 'options', e.target.value, oIndex)}
                                                required
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="text-primary py-1 px-3 bg-danger text-sm rounded"
                                            onClick={() => removeQuestionOption(index, oIndex)}
                                        >
                                            X
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                type="button"
                                className="bg-primary text-background py-1 px-3 text-sm rounded hover:opacity-90 transition"
                                onClick={() => addQuestionOption(index)}
                            >
                                Add Option
                            </button>
                            <button
                                type="button"
                                className="text-background py-1 px-3 bg-danger text-sm rounded"
                                onClick={() => removeQuestion(index)}
                            >
                                Remove Question
                            </button>
                        </div>
                    </div>
                ))}
                <button
                    type="button"
                    className="bg-primary text-background px-2 py-1 rounded hover:opacity-90 transition"
                    onClick={addQuestion}
                >
                    Add Question
                </button>
            </div>

            <div className=" gap-3 flex flex-col md:flex-row">
                <button
                    disabled={isLoading}
                    type="submit"
                    className="bg-primary w-full text-background px-6 py-2 rounded hover:opacity-90 transition disabled:cursor-not-allowed"
                >
                    Submit Proposal
                    {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
                </button>
                <button
                    type="button"
                    onClick={() => setShowNewQuizForm(false)}
                    disabled={isLoading}
                    className="bg-danger w-full text-background px-6 py-2 rounded hover:opacity-90 transition disabled:cursor-not-allowed"
                >
                    Close Form
                </button>
            </div>
        </form>
    );
}
