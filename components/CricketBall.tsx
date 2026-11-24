/** A spinning 3D cricket ball built from plain CSS (see app/globals.css). */
export default function CricketBall({ size = 220, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="ball-scene" style={{ ["--bs" as any]: `${size}px` }}>
        <div className="ball-body" />
        <div className="ball-tilt">
          <div className="ball-spin">
            <div className="ball-ring seam" />
            <div className="ball-ring stitch-a" />
            <div className="ball-ring stitch-b" />
          </div>
        </div>
        <div className="ball-shine" />
      </div>
    </div>
  );
}
