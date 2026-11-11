import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import GenesisExperience from "@/components/genesis/GenesisExperience";

export default async function XioAppPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <main style={{ minHeight: "100vh", position: "relative" }}>
      <div style={{ position: "fixed", zIndex: 100, top: 14, right: 20 }}>
        <UserButton afterSignOutUrl="/" />
      </div>
      <GenesisExperience authenticated />
    </main>
  );
}
