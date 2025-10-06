// src/components/Navbar.jsx
import { NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Home, User, Briefcase, GraduationCap, FolderOpen,
  BookOpen, Award, Mail, Menu, X, Layers // ⬅️ added Layers
} from "lucide-react";
import OwnerToggle from "./OwnerToggle.jsx";
import { getToggleVisible, setToggleVisible, setOwnerFlag } from "../lib/owner.js";

/* ---------------------------------------
   Enhanced Elegant Brand Logo
---------------------------------------- */
function ElegantBrand() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative inline-flex items-center select-none group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Logo Container - Made smaller */}
      <div className="relative flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12">
        {/* Smaller Rotating Decorative Rectangle */}
        <div
          className="absolute -inset-0.5 rounded-xl border-2 pointer-events-none"
          style={{
            borderImage: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #f9ca24) 1",
            animation: "rect-rotate 6s linear infinite",
            transformOrigin: "50% 50%",
            boxShadow: "0 0 10px rgba(255,107,107,0.3), 0 0 20px rgba(78,205,196,0.2)",
            zIndex: 0,
            width: "calc(100% - 4px)",
            height: "calc(100% - 4px)",
            left: "2px",
            top: "2px"
          }}
        />

        {/* Enhanced Inner Core with Better Effects */}
        <div
          className="absolute inset-1.5 rounded-full transition-all duration-700"
          style={{
            background: isHovered
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #43e97b 100%)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
            transform: isHovered ? "scale(1.1) rotate(180deg)" : "scale(1)",
            boxShadow: isHovered 
              ? "inset 0 2px 12px rgba(0,0,0,0.2), 0 6px 25px rgba(102, 126, 234, 0.5), 0 0 30px rgba(240, 147, 251, 0.3)"
              : "inset 0 2px 8px rgba(0,0,0,0.1), 0 4px 15px rgba(102, 126, 234, 0.3)",
            zIndex: 1
          }}
        />

        {/* Enhanced Central Letter N with Glow Effect */}
        <div
          className="relative z-10 font-bold text-white transition-all duration-700"
          style={{
            fontSize: isHovered ? "1.4rem" : "1.1rem",
            textShadow: isHovered 
              ? "0 0 10px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.3), 0 0 20px rgba(102, 126, 234, 0.6)"
              : "0 2px 4px rgba(0,0,0,0.3)",
            transform: isHovered ? "scale(1.1) rotateY(360deg)" : "scale(1)",
            filter: isHovered ? "brightness(1.3)" : "brightness(1)"
          }}
        >
          N
        </div>

        {/* Enhanced Particle Effects */}
        {isHovered && (
          <>
            {[...Array(8)].map((_, i) => (
              <span 
                key={i}
                className="absolute w-1 h-1 rounded-full" 
                style={{ 
                  background: ["#ff6b6b", "#4ecdc4", "#f9ca24", "#45b7d1", "#ff9ff3", "#96ceb4", "#feca57", "#54a0ff"][i],
                  top: "50%", 
                  left: "50%", 
                  animation: `particle-burst-${i + 1} 800ms ease-out forwards`,
                  boxShadow: "0 0 6px currentColor"
                }} 
              />
            ))}
          </>
        )}
      </div>

      {/* Simple Brand text "Naresh" */}
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

    // ⬇️ NEW: BIM in navbar
    { to: "/bim", icon: Layers, label: "BIM", color: "#43e97b" },

    { to: "/blog", icon: BookOpen, label: "Blog", color: "#ff9ff3" },
    { to: "/certificates", icon: Award, label: "Certificates", color: "#54a0ff" },
    { to: "/contact", icon: Mail, label: "Contact", color: "#5f27cd" }
  ];

  // Enhanced compact navigation links
  const baseLink =
    "group relative flex items-center gap-2 px-3 py-2 rounded-full font-semibold transition-all duration-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transform hover:scale-110 active:scale-95";

  const getNavLinkClass = ({ isActive }) =>
    isActive
      ? `${baseLink} text-white shadow-lg`
      : `${baseLink} text-gray-700 hover:text-white shadow-md`;

  const getItemStyle = (isActive, itemColor, isHovered) => {
    if (isActive) {
      return {
        background: `linear-gradient(135deg, ${itemColor}, ${itemColor}dd)`,
        boxShadow: `0 8px 25px ${itemColor}50, 0 0 15px ${itemColor}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
        border: "1px solid rgba(255, 255, 255, 0.3)",
        transform: "translateY(-2px)"
      };
    }
    if (isHovered) {
      return {
        background: `linear-gradient(135deg, ${itemColor}25, ${itemColor}15)`,
        boxShadow: `0 6px 20px ${itemColor}30, 0 0 12px ${itemColor}20, inset 0 1px 0 rgba(255, 255, 255, 0.15)`,
        border: `1px solid ${itemColor}60`,
        backdropFilter: "blur(12px)",
        transform: "translateY(-1px)"
      };
    }
    return {
      background: "rgba(255, 255, 255, 0.7)",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
      border: "1px solid rgba(255, 255, 255, 0.4)",
      backdropFilter: "blur(8px)"
    };
  };

  return (
    <>
      {/* Enhanced Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 w-full origin-left z-[60]"
        style={{
          background: "linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #f9ca24, #ff9ff3)",
          transform: `scaleX(${progress})`,
          boxShadow: "0 0 15px rgba(255, 107, 107, 0.6), 0 2px 4px rgba(0,0,0,0.1)"
        }}
      />

      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-white/98 backdrop-blur-xl shadow-2xl border-b border-gray-200/50" : "bg-white/92 backdrop-blur-lg"
        }`}
        style={{
          boxShadow: scrolled ? "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 40px rgba(102, 126, 234, 0.06)" : "none"
        }}
      >
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, transparent, #667eea20, #764ba240, #f093fb20, transparent)" }} />

        <nav className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1 flex-1">
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
                  {/* Enhanced Icon with Rotation */}
                  <Icon 
                    size={16} 
                    className="flex-shrink-0 transition-all duration-300" 
                    style={{
                      transform: activeHover === to ? "rotate(12deg) scale(1.1)" : "rotate(0deg)",
                      filter: activeHover === to ? "drop-shadow(0 0 4px currentColor)" : "none"
                    }}
                  />
                  
                  {/* Compact text sizing */}
                  <span 
                    className="whitespace-nowrap font-bold tracking-wide transition-all duration-300" 
                    style={{ 
                      fontSize: "0.9rem",
                      transform: activeHover === to ? "scale(1.05)" : "scale(1)",
                      textShadow: activeHover === to ? "0 0 8px rgba(255,255,255,0.8)" : "none"
                    }}
                  >
                    {label}
                  </span>

                  {/* Enhanced Shimmer Effect */}
                  {activeHover === to && (
                    <>
                      <span
                        className="pointer-events-none absolute inset-0 rounded-full"
                        style={{
                          background: `linear-gradient(45deg, transparent, ${color}40, transparent)`,
                          animation: "shimmer-effect 600ms ease-out forwards"
                        }}
                      />
                      
                      {/* Floating Text Effect */}
                      <span
                        className="pointer-events-none absolute left-6"
                        style={{
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: color,
                          animation: "float-text 600ms ease-out forwards",
                          textShadow: `0 0 10px ${color}80`
                        }}
                      >
                        {label}
                      </span>
                    </>
                  )}

                  {/* Smart Dot Indicator */}
                  <div
                    className="absolute -top-1 -right-1 rounded-full transition-all duration-300"
                    style={{
                      width: activeHover === to ? "6px" : "4px",
                      height: activeHover === to ? "6px" : "4px",
                      background: activeHover === to ? color : "transparent",
                      boxShadow: activeHover === to ? `0 0 8px ${color}` : "none"
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

          {/* Enhanced Mobile Menu */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-500 ${
              mobileMenuOpen ? "max-h-[600px] opacity-100 pb-6" : "max-h-0 opacity-0"
            }`}
          >
            <div className="pt-4 space-y-2">
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
                    animationDelay: `${index * 0.1}s`,
                    margin: "0 8px"
                  })}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="font-bold" style={{ fontSize: "0.9rem" }}>{label}</span>
                  <div 
                    className="ml-auto w-2 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      background: color,
                      boxShadow: `0 0 6px ${color}50`
                    }} 
                  />
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

      <style>{`
        /* Continuous rectangle rotation - smaller and faster */
        @keyframes rect-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* Enhanced wave effect for text */
        @keyframes text-wave-effect {
          0%   { transform: scale(1) rotateX(0deg); opacity: 1; filter: blur(0px); }
          50%  { transform: scale(1.2) rotateX(180deg); opacity: 0.7; filter: blur(1px); }
          100% { transform: scale(1.6) rotateX(360deg); opacity: 0; filter: blur(3px); }
        }

        /* Enhanced particle burst effects */
        @keyframes particle-burst-1 { 
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-60px, -45px) scale(1.2) rotate(180deg); opacity: 0; }
        }
        @keyframes particle-burst-2 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(55px, -35px) scale(1) rotate(-180deg); opacity: 0; }
        }
        @keyframes particle-burst-3 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-40px, 60px) scale(0.8) rotate(90deg); opacity: 0; }
        }
        @keyframes particle-burst-4 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(70px, 25px) scale(1.1) rotate(-90deg); opacity: 0; }
        }
        @keyframes particle-burst-5 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-25px, -70px) scale(0.9) rotate(270deg); opacity: 0; }
        }
        @keyframes particle-burst-6 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(40px, -80px) scale(1.3) rotate(45deg); opacity: 0; }
        }
        @keyframes particle-burst-7 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-70px, 30px) scale(1.1) rotate(-45deg); opacity: 0; }
        }
        @keyframes particle-burst-8 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(25px, 75px) scale(0.7) rotate(135deg); opacity: 0; }
        }

        /* Shimmer effect for navigation items */
        @keyframes shimmer-effect {
          0% { transform: translateX(-100%) skewX(-15deg); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%) skewX(-15deg); opacity: 0; }
        }

        /* Floating text effect */
        @keyframes float-text {
          0% { transform: scale(1) translateY(0px); opacity: 1; }
          60% { transform: scale(1.1) translateY(-8px); opacity: 0.6; }
          100% { transform: scale(1.3) translateY(-15px); opacity: 0; }
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
