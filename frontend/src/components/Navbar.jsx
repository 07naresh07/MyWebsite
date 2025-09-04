// src/components/Navbar.jsx
import { NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Home, User, Briefcase, GraduationCap, FolderOpen,
  BookOpen, Award, Mail, Menu, X
} from "lucide-react";
import OwnerToggle from "./OwnerToggle.jsx";
import { getToggleVisible, setToggleVisible, setOwnerFlag } from "../lib/owner.js";

/* ---------------------------------------
   Elegant Brand Logo with Rotating Rectangle
---------------------------------------- */
function ElegantBrand() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative inline-flex items-center select-none group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Logo Container */}
      <div className="relative flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14">
        {/* Rotating Decorative Rectangle (always rotates) */}
        <div
          className="absolute -inset-0.5 rounded-2xl border-2 pointer-events-none"
          style={{
            borderImage: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #f9ca24) 1",
            animation: "rect-rotate 8s linear infinite",
            transformOrigin: "50% 50%",
            boxShadow: "0 0 14px rgba(0,0,0,0.06)",
            zIndex: 0
          }}
        />

        {/* Inner Pulsing Core */}
        <div
          className="absolute inset-2 rounded-full transition-all duration-500"
          style={{
            background: isHovered
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #43e97b 100%)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
            transform: isHovered ? "scale(1.05)" : "scale(1)",
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1), 0 4px 15px rgba(102, 126, 234, 0.3)",
            zIndex: 1
          }}
        />

        {/* Central Letter N (no rotation) */}
        <div
          className="relative z-10 font-bold text-white transition-transform duration-500"
          style={{
            fontSize: isHovered ? "1.5rem" : "1.25rem",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            transform: isHovered ? "scale(1.05)" : "scale(1)"
          }}
        >
          N
        </div>

        {/* Particle blast (unchanged) */}
        {isHovered && (
          <>
            <span className="absolute w-1 h-1 rounded-full" style={{ background: "#ff6b6b", top: "50%", left: "50%", animation: "particle-blast-1 600ms ease-out forwards" }} />
            <span className="absolute w-1 h-1 rounded-full" style={{ background: "#4ecdc4", top: "50%", left: "50%", animation: "particle-blast-2 650ms ease-out forwards" }} />
            <span className="absolute w-1 h-1 rounded-full" style={{ background: "#f9ca24", top: "50%", left: "50%", animation: "particle-blast-3 700ms ease-out forwards" }} />
            <span className="absolute w-1 h-1 rounded-full" style={{ background: "#45b7d1", top: "50%", left: "50%", animation: "particle-blast-4 680ms ease-out forwards" }} />
            <span className="absolute w-1 h-1 rounded-full" style={{ background: "#ff9ff3", top: "50%", left: "50%", animation: "particle-blast-5 720ms ease-out forwards" }} />
          </>
        )}
      </div>

      {/* Brand text “Naresh” (1.1rem) */}
      <div className="hidden lg:block ml-3 overflow-visible relative">
        <div
          className="font-bold tracking-wide transition-transform duration-500"
          style={{
            fontSize: "1.1rem",
            background: "linear-gradient(135deg, #667eea, #764ba2, #f093fb)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            transform: isHovered ? "translateX(4px)" : "translateX(0px)"
          }}
        >
          Naresh
        </div>

        {/* Blast without rotation */}
        {isHovered && (
          <div
            className="pointer-events-none absolute top-0 left-0 font-bold tracking-wide"
            style={{
              fontSize: "1.1rem",
              background: "linear-gradient(135deg, #667eea, #764ba2, #f093fb)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              animation: "text-blast-no-rotate 600ms ease-out forwards"
            }}
          >
            Naresh
          </div>
        )}

        <div
          className="h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent transition-all duration-500"
          style={{ width: isHovered ? "100%" : "0%", marginTop: "2px" }}
        />
      </div>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOwnerToggle, setShowOwnerToggle] = useState(getToggleVisible());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHover, setActiveHover] = useState(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 10);
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
    { to: "/", icon: Home, label: "Home", color: "#ff6b6b" },
    { to: "/about", icon: User, label: "About", color: "#4ecdc4" },
    { to: "/experience", icon: Briefcase, label: "Experience", color: "#45b7d1" },
    { to: "/education", icon: GraduationCap, label: "Education", color: "#96ceb4" },
    { to: "/projects", icon: FolderOpen, label: "Projects", color: "#feca57" },
    { to: "/blog", icon: BookOpen, label: "Blog", color: "#ff9ff3" },
    { to: "/certificates", icon: Award, label: "Certificates", color: "#54a0ff" },
    { to: "/contact", icon: Mail, label: "Contact", color: "#5f27cd" }
  ];

  const baseLink =
    "group relative flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all duration-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transform hover:scale-105 hover:-translate-y-1";

  const getNavLinkClass = ({ isActive }) =>
    isActive
      ? `${baseLink} text-white shadow-2xl hover:shadow-3xl`
      : `${baseLink} text-gray-700 hover:text-white shadow-lg hover:shadow-2xl`;

  const getItemStyle = (isActive, itemColor, isHovered) => {
    if (isActive) {
      return {
        background: `linear-gradient(135deg, ${itemColor}, ${itemColor}dd)`,
        boxShadow: `0 10px 40px ${itemColor}40, 0 0 20px ${itemColor}30`,
        border: "2px solid rgba(255, 255, 255, 0.2)"
      };
    }
    if (isHovered) {
      return {
        background: `linear-gradient(135deg, ${itemColor}20, ${itemColor}10)`,
        boxShadow: `0 8px 30px ${itemColor}20, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
        border: `2px solid ${itemColor}40`
      };
    }
    return {
      background: "rgba(255, 255, 255, 0.8)",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
      border: "2px solid transparent",
      backdropFilter: "blur(10px)"
    };
  };

  return (
    <>
      {/* Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 w-full origin-left z-[60]"
        style={{
          background: "linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #f9ca24, #ff9ff3)",
          transform: `scaleX(${progress})`,
          boxShadow: "0 0 20px rgba(255, 107, 107, 0.5)"
        }}
      />

      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-white/95 backdrop-blur-xl shadow-2xl border-b border-gray-200/50" : "bg-white/90 backdrop-blur-lg"
        }`}
        style={{
          boxShadow: scrolled ? "0 20px 60px rgba(0, 0, 0, 0.1), 0 0 40px rgba(102, 126, 234, 0.1)" : "none"
        }}
      >
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, transparent, #667eea, #764ba2, #f093fb, transparent)" }} />

        <nav className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-2 flex-1">
              <Link to="/" className="flex-shrink-0 mr-6" aria-label="Go to home">
                <ElegantBrand />
              </Link>

              {navigationItems.map(({ to, icon: Icon, label, color }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => getNavLinkClass({ isActive })}
                  style={({ isActive }) => getItemStyle(isActive, color, activeHover === to)}
                  onMouseEnter={() => setActiveHover(to)}
                  onMouseLeave={() => setActiveHover(null)}
                >
                  {/* No rotation on icons */}
                  <Icon size={18} className="flex-shrink-0 transition-transform duration-300" />
                  {/* EXACT match to Naresh size: 1.1rem */}
                  <span className="whitespace-nowrap font-bold tracking-wide" style={{ fontSize: "1.1rem" }}>
                    {label}
                  </span>

                  {/* Blast without rotation for menu names */}
                  {activeHover === to && (
                    <span
                      className="pointer-events-none absolute left-10"
                      style={{
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        animation: "text-blast-no-rotate 600ms ease-out forwards"
                      }}
                    >
                      {label}
                    </span>
                  )}

                  {/* Animated Underline */}
                  <div
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 h-1 rounded-full transition-all duration-300"
                    style={{
                      width: activeHover === to ? "80%" : "0%",
                      background: `linear-gradient(90deg, transparent, ${color}, transparent)`
                    }}
                  />
                </NavLink>
              ))}
            </div>

            {/* Mobile Brand */}
            <div className="lg:hidden absolute left-1/2 transform -translate-x-1/2">
              <Link to="/" className="flex-shrink-0" aria-label="Go to home">
                <ElegantBrand />
              </Link>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
              {showOwnerToggle && (
                <div className="hidden lg:block">
                  <OwnerToggle />
                </div>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`lg:hidden relative p-3 rounded-2xl transition-all duration-300 ${
                  mobileMenuOpen
                    ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-2xl"
                    : "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-xl hover:shadow-2xl"
                }`}
                style={{
                  boxShadow: mobileMenuOpen ? "0 10px 30px rgba(239, 68, 68, 0.4)" : "0 8px 25px rgba(59, 130, 246, 0.3)"
                }}
                aria-label="Toggle menu"
              >
                <div className="relative">
                  {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  {!mobileMenuOpen && <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-500 ${
              mobileMenuOpen ? "max-h-[600px] opacity-100 pb-6" : "max-h-0 opacity-0"
            }`}
          >
            <div className="pt-4 space-y-3">
              {showOwnerToggle && (
                <div className="flex justify-center pb-4">
                  <OwnerToggle />
                </div>
              )}

              {navigationItems.map(({ to, icon: Icon, label, color }, index) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => getNavLinkClass({ isActive })}
                  style={({ isActive }) => ({
                    ...getItemStyle(isActive, color, false),
                    animationDelay: `${index * 0.1}s`
                  })}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {/* SAME 1.1rem on mobile labels */}
                  <span className="font-bold" style={{ fontSize: "1.1rem" }}>{label}</span>
                  <div className="ml-auto w-2 h-2 rounded-full" style={{ background: color }} />
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.3), transparent)" }}
        />
      </header>

      {/* Use plain <style>, not <style jsx> */}
      <style>{`
        /* Continuous rectangle rotation behind the logo */
        @keyframes rect-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* No-rotate blast (used for brand + menu names) */
        @keyframes text-blast-no-rotate {
          0%   { transform: scale(1);   opacity: 1;   filter: blur(0px); }
          60%  { transform: scale(1.6); opacity: 0.5; filter: blur(2px); }
          100% { transform: scale(2.2); opacity: 0;   filter: blur(4px); }
        }

        /* Particle blasts (unchanged) */
        @keyframes particle-blast-1 { 
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-80px, -60px) scale(1.5); opacity: 0; }
        }
        @keyframes particle-blast-2 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(70px, -40px) scale(1.2); opacity: 0; }
        }
        @keyframes particle-blast-3 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50px, 80px) scale(1); opacity: 0; }
        }
        @keyframes particle-blast-4 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(90px, 30px) scale(1.3); opacity: 0; }
        }
        @keyframes particle-blast-5 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-30px, -90px) scale(1.1); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}
