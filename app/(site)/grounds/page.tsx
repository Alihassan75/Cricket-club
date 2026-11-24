import { redirect } from "next/navigation";

/** The separate Grounds page is gone: players pick an hour on the arena page. */
export default function GroundsRedirect() {
  redirect("/arenas");
}
