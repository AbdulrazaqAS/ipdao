const contracts = [
    {
        name: 'Governance Token',
        address: import.meta.env.VITE_GOVERNANCE_TOKEN!,
        description: 'The governance token for the DAO, used for voting and proposals.',
    },
    {
        name: 'Governor',
        address: import.meta.env.VITE_IPA_GOVERNOR!,
        description: 'The governor contract that manages the DAO governance process.',
    },
    {
        name: 'IP Assets Manager',
        address: import.meta.env.VITE_IPA_MANAGER!,
        description: 'The main contract for managing IP assets within the DAO.',
    },
    {
        name: 'QuizManager',
        address: import.meta.env.VITE_QUIZ_MANAGER!,
        description: 'The contract that manages quizzes related to IP assets.',
    },
]

export default function DaoContractsList() {
    return (
        <div>
            <p className='text-muted'>These are the contracts owned by the DAO</p>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                    <thead>
                        <tr className="text-muted border-b border-muted/20">
                            <th className="py-2 px-2">Name</th>
                            <th className="py-2 px-2">Address</th>
                            <th className="py-2 px-2">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map((contract, idx) => (
                            <tr key={idx} className="border-b border-muted/10">
                                <td className="py-2 px-2 font-mono">{contract.name}</td>
                                <td className="py-2 px-2">{contract.address}</td>
                                <td className="py-2 px-2">{contract.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}