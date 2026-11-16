"use client";
import { useRef } from "react";
import CricketBall from "@/components/CricketBall";

/**
 * Hero artwork for the arena pages — pure CSS 3D (see app/globals.css, "Arena 3D").
 * One spinning ball floats above a glowing floor ring with its shadow underneath, and two gold lights
 * circle the ring. The scene leans gently toward the mouse. Decorative only, so it is hidden from screen readers.
 */
export default function ArenaScene3D({ className = "" }: { className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const aim = (x: number, y: number) => {
    stage.current?.style.setProperty("--px", String(x));
    stage.current?.style.setProperty("--py", String(y));
  };
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !stage.current) return;
    const r = stage.current.getBoundingClientRect();
    aim((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <div className={`o3d-wrap ${className}`} onPointerMove={move} onPointerLeave={() => aim(0, 0)} aria-hidden>
      <div className="o3d-pool" />
      <div ref={stage} className="o3d-stage">
        <div className="o3d-cam">
          <div className="o3d-ring r1"><div className="o3d-spin"><div className="o3d-dotpos"><i className="o3d-dot" /></div></div></div>
          <div className="o3d-ring r2"><div className="o3d-spin rev"><div className="o3d-dotpos"><i className="o3d-dot sm" /></div></div></div>
          <div className="o3d-shadow" />
          <div className="o3d-main"><CricketBall size={150} /></div>
        </div>
      </div>
    </div>
  );
}
