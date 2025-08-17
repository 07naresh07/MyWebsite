import { Outlet, NavLink } from "react-router-dom";

export default function Layout() {
  const link = "px-3 py-2 rounded hover:bg-gray-100";
  const active = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${link} bg-gray-100 font-semibold` : link;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <nav className="mx-auto w-full max-w-4xl p-3 flex gap-2">
          <NavLink to="/" className={active}>
            Home
          </NavLink>
          <NavLink to="/blog" className={active}>
            Blog
          </NavLink>
          <NavLink to="/projects" className={active}>
            Projects
          </NavLink>
          <NavLink to="/about" className={active}>
            About
          </NavLink>
          <NavLink to="/contact" className={active}>
            Contact
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl p-4 flex-1">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-4xl p-4 text-sm text-gray-500">
        © {new Date().getFullYear()} Your Name
      </footer>
    </div>
  );
}
