import { useState } from 'react'
import { Toaster } from 'sonner';
import { NavItems } from "./utils/utils";
import Navbar from './components/Navbar';
import DashboardPage from './components/DashboardPage';
import ProposalsPage from "./components/ProposalsPage";
import GovernancePage from './components/GovernancePage';
import AssetsPage from './components/AssetsPage';
import AirdropPage from './components/AirdropPage';

function App() {
  const [currentPage, setCurrentPage] = useState(NavItems.Dashboard);

  return (
    <>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {currentPage === NavItems.Dashboard && <DashboardPage />}
      {currentPage === NavItems.Proposals && <ProposalsPage />}
      {currentPage === NavItems.Assets && <AssetsPage />}
      {currentPage === NavItems.Governance && <GovernancePage />}
      {currentPage === NavItems.Airdrops && <AirdropPage />}

      <Toaster />
    </>
  )
}

export default App
