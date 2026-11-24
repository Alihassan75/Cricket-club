"use client";
export default function LogoutButton() {
  return (
    <button
      className="btn-ball"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/login"); // full reload clears cached pages of this account
      }}
    >
      Log out
    </button>
  );
}
