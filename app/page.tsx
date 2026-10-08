import { Landing } from "./components/Landing";
import { getAtlasContent } from "./content";
import { getI18n } from "./i18n/server";
import { getCurrentUser } from "./lib/server/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ locale, m }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  return <Landing user={user} m={m} content={getAtlasContent(locale)} />;
}
