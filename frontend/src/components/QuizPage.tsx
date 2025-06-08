import { useEffect, useState } from 'react';
import { type QuizMetadata, type QuizQuestion } from '../utils/utils';
import { getGovernanceTokenSymbol, getQuizzes, getQuizzesCount, getQuizzesUserCanClaim, getQuizzesUserHasClaimed, getQuizzesUserTrials } from '../scripts/proposal';
import { usePublicClient, useWalletClient } from 'wagmi';
import { fetchMetadata } from '../scripts/asset';
import { formatEther } from 'viem';
import { sendScoreToServer } from '../scripts/action';

const quizTabs = {
    all: "All",
    active: "Active",
    finished: "Finished",
    claimable: "Claimable"
}

// const quizTabs = ['All', 'Active', 'Finished', 'Claimable'];

type QuizMetadataPlus = QuizMetadata & {
    canClaim?: boolean;
    hasClaimed?: boolean;
    userTrails?: number;
}

export default function QuizPage() {
    const [activeTab, setActiveTab] = useState<keyof typeof quizTabs>('all');
    const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
    const [quizzes, setQuizzes] = useState<QuizMetadataPlus[]>([]);
    const [tokenSymbol, setTokenSymbol] = useState("Tokens");
    const [selectedQuestions, setSelectedQuestions] = useState<QuizQuestion[]>([]);
    const [questionAnswers, setQuestionAnswers] = useState<any>({});

    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    const filteredQuizzes = quizzes.filter(q => {
        if (activeTab === "all") return true;
        if (activeTab === "active") {
            if (Number(q.deadline) > (Math.floor(Date.now() / 1000))) return true;
        } else if (activeTab === "finished") {
            if (Number(q.deadline) <= (Math.floor(Date.now() / 1000))) return true;
        } else if (activeTab === "claimable") return !!q.canClaim;

        return false;
    });

    function handleAnswerChange(idx: number, i: number): void {
        setQuestionAnswers((prev: { [key: string]: number }) => {
            const newAnswers = { ...prev };
            newAnswers[idx.toString()] = i;
            return newAnswers;
        });
    }

    async function handleSubmitAnswers() {
        if (!walletClient) {
            console.error("Wallet client not connected");
            return;
        }
        
        try {
            console.log("Answers for quiz:", questionAnswers);

            const result = await sendScoreToServer(
                publicClient!.chain.id,
                walletClient.account.address,
                expandedQuiz!,
                questionAnswers
            );
            
            if (!result) {
                throw new Error("Failed to submit answers");
            }
            
            console.log(`Submitting answers for quiz ${expandedQuiz}:`, `Score: ${result.score}`, `TxHash: ${result.txHash}`);
        } catch (error) {
            console.error("Error submitting answers:", error);
        }
    }
    useEffect(() => {
        getGovernanceTokenSymbol(publicClient!).then(setTokenSymbol).catch(console.error);

        async function fetchQuizzes() {
            const totalQuizzes = await getQuizzesCount(publicClient!);
            const indices = Array.from({ length: Number(totalQuizzes) }, (_, i) => i).reverse();
            const quizzesContractMetatdata = await getQuizzes(indices, publicClient!);
            const quizzes = await Promise.all(
                quizzesContractMetatdata.map((data) => fetchMetadata(data.metadataURI) as Promise<QuizMetadata>)
            );
            setQuizzes(quizzes);
        }

        fetchQuizzes();
    }, []);

    useEffect(() => {
        if (!walletClient) return;

        async function fetchUserQuizzesData() {
            const totalQuizzes = await getQuizzesCount(publicClient!);
            const indices = Array.from({ length: Number(totalQuizzes) }, (_, i) => i).reverse();
            const canClaims = await getQuizzesUserCanClaim(indices, walletClient!.account.address, publicClient!);
            const hasClaimeds = await getQuizzesUserHasClaimed(indices, walletClient!.account.address, publicClient!);
            const trials = await getQuizzesUserTrials(indices, walletClient!.account.address, publicClient!);

            const quizzesPlus = quizzes.map((q, i): QuizMetadataPlus => {
                return {
                    ...q,
                    canClaim: canClaims[i],
                    hasClaimed: hasClaimeds[i],
                    userTrails: Number(trials[i]),
                }
            });

            setQuizzes(quizzesPlus);
        }

        fetchUserQuizzesData();
    }, [walletClient?.account.address]);

    useEffect(() => {
        if (!expandedQuiz) return;

        // Randomize questions and pick questionsPerUser
        const shuffled = [...filteredQuizzes[expandedQuiz].questions].sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, filteredQuizzes[expandedQuiz].questionsPerUser);
        setSelectedQuestions(selectedQuestions);
    }, [expandedQuiz])

    useEffect(() => {
        if (!walletClient) return;
        console.log("Wallet account changed 1");
    }, [walletClient?.account.address]);

    useEffect(() => {
        if (!walletClient) return;
        console.log("Wallet account changed 2");
    }, [walletClient]);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-2xl font-semibold text-primary mb-6">Quizzes</h1>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-muted mb-6 overflow-x-auto">
                {Object.keys(quizTabs).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as keyof typeof quizTabs)}
                        className={`pb-2 px-3 text-sm whitespace-nowrap border-b-2 transition ${activeTab === tab
                            ? 'text-primary border-primary'
                            : 'text-muted border-transparent hover:text-text'
                            }`}
                    >
                        {quizTabs[tab as keyof typeof quizTabs]}
                    </button>
                ))}
            </div>

            {/* Quiz Cards */}
            <div className="space-y-4">
                {filteredQuizzes.map((quiz, index) => (
                    <div
                        key={index}
                        className="bg-surface p-4 border border-muted rounded-lg shadow-sm transition"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-text">{quiz.title}</h2>
                                <p className="text-sm text-muted">Prize: {formatEther(quiz.prizeAmount)} {tokenSymbol}</p>
                                <p className="text-sm text-muted">Deadline: {new Date(Number(quiz.deadline) * 1000).toLocaleDateString()}</p>
                                <p className="text-sm text-muted">
                                    Questions: {quiz.questionsPerUser} | Trials: {quiz.maxTrials}
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    setExpandedQuiz(expandedQuiz === quiz.quizId ? null : quiz.quizId)
                                }
                                className="bg-primary text-background px-4 py-2 rounded hover:opacity-90"
                            >
                                {expandedQuiz === quiz.quizId ? 'Hide Quiz' : 'Take Quiz'}
                            </button>
                        </div>

                        {/* Expandable Questions */}
                        {expandedQuiz === quiz.quizId && (
                            <div className="mt-4 space-y-4">
                                {/* {(() => {
                                    // Randomize questions and pick questionsPerUser
                                    const shuffled = [...quiz.questions].sort(() => 0.5 - Math.random());
                                    const selectedQuestions = shuffled.slice(0, quiz.questionsPerUser);

                                    return selectedQuestions.map((q, idx) => (
                                        <div key={idx} className="p-3 text-text bg-background border border-muted rounded">
                                            <p className="font-medium">{q.question}</p>
                                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {q.options.map((opt, i) => (
                                                    <label
                                                        key={i}
                                                        className="block p-2 bg-surface border border-muted rounded hover:border-primary cursor-pointer"
                                                    >
                                                        <input type="radio" name={`q${quiz.quizId}-${idx}`} className="mr-2" />
                                                        {opt}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()} */}
                                {selectedQuestions.map((q, idx) => (
                                    <div key={idx} className="p-3 text-text bg-background border border-muted rounded">
                                        <p className="font-medium">{q.question}</p>
                                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {q.options.map((opt, i) => (
                                                <label
                                                    key={i}
                                                    className="block p-2 bg-surface border border-muted rounded hover:border-primary cursor-pointer"
                                                >
                                                    <input type="radio" name={`q${idx}`} onChange={() => handleAnswerChange(idx, i)} className="mr-2" />
                                                    {opt}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <button className="mt-2 bg-accent text-background px-4 py-2 rounded hover:opacity-90">
                                    Submit Answers
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
