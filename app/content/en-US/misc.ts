import type { OrganId } from "../../lib/anatomy-data";
import type { ArticleSectionId } from "../../lib/encyclopedia-data";
import type { MotionText } from "../types";

export const sectionTitlesEnUS: Record<ArticleSectionId, string> = {
  anatomy: "Descriptive anatomy",
  relations: "Anatomical relations",
  physiology: "Physiology",
  histology: "Histology",
  neurovascular: "Innervation and lymphatic drainage",
  embryology: "Embryology",
  clinical: "Clinical correlation",
};

export const motionEnUS: Record<OrganId, MotionText> = {
  heart: { label: "Heartbeat", description: "Cardiac cycle at 72 bpm: ventricular systole and diastolic filling." },
  brain: { label: "Pulsatility", description: "Brain pulsation transmitted by arterial flow." },
  lungs: { label: "Breathing", description: "14 breaths per minute: active inspiration and passive expiration." },
  liver: { label: "Perfusion", description: "Subtle pulsation from hepatic arterial flow." },
  kidneys: { label: "Perfusion", description: "Pulsation from high renal blood flow (≈20% of cardiac output)." },
  eyeball: { label: "Saccades", description: "Saccadic movements: rapid jumps between fixation points." },
  intestine: { label: "Peristalsis", description: "Waves of contraction that propel intestinal contents." },
  pancreas: { label: "Perfusion", description: "Subtle pulsation from splenic and pancreaticoduodenal supply." },
  skin: { label: "Perfusion", description: "Changing flow in the dermal vascular plexus." },
};
