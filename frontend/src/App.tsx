import { useState } from 'react'
import { Toaster } from 'sonner';
import { NavItems } from "./utils/utils";
import Navbar from './components/Navbar';
import DashboardPage from './components/DashboardPage';
import ProposalsPage from "./components/ProposalsPage";
import ProfilePage from './components/ProfilePage';
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
      {currentPage === NavItems.Profile && <ProfilePage />}
      {currentPage === NavItems.Airdrops && <AirdropPage />}

      <Toaster />
    </>
  )
}

export default App
