import { useEffect, useState } from 'react';
import { handleError, handleSuccess, type QuizMetadata, type QuizQuestion } from '../utils/utils';
import { fetchMetadata, getGovernanceTokenSymbol, getQuizzes, getQuizzesCount, getQuizzesUserCanClaim, getQuizzesUserHasClaimed, getQuizzesUserTrials, getUserVotingPower } from '../scripts/getters';
import { usePublicClient, useWalletClient } from 'wagmi';
import { formatEther } from 'viem';
import { sendScoreToServer, claimQuizReward } from '../scripts/actions';

const quizTabs = {
    all: "All",
    active: "Active",
    finished: "Finished",
    claimable: "Claimable"
}

type QuizMetadataPlus = QuizMetadata & {
    canClaim?: boolean;
    hasClaimed?: boolean;
    userTrials?: number;
}

export default function QuizPage() {
    const [activeTab, setActiveTab] = useState<keyof typeof quizTabs>('all');
    const [expandedQuiz, setExpandedQuiz] = useState<number>();
    const [quizzes, setQuizzes] = useState<QuizMetadataPlus[]>([]);
    const [tokenSymbol, setTokenSymbol] = useState("Tokens");
    const [selectedQuestions, setSelectedQuestions] = useState<QuizQuestion[]>([]);
    const [questionAnswers, setQuestionAnswers] = useState<any>({});
    const [filteredQuizzes, setFilteredQuizzes] = useState<QuizMetadataPlus[]>([]);
    const [userVotingPower, setUserVotingPower] = useState(0n);
    const [isLoading, setIsLoading] = useState(false);

    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    function handleAnswerChange(idx: number, i: number): void {
        const indexInAllQuestions = filteredQuizzes[expandedQuiz!].questions.findIndex((q) => q.question === selectedQuestions[idx].question);
        if (indexInAllQuestions < 0) {
            console.error("Can't find question in expanded quiz questions");
            return;
        }

        setQuestionAnswers((prev: { [key: string]: number }) => {
            const newAnswers = { ...prev };
            newAnswers[indexInAllQuestions.toString()] = i;
            return newAnswers;
        });
    }

    async function handleClaimPrize(quizId: number) {
        if (!walletClient) {
            handleError(new Error("Please connect your wallet"));
            return;
        }

        try {
            setIsLoading(true);
            console.log("Claiming reward for quiz:", quizId);
            const txHash = await claimQuizReward(BigInt(quizId), walletClient);
            console.log("Waiting for claim tx. TxHash:", txHash); // TODO: Show this in frontend

            publicClient?.waitForTransactionReceipt({ hash: txHash }).then((txReceipt) => {
                if (txReceipt.status === "reverted") handleError(new Error("Claim transaction reverted"));
                else {
                    handleSuccess("Prize claimed successfully!");
                    // TODO: Update quiz hasClaimed
                }
            });
        } catch (error) {
            console.error("Error claiming prize:", error);
            handleError(error as Error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSubmitAnswers(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!walletClient) {
            handleError(new Error("Please connect your wallet"));
            return;
        }

        try {
            setIsLoading(true);
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
            handleSuccess("Answers submitted successfully!");
            // TODO: Update quiz userTrials and canClaim status
            setExpandedQuiz(undefined);  // Reset expanded quiz after submission
        } catch (error) {
            console.error("Error submitting answers:", error);
            handleError(error as Error);
        } finally {
            setIsLoading(false);
        }
    }

    async function fetchQuizzes() {
        const totalQuizzes = await getQuizzesCount(publicClient!);
        const indices = Array.from({ length: Number(totalQuizzes) }, (_, i) => i).reverse();
        const quizzesContractMetatdata = await getQuizzes(indices, publicClient!);
        const quizzes = await Promise.all(
            quizzesContractMetatdata.map((data) => fetchMetadata(data.metadataURI) as Promise<QuizMetadata>)
        );
        return quizzes;
    }

    useEffect(() => {
        getGovernanceTokenSymbol(publicClient!).then(setTokenSymbol).catch(console.error);
        fetchQuizzes().then(setQuizzes).catch(console.error);
    }, []);

    useEffect(() => {
        if (!walletClient) return;

        async function fetchUserQuizzesData() {
            const quizzes = await fetchQuizzes();
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
                    userTrials: Number(trials[i]),
                }
            });

            // console.log("quizzes", quizzes);
            // console.log("quizzesPlus", quizzesPlus);
            setQuizzes(quizzesPlus);
        }

        fetchUserQuizzesData();
        
        getUserVotingPower(walletClient.account.address, publicClient!).then(setUserVotingPower).catch(console.error);
        setExpandedQuiz(undefined);  // reset expanded quiz
        setQuestionAnswers({});
    }, [walletClient]);

    useEffect(() => {
        if (!expandedQuiz && expandedQuiz !== 0) return;

        setQuestionAnswers({});  // reset answers

        // Randomize questions and pick questionsPerUser
        const shuffled = [...filteredQuizzes[expandedQuiz].questions].sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, filteredQuizzes[expandedQuiz].questionsPerUser);
        setSelectedQuestions(selectedQuestions);
    }, [expandedQuiz])

    useEffect(() => {
        if (quizzes.length <= 0) return;

        const filteredQuizzes = quizzes.filter(q => {
            if (activeTab === "all") return true;
            if (activeTab === "active") {
                if (Number(q.deadline) > (Math.floor(Date.now() / 1000))) return true;
            } else if (activeTab === "finished") {
                if (Number(q.deadline) <= (Math.floor(Date.now() / 1000))) return true;
            } else if (activeTab === "claimable") return !!q.canClaim;

            return false;
        });

        setFilteredQuizzes(filteredQuizzes);
        console.log("Filtered", filteredQuizzes);
    }, [quizzes, activeTab]);

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
                                    Questions: {quiz.questionsPerUser} | Trials: {quiz.userTrials !== undefined ? `${quiz.userTrials}/` : ""}{quiz.maxTrials}
                                </p>
                            </div>
                            <div className="flex space-x-2">
                                {quiz.canClaim && (
                                    <button
                                        disabled={quiz.hasClaimed}
                                        onClick={() => handleClaimPrize(quiz.quizId)}
                                        className="bg-primary text-background px-4 py-2 rounded hover:opacity-90 disabled:cursor-not-allowed"
                                    >
                                        {quiz.hasClaimed ? 'Prize Claimed' : 'Claim Prize'}
                                        {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
                                    </button>
                                )}
                                <button
                                    onClick={() =>
                                        setExpandedQuiz(expandedQuiz === quiz.quizId ? undefined : quiz.quizId)
                                    }
                                    className="bg-primary text-background px-4 py-2 rounded hover:opacity-90"
                                >
                                    {expandedQuiz === quiz.quizId ? 'Hide Quiz' : 'Take Quiz'}

                                </button>
                            </div>
                        </div>

                        {/* Expandable Questions */}
                        {expandedQuiz === quiz.quizId && (
                            <form onSubmit={handleSubmitAnswers} className="mt-4 space-y-4">
                                {selectedQuestions.map((q, idx) => (
                                    <div key={idx} className="p-3 text-text bg-background border border-muted rounded">
                                        <p className="font-medium">{q.question}</p>
                                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {q.options.map((opt, i) => (
                                                <label
                                                    key={i}
                                                    className="block p-2 bg-surface border border-muted rounded hover:border-primary cursor-pointer"
                                                >
                                                    <input type="radio" name={`q${idx}`} onChange={() => handleAnswerChange(idx, i)} className="mr-2" required />
                                                    {opt}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="submit"
                                    disabled={!!quiz?.userTrials && (quiz.userTrials >= quiz.maxTrials || quiz.hasClaimed  || quiz.canClaim)}  // if quiz?.userTrials is true, no need to check whether hasClaimed is undefined
                                    className="mt-2 bg-accent text-background px-4 py-2 rounded hover:opacity-90 disabled:cursor-not-allowed">
                                    {(walletClient && quiz.userTrials! >= quiz.maxTrials) ? "Max trials reached" : "Submit"}
                                    {isLoading && <span className="ml-2 spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full border-current border-t-transparent"></span>}
                                </button>
                            </form>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
