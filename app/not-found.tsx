import Link from "next/link";
import { ArrowLeft, Box } from "lucide-react";
import { BrandMark } from "./components/BrandMark";
import { getI18n } from "./i18n/server";

export default async function NotFound() {
  const { m } = await getI18n();
  const p = m.pages;
  return (
    <main className="status-page" id="main">
      <div className="status-card animate__animated animate__zoomIn">
        <span className="status-mark animate__animated animate__bounceIn"><BrandMark size={56} /></span>
        <em>{p.notFoundCode}</em>
        <h1>{p.notFoundTitle}</h1>
        <p>{p.notFoundText}</p>
        <div className="status-actions">
          <Link className="btn btn-outline" href="/"><ArrowLeft size={16} /> {p.goHome}</Link>
          <Link className="btn btn-primary btn-shine" href="/atlas"><Box size={16} /> {p.openAtlas}</Link>
        </div>
      </div>
    </main>
  );
}
