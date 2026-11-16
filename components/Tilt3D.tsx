"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Wraps a card with a 3D hover tilt (follows the mouse, with a soft glare) and a "flip up" entrance
 * the first time it scrolls into view. Touch devices and people who prefer reduced motion get the
 * plain card. Anything already on screen when the page loads is shown straight away, never hidden.
 */
export default function Tilt3D({ children, className = "", max = 7, delay = 0 }: { children: React.ReactNode; className?: string; max?: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pre, setPre] = useState(false); // true = waiting below the fold, drawn tilted back and faded

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95) return;
    setPre(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setPre(false); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${((0.5 - y) * max * 2).toFixed(2)}deg) rotateY(${((x - 0.5) * max * 2).toFixed(2)}deg) translateZ(8px)`;
    el.style.setProperty("--gx", `${(x * 100).toFixed(0)}%`);
    el.style.setProperty("--gy", `${(y * 100).toFixed(0)}%`);
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };

  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`t3d ${pre ? "t3d-pre" : ""} ${className}`}
      style={delay ? { transitionDelay: pre ? "0ms" : `${delay}ms` } : undefined}
    >
      {children}
      <span className="t3d-glare" />
    </div>
  );
}
