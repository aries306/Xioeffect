import { auth } from "@clerk/nextjs/server";
import GenesisExperience from "@/components/genesis/GenesisExperience";

export default async function Home() {
  let authenticated = false;
  try {
    const session = await auth();
    authenticated = Boolean(session.userId);
  } catch {
    // Keep the public Genesis landing experience available when auth is not configured locally.
  }

  return <GenesisExperience authenticated={authenticated} />;
}
