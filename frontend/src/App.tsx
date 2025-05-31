import { useState } from 'react'
import Navbar from './components/Navbar';
import DashboardPage from './components/DashboardPage';
import ProposalsPage from "./components/ProposalsPage";
import { NavItems } from "./utils/utils";
import ProfilePage from './components/ProfilePage';
import AssetsPage from './components/AssetsPage';

function App() {
  const [currentPage, setCurrentPage] = useState(NavItems.Dashboard);

  return (
    <>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {currentPage === NavItems.Dashboard && <DashboardPage />}
      {currentPage === NavItems.Proposals && <ProposalsPage />}
      {currentPage === NavItems.Assets && <AssetsPage />}
      {currentPage === NavItems.Profile && <ProfilePage />}
    </>
  )
}

export default App
