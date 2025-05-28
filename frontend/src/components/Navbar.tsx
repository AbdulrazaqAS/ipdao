import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NavItems } from "../utils/utils";

interface Props {
  currentPage: string;
  setCurrentPage: Function;
}

export default function Navbar({currentPage, setCurrentPage} : Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-background text-text shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="text-xl font-bold text-primary">IPDAO</div>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-6">
          {NavItems.map((item) => (
            <button
              key={item}
              onClick={() => setCurrentPage(item)}
              className={`hover:text-accent ${
                currentPage === item ? "text-accent" : ""
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Connect Button */}
        <div className="hidden md:block">
          <button className="bg-primary text-background px-4 py-2 rounded-md hover:bg-accent transition">
            Connect
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 space-y-2">
          {NavItems.map((item) => (
            <button
              key={item}
              onClick={() => {
                setCurrentPage(item);
                setMenuOpen(false);
              }}
              className={`block w-full text-left hover:text-accent ${
                currentPage === item ? "text-accent" : ""
              }`}
            >
              {item}
            </button>
          ))}
          <button className="w-full mt-2 bg-primary text-background px-4 py-2 rounded-md hover:bg-accent transition">
            Connect
          </button>
        </div>
      )}
    </nav>
  );
}
