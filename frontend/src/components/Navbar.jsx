// src/components/Navbar.jsx
import { NavLink, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Home, User, Briefcase, GraduationCap, FolderOpen,
  BookOpen, Award, Mail, Menu, X
} from "lucide-react";
import OwnerToggle from "./OwnerToggle.jsx";
import { getToggleVisible, setToggleVisible, setOwnerFlag } from "../lib/owner.js";

/* ---------------------------------------
   Animated Brand: "Naresh"
   - Works in Vite (no styled-jsx)
   - Valid Tailwind durations
   - Stable React keys (no Date.now())
---------------------------------------- */
function AnimatedBrand() {
  const text = "Naresh";
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="relative inline-flex items-center select-none group">
      <link
        href="https://fonts.googleapis.com/css2?family=Kaushan+Script:wght@400&display=swap"
        rel="stylesheet"
      />
      <div
        className="
          relative inline-flex items-center
          -rotate-[30deg] transition-all duration-500 ease-out
          group-hover:scale-105
        "
        style={{
          fontFamily: "'Kaushan Script', cursive",
          fontSize: "1.5rem",
          fontWeight: 400,
        }}
      >
        {Array.from(text).map((letter, index) => {
          const delay = index * 150;
          return (
            <span
              key={`${letter}-${index}`}
              className="
                relative inline-block
                opacity-0 translate-y-4 scale-90
                transition-all duration-500
              "
              style={{
                animation: prefersReduced
                  ? "none"
                  : `letterSlideInfinite 3s ${delay}ms ease-in-out infinite`,
                backgroundImage:
                  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow: "0 2px 4px rgba(99, 102, 241, 0.3)",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
              }}
            >
              {letter}
            </span>
          );
        })}
        {/* underline and sparkle effects */}
        <div
          className="
            absolute -bottom-1 left-0 right-0 h-0.5 overflow-hidden rounded-full
            origin-left scale-x-0 transition-transform duration-700 ease-out
          "
          style={{
            background: "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)",
            animation: prefersReduced ? "none" : "simpleUnderlineGrow 3s 1s ease-out infinite",
          }}
        >
          {!prefersReduced && (
            <div
              className="
                absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full
                bg-white shadow-lg -translate-x-full
              "
              style={{
                boxShadow: "0 0 8px #6366f1",
                animation: "dotMove 3s 2s ease-in-out infinite",
              }}
            />
          )}
        </div>
        <div
          className="
            absolute -bottom-1 left-0 right-0 h-1 overflow-visible
            origin-left scale-x-0 transition-transform duration-700 ease-out
          "
          style={{
            animation: prefersReduced ? "none" : "fancyUnderlineGrow 3s 1s ease-out infinite",
          }}
        >
          <svg className="w-full h-3" viewBox="0 0 120 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="underlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="20%" stopColor="#764ba2" />
                <stop offset="40%" stopColor="#f093fb" />
                <stop offset="60%" stopColor="#4facfe" />
                <stop offset="80%" stopColor="#43e97b" />
                <stop offset="100%" stopColor="#fa709a" />
              </linearGradient>
            </defs>
            <path
              d="M2 8 Q30 4 60 6 Q90 8 118 5"
              stroke="url(#underlineGradient)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              className="drop-shadow-sm"
            />
            <circle cx="15" cy="7" r="1.5" fill="#667eea" opacity="0.8" />
            <circle cx="60" cy="5" r="1" fill="#f093fb" opacity="0.6" />
            <circle cx="105" cy="6" r="1.2" fill="#43e97b" opacity="0.7" />
          </svg>
          {!prefersReduced && (
            <div
              className="
                absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full
                bg-gradient-to-r from-yellow-300 to-pink-300 -translate-x-full
              "
              style={{
                boxShadow: "0 0 12px rgba(251, 191, 36, 0.8)",
                animation: "sparkleMove 3s 2s ease-in-out infinite",
              }}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes letterSlideInfinite {
          0%, 20% {
            opacity: 0;
            transform: translateY(16px) scale(0.8) rotateZ(-3deg);
          }
          25%, 75% {
            opacity: 1;
            transform: translateY(0) scale(1) rotateZ(0deg);
          }
          80%, 100% {
            opacity: 0;
            transform: translateY(-8px) scale(0.9) rotateZ(2deg);
          }
        }
        @keyframes simpleUnderlineGrow {
          0%, 15% { transform: scaleX(0); opacity: 0; }
          20%, 85% { transform: scaleX(1); opacity: 1; }
          90%, 100% { transform: scaleX(0); opacity: 0; }
        }
        @keyframes fancyUnderlineGrow {
          0%, 15% { transform: scaleX(0); opacity: 0; }
          25%, 80% { transform: scaleX(1); opacity: 1; }
          90%, 100% { transform: scaleX(0); opacity: 0; }
        }
        @keyframes sparkleMove {
          0%, 15% { transform: translateX(-5px); opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 0.8; }
          85%, 100% { transform: translateX(100px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOwnerToggle, setShowOwnerToggle] = useState(getToggleVisible());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const tabsRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 6);
      const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress(h > 0 ? Math.min(1, y / h) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const admin = url.searchParams.get("admin");
    if (admin !== null) {
      const on = admin === "1" || admin === "true";
      setToggleVisible(on);
      setShowOwnerToggle(getToggleVisible());
      setOwnerFlag(on);
      url.searchParams.delete("admin");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const navigationItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/about", icon: User, label: "About" },
    { to: "/experience", icon: Briefcase, label: "Experience" },
    { to: "/education", icon: GraduationCap, label: "Education" },
    { to: "/projects", icon: FolderOpen, label: "Projects" },
    { to: "/blog", icon: BookOpen, label: "Blog" },
    { to: "/certificates", icon: Award, label: "Certificates" },
    { to: "/contact", icon: Mail, label: "Contact" },
  ];

  const navLinkClass =
    "group relative flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all duration-300 " +
    "text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 " +
    "hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-base " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 " +
    "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r " +
    "before:from-indigo-500/5 before:via-purple-500/5 before:to-pink-500/5 " +
    "before:opacity-0 before:transition-opacity hover:before:opacity-100 " +
    "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 " +
    "after:h-0.5 after:w-0 after:rounded-full after:bg-gradient-to-r " +
    "after:from-indigo-500 after:to-purple-500 after:transition-all after:duration-300 " +
    "hover:after:w-3/4";

  const activeLinkClass =
    "text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/50 " +
    "ring-1 ring-indigo-200/50 dark:ring-indigo-800/50 shadow-sm after:w-3/4 after:opacity-100";

  const getNavLinkClass = ({ isActive }) => `${navLinkClass} ${isActive ? activeLinkClass : ""}`;

  return (
    <>
      <div
        className="fixed top-0 left-0 h-0.5 w-full origin-left z-[60] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
        style={{ transform: `scaleX(${progress})` }}
      />
      <header
        className={`sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-700/50 
          bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 ${
          scrolled ? "shadow-lg shadow-slate-900/5 dark:shadow-slate-900/20" : ""
        }`}
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-200/30 dark:via-indigo-700/30 to-transparent" />
        <nav className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="hidden lg:block w-16"></div>
            <div className="hidden lg:flex items-center space-x-1 flex-1">
              <Link to="/" className="flex-shrink-0 whitespace-nowrap px-3 py-2" aria-label="Go to home">
                <AnimatedBrand />
              </Link>
              {navigationItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} className={getNavLinkClass}>
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="whitespace-nowrap text-base">{label}</span>
                </NavLink>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="lg:hidden absolute left-1/2 transform -translate-x-1/2">
                <Link to="/" className="flex-shrink-0 whitespace-nowrap" aria-label="Go to home">
                  <AnimatedBrand />
                </Link>
              </div>
              {showOwnerToggle && <OwnerToggle />}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 
                  hover:bg-slate-200/50 dark:hover:bg-slate-700/50
                  text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100
                  transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 
                  focus-visible:ring-indigo-500/50"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ${
              mobileMenuOpen ? "max-h-96 opacity-100 pb-4" : "max-h-0 opacity-0"
            }`}
          >
            <div className="pt-4 space-y-1 border-t border-slate-200/50 dark:border-slate-700/50">
              {navigationItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `${getNavLinkClass({ isActive })} w-full justify-start text-lg`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
