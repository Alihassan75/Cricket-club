/* The club logo (public/logo.jpg) is white artwork on a black square.
   "dark" blends it into dark headers; "light" inverts it for white pages. */
export default function BrandLogo({ size = 40, tone = "dark", className = "" }: { size?: number; tone?: "dark" | "light"; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.jpg" alt="Backyard Cricket Pakistan" width={size} height={size} className={`${tone === "dark" ? "logo-on-dark" : "logo-on-light"} object-contain shrink-0 ${className}`} style={{ width: size, height: size }} />
  );
}
