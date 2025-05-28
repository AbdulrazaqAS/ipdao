import { useState } from 'react'
import Navbar from './components/Navbar';
import DashboardPage from './components/DashboardPage';
import ProposalsPage from "./components/ProposalsPage";
import { NavItems } from "./utils/utils";

function App() {
  const [currentPage, setCurrentPage] = useState(NavItems[0]);

  return (
    <>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {currentPage === "Dashboard" && <DashboardPage />}
      {currentPage === "Proposals" && <ProposalsPage />}
    </>
  )
}

export default App
