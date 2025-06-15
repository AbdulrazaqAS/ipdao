import { useState } from 'react';
import QuizPage from './QuizPage';

const tabs = ['Quiz', 'Art'];

export default function AirdropPage() {
  const [activeTab, setActiveTab] = useState('Quiz');

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-primary mb-6">Airdrop Zone</h1>

      <div className="flex space-x-4 border-b border-muted mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-3 text-sm whitespace-nowrap border-b-2 transition ${
              activeTab === tab
                ? 'text-primary border-primary'
                : 'text-muted border-transparent hover:text-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Quiz" && <QuizPage />}
      {activeTab === "Art" && (
        <div className="text-center text-muted">
          <p className="text-lg">Art section coming soon!</p>
          <p className="mt-2">Stay tuned for exciting updates!</p>
        </div>
      )}
    </div>
  );
}
