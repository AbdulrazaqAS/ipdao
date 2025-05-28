import { useState } from 'react'
import Navbar from './components/Navbar';

function App() {
  const [currentPage, setCurrentPage] = useState("Home");

  return (
    <>
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </>
  )
}

export default App
