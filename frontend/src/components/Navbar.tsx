import { NavLink, Link } from "react-router-dom";

const link = "px-3 py-2 rounded hover:bg-gray-100";
const active = ({ isActive }: any) =>
  isActive ? `${link} bg-gray-100 font-semibold` : link;

export default function Navbar() {
  return (
    <header className="border-b">
      <nav className="max-w-5xl mx-auto p-3 flex items-center justify-between">
        {/* Brand on the top-left */}
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Naresh Singh Dhami
        </Link>

        {/* Menu */}
        <div className="flex gap-2">
          <NavLink to="/" className={active}>Home</NavLink>
          <NavLink to="/blog" className={active}>Blog</NavLink>
          <NavLink to="/projects" className={active}>Projects</NavLink>
          <NavLink to="/about" className={active}>About</NavLink>
          <NavLink to="/contact" className={active}>Contact</NavLink>
        </div>
      </nav>
    </header>
  );
}
