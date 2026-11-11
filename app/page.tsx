import ZunaArrivalExperience from "@/components/genesis/ZunaArrivalExperience";
import "./zuna-arrival.css";

export const dynamic = "force-static";

export default function Home() {
  return <ZunaArrivalExperience authenticated={false} />;
}
