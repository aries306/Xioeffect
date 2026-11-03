import { auth } from "@clerk/nextjs/server";
import ZunaAtlasExperience from "@/components/atlas/ZunaAtlasExperience";
import "./atlas.css";

export default async function AtlasPage() {
  let authenticated = false;
  try {
    const session = await auth();
    authenticated = Boolean(session.userId);
  } catch {
    // Keep the public atlas available when auth is not configured in local development.
  }
  return <ZunaAtlasExperience authenticated={authenticated} />;
}
