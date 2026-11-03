import { auth } from "@clerk/nextjs/server";
import ZunaArrivalExperience from "@/components/genesis/ZunaArrivalExperience";
import "./zuna-arrival.css";

export default async function Home() {
  let authenticated = false;
  try {
    const session = await auth();
    authenticated = Boolean(session.userId);
  } catch {
    // Keep the arrival experience available when auth is not configured locally.
  }

  return <ZunaArrivalExperience authenticated={authenticated} />;
}
