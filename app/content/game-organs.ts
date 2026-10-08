import type { Locale } from "../i18n/config";
import type { ExtraOrganId } from "../lib/game/body-map";

export type GameOrganText = { name: string; system: string; location: string; accent: string };

const ACCENTS: Record<ExtraOrganId, string> = {
  stomach: "#e3877a",
  spleen: "#8f3a5b",
  bladder: "#e59b8a",
  thyroid: "#b84a43",
  gallbladder: "#7fa94c",
  adrenals: "#e0a23a",
  spinalCord: "#d9a84e",
};

type Text = Omit<GameOrganText, "accent">;

/**
 * Textos de los órganos exclusivos del reto. La ubicación usa referencias
 * clínicas de superficie y se muestra como pista en el juego.
 */
const TEXTS: Record<Locale, Record<ExtraOrganId, Text>> = {
  "es-MX": {
    stomach: { name: "Estómago", system: "Sistema digestivo", location: "Epigastrio e hipocondrio izquierdo, bajo el diafragma y por delante del páncreas." },
    spleen: { name: "Bazo", system: "Sistema linfático", location: "Hipocondrio izquierdo, detrás del estómago, a la altura de las costillas 9.ª a 11.ª." },
    bladder: { name: "Vejiga urinaria", system: "Sistema urinario", location: "Pelvis, detrás de la sínfisis del pubis: se palpa en el hipogastrio cuando está llena." },
    thyroid: { name: "Tiroides", system: "Sistema endocrino", location: "Cuello anterior, por delante de la tráquea y por debajo del cartílago tiroides." },
    gallbladder: { name: "Vesícula biliar", system: "Sistema digestivo", location: "Hipocondrio derecho, en la cara inferior del hígado (punto de Murphy)." },
    adrenals: { name: "Glándulas suprarrenales", system: "Sistema endocrino", location: "Retroperitoneo, sobre el polo superior de cada riñón (T11–T12); se ubican mejor por detrás." },
    spinalCord: { name: "Médula espinal", system: "Sistema nervioso", location: "Conducto vertebral, del foramen magno hasta L1–L2; se sigue por la línea media de la espalda." },
  },
  "en-US": {
    stomach: { name: "Stomach", system: "Digestive system", location: "Epigastric region and left hypochondrium, below the diaphragm and in front of the pancreas." },
    spleen: { name: "Spleen", system: "Lymphatic system", location: "Left hypochondrium, behind the stomach, at the level of ribs 9 to 11." },
    bladder: { name: "Urinary bladder", system: "Urinary system", location: "Pelvis, behind the pubic symphysis: palpable in the hypogastric region when full." },
    thyroid: { name: "Thyroid", system: "Endocrine system", location: "Anterior neck, in front of the trachea and below the thyroid cartilage." },
    gallbladder: { name: "Gallbladder", system: "Digestive system", location: "Right hypochondrium, on the underside of the liver (Murphy's point)." },
    adrenals: { name: "Adrenal glands", system: "Endocrine system", location: "Retroperitoneum, on the upper pole of each kidney (T11–T12); best located from behind." },
    spinalCord: { name: "Spinal cord", system: "Nervous system", location: "Vertebral canal, from the foramen magnum to L1–L2; follow the midline of the back." },
  },
};

export function getExtraOrganTexts(locale: Locale): Record<ExtraOrganId, GameOrganText> {
  const texts = TEXTS[locale];
  return Object.fromEntries(
    (Object.keys(texts) as ExtraOrganId[]).map((id) => [id, { ...texts[id], accent: ACCENTS[id] }]),
  ) as Record<ExtraOrganId, GameOrganText>;
}
