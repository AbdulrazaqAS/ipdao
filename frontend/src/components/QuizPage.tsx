import { useEffect, useState } from 'react';
import { type QuizMetadata } from '../utils/utils';
import { getQuizzes, getQuizzesCount, getQuizzesUserCanClaim, getQuizzesUserHasClaimed, getQuizzesUserTrials } from '../scripts/proposal';
import { usePublicClient, useWalletClient } from 'wagmi';

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

    const publicClient = usePublicClient();
    const {data:walletClient} = useWalletClient();

    const filteredQuizzes = quizzes.filter(q => {
        if (activeTab === "all") return true;
        if (activeTab === "active") {
            if q.deadline
        }
    }
        activeTab === 'All' ? true : q.status === activeTab
    );

    useEffect(() => {
        async function fetchQuizzes() {
            const totalQuizzes = await getQuizzesCount(publicClient!);
            const indices = Array.from({length: Number(totalQuizzes)}, (_, i) => i).reverse();
            const quizzes = await getQuizzes(indices, publicClient!);
            setQuizzes(quizzes);
        }

        fetchQuizzes();
    }, []);

    useEffect(() => {
        if (!walletClient) return;

        async function fetchUserQuizzesData () {
            const totalQuizzes = await getQuizzesCount(publicClient!);
            const indices = Array.from({length: Number(totalQuizzes)}, (_, i) => i).reverse();
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
                {quizTabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 px-3 text-sm whitespace-nowrap border-b-2 transition ${activeTab === tab
                                ? 'text-primary border-primary'
                                : 'text-muted border-transparent hover:text-text'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Quiz Cards */}
            <div className="space-y-4">
                {filteredQuizzes.map(quiz => (
                    <div
                        key={quiz.id}
                        className="bg-surface p-4 border border-muted rounded-lg shadow-sm transition"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-text">{quiz.title}</h2>
                                <p className="text-sm text-muted">Prize: {quiz.prize}</p>
                                <p className="text-sm text-muted">Deadline: {quiz.deadline}</p>
                                <p className="text-sm text-muted">
                                    Questions: {quiz.questions.length} | Trials: {quiz.userTrials}
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)
                                }
                                className="bg-primary text-background px-4 py-2 rounded hover:opacity-90"
                            >
                                {expandedQuiz === quiz.id ? 'Hide Quiz' : 'Take Quiz'}
                            </button>
                        </div>

                        {/* Expandable Questions */}
                        {expandedQuiz === quiz.id && (
                            <div className="mt-4 space-y-4">
                                {quiz.questions.map((q, idx) => (
                                    <div key={idx} className="p-3 bg-background border border-muted rounded">
                                        <p className="font-medium text-text">{q.q}</p>
                                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {q.options.map((opt, i) => (
                                                <label
                                                    key={i}
                                                    className="block p-2 bg-surface border border-muted rounded hover:border-primary cursor-pointer"
                                                >
                                                    <input type="radio" name={`q${idx}`} className="mr-2" />
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
