import { Landing } from "./components/Landing";
import { getCurrentUser } from "./lib/server/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <Landing user={await getCurrentUser()} />;
}
