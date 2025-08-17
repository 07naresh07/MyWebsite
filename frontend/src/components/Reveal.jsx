import { useEffect, useRef, useState } from "react";

/**
 * Simple intersection-observer reveal wrapper.
 * Usage: <Reveal delay={120}><YourStuff/></Reveal>
 */
export default function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${show ? "in-view" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
