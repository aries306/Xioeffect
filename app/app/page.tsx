import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function XioAppPage() {
  const { userId } = await auth();
  if (!userId) return null;
  return <main style={{ minHeight: "100vh", position: "relative" }}><div style={{ position: "fixed", zIndex: 100, top: 14, right: 20 }}><UserButton afterSignOutUrl="/" /></div><iframe title="XIO application" src="/demo.html#/app/today" style={{ border: 0, width: "100%", minHeight: "100vh" }} /></main>;
}
