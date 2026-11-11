import { auth } from "@clerk/nextjs/server";
import SanctumExperience from "@/components/sanctum/SanctumExperience";
import "./sanctum.css";

export default async function SanctumPage() {
  const { userId } = await auth();
  return <SanctumExperience signedIn={Boolean(userId)} />;
}
