import type { Metadata } from "next";
import { BodyGame, type GameOrgan } from "../components/game/BodyGame";
import { SiteFooter } from "../components/SiteFooter";
import { getAtlasContent } from "../content";
import { getI18n } from "../i18n/server";
import { getCurrentUser } from "../lib/server/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.meta.game, description: m.game.intro };
}

export default async function GameRoute() {
  const [{ locale, m }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  // Solo los campos que el juego necesita: el cliente no recibe el contenido completo.
  const organs: GameOrgan[] = getAtlasContent(locale).organs.map(({ id, name, system, location, accent }) => ({ id, name, system, location, accent }));
  return (
    <div className="game-page">
      <BodyGame organs={organs} signedIn={Boolean(user)} />
      <SiteFooter m={m} variant="compact" className="game-footer" />
    </div>
  );
}
