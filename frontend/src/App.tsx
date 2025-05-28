import { useState } from 'react'
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import { NavItems } from "./utils/utils";

function App() {
  const [currentPage, setCurrentPage] = useState("Home");

  return (
    <>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {currentPage === "Home" && <HomePage />}
    </>
  )
}

export default App
