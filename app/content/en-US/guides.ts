import type { OrganId } from "../../lib/anatomy-data";
import type { StudyGuide } from "../../lib/encyclopedia-data";

/** English study guides: objectives, high-yield points and a clinical pearl per organ. */
export const guidesEnUS: Record<OrganId, StudyGuide> = {
  heart: {
    objectives: [
      "Identify the four chambers and the four heart valves on the model.",
      "Describe the path of the electrical impulse from the sinoatrial node to the Purkinje fibers.",
      "Match each coronary artery to the myocardial territory it supplies.",
    ],
    highYield: [
      "The right coronary artery supplies the sinoatrial node in about 60% of people.",
      "Mitral area: 5th left intercostal space, midclavicular line.",
      "Cardiac output = heart rate × stroke volume.",
    ],
    pearl: "An inferior MI (II, III, aVF) usually involves the right coronary artery: watch for bradycardia and AV blocks.",
  },
  brain: {
    objectives: [
      "Locate the cerebral lobes and their predominant function.",
      "Recognize the components of the circle of Willis and their collateral importance.",
      "Correlate a focal neurological deficit with the affected vascular territory.",
    ],
    highYield: [
      "Broca's area (inferior frontal) → expressive aphasia; Wernicke's area (superior temporal) → receptive aphasia.",
      "The middle cerebral artery is the territory most often affected in ischemic stroke.",
      "Cerebrospinal fluid is produced by the choroid plexuses (~500 mL/day).",
    ],
    pearl: "Faciobrachial hemiparesis with aphasia suggests occlusion of the left middle cerebral artery.",
  },
  lungs: {
    objectives: [
      "Distinguish the lobes and fissures of each lung.",
      "Explain the ventilation/perfusion ratio and its effect on oxygenation.",
      "Describe the function of type I and type II pneumocytes.",
    ],
    highYield: [
      "The right main bronchus is shorter, wider and more vertical: aspirated foreign bodies go there.",
      "Surfactant (type II pneumocytes) lowers alveolar surface tension.",
      "Obstructive spirometry: post-bronchodilator FEV1/FVC < 0.70.",
    ],
    pearl: "Aspiration pneumonia in the supine position most often affects the superior segment of the right lower lobe.",
  },
  liver: {
    objectives: [
      "Describe Couinaud's functional segmentation.",
      "Explain the dual blood supply: portal vein and hepatic artery.",
      "Interpret a hepatocellular versus cholestatic pattern on liver function tests.",
    ],
    highYield: [
      "The portal vein provides ~75% of hepatic flow; the hepatic artery, ~25%.",
      "Portal triad: portal vein, hepatic artery and bile duct.",
      "Zone 3 of the acinus (centrilobular) is the most sensitive to ischemia and acetaminophen toxicity.",
    ],
    pearl: "Ascites, esophageal varices and splenomegaly point to portal hypertension: look for the cause of cirrhosis.",
  },
  kidneys: {
    objectives: [
      "Identify the parts of the nephron and the function of each segment.",
      "Explain how the glomerular filtration rate is regulated.",
      "Describe the renin-angiotensin-aldosterone system.",
    ],
    highYield: [
      "The proximal convoluted tubule reabsorbs ~65% of filtered sodium.",
      "Loop diuretics act on the thick ascending limb (Na-K-2Cl cotransporter).",
      "The kidneys lie between T12 and L3; the right one sits lower because of the liver.",
    ],
    pearl: "In Mexico, diabetes and hypertension are the leading causes of chronic kidney disease: screen with albuminuria.",
  },
  eyeball: {
    objectives: [
      "Name the three tunics of the eyeball and their components.",
      "Describe how aqueous humor is produced and drained.",
      "Explain the pupillary light reflex and its afferent and efferent pathways.",
    ],
    highYield: [
      "Aqueous humor is produced by the ciliary body and drains through the trabecular meshwork and Schlemm's canal.",
      "Pupillary light reflex: afferent via the optic nerve (II), efferent via the oculomotor nerve (III).",
      "The fovea contains only cones: maximal visual acuity.",
    ],
    pearl: "A painful red eye, blurred vision and a fixed mid-dilated pupil: suspect acute glaucoma and refer urgently.",
  },
  intestine: {
    objectives: [
      "Differentiate duodenum, jejunum and ileum by anatomy and function.",
      "Match each segment with the nutrients it absorbs.",
      "Describe the supply from the superior and inferior mesenteric arteries.",
    ],
    highYield: [
      "Iron and calcium are absorbed in the duodenum; vitamin B12 and bile salts in the terminal ileum.",
      "The ligament of Treitz separates the upper from the lower GI tract.",
      "Meckel's diverticulum follows the rule of 2s: 2% of people, 2 feet from the ileocecal valve.",
    ],
    pearl: "Periumbilical pain migrating to the right lower quadrant: McBurney's point and the Alvarado score for appendicitis.",
  },
  pancreas: {
    objectives: [
      "Describe the parts of the pancreas and their anatomical relations.",
      "Distinguish exocrine from endocrine function and their cell types.",
      "Explain how the pancreatic duct drains into the ampulla of Vater.",
    ],
    highYield: [
      "β cells → insulin; α → glucagon; δ → somatostatin.",
      "The head of the pancreas is framed by the duodenum; the tail reaches the splenic hilum.",
      "Acute pancreatitis: 2 of 3 criteria (typical pain, lipase > 3× upper limit, compatible imaging).",
    ],
    pearl: "Painless jaundice with a palpable gallbladder (Courvoisier's sign) suggests a tumor of the pancreatic head.",
  },
  skin: {
    objectives: [
      "Identify the layers of the skin and the strata of the epidermis.",
      "Describe its barrier, thermoregulatory and vitamin D functions.",
      "Apply the ABCDE rule when evaluating pigmented lesions.",
    ],
    highYield: [
      "Melanocytes derive from the neural crest and sit in the stratum basale.",
      "Rule of nines to estimate burned body surface area in adults.",
      "The stratum lucidum exists only in thick skin (palms and soles).",
    ],
    pearl: "A mole that changes size, shape or color deserves dermoscopy: evolution (E) is the most sensitive criterion.",
  },
};
