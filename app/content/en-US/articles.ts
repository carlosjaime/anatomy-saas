import type { OrganId } from "../../lib/anatomy-data";
import type { ArticleText } from "../types";

/** English encyclopedia articles. `related` links live in the shared base data. */
export const articlesEnUS: Record<OrganId, ArticleText> = {
  heart: {
    etymology: "From Latin cor, cordis; the prefix “cardio-” comes from Greek kardía.",
    sections: {
      anatomy:
        "A hollow muscular organ shaped like an inverted cone, divided into four chambers: two atria and two ventricles. The interatrial and interventricular septa separate the right (venous) circulation from the left (arterial) one. Four valves — tricuspid, pulmonary, mitral and aortic — keep blood flowing in one direction.",
      relations:
        "It occupies the middle mediastinum, wrapped in the pericardium. Anteriorly it relates to the sternum and costal cartilages; posteriorly to the esophagus and descending aorta; laterally to the lungs and pleurae; its diaphragmatic surface rests on the central tendon of the diaphragm.",
      physiology:
        "The sinoatrial node generates the impulse, which travels to the atrioventricular node, the bundle of His and the Purkinje fibers. Each cardiac cycle alternates systole and diastole; at rest it ejects about 70 mL per beat, giving a cardiac output of roughly 5 L/min.",
      histology:
        "The wall has three layers: endocardium, myocardium and epicardium. Cardiomyocytes are striated, branched cells with one or two central nuclei, joined by intercalated discs that contain gap junctions for synchronous electrical conduction.",
      neurovascular:
        "It receives autonomic innervation from the cardiac plexus: sympathetic input raises rate and contractility, while the vagus (parasympathetic) lowers them. Lymph drains to the tracheobronchial and anterior mediastinal nodes.",
      embryology:
        "It is the embryo's first functional organ: the primitive heart tube begins beating around day 22. Looping, septation and valve development occur between the fourth and eighth weeks; the foramen ovale and ductus arteriosus close after birth.",
      clinical:
        "Crushing chest pain radiating to the left arm or jaw suggests acute coronary syndrome; confirm with an electrocardiogram and serial troponins. Murmurs suggest valvular disease and are evaluated with echocardiography. Dyspnea with leg edema and jugular venous distension suggests heart failure.",
    },
  },
  brain: {
    etymology: "From Latin cerebrum; “encephalon” derives from Greek enképhalos, “within the head”.",
    sections: {
      anatomy:
        "Made up of two cerebral hemispheres joined by the corpus callosum. Each hemisphere is divided into frontal, parietal, temporal and occipital lobes plus the insula. The cortex (gray matter) covers the white matter, within which lie the basal nuclei, the thalamus and the ventricular system.",
      relations:
        "It sits in the cranial cavity, protected by the meninges — dura mater, arachnoid and pia mater — and suspended in cerebrospinal fluid. The tentorium cerebelli separates it from the cerebellum, and the falx cerebri runs between the hemispheres.",
      physiology:
        "It integrates sensory input, generates motor responses and supports higher functions such as language, memory and judgment. It depends almost entirely on glucose and oxygen: it consumes about 20% of the body's oxygen despite being 2% of its weight.",
      histology:
        "The cerebral cortex is organized into six layers (neocortex), with pyramidal and stellate neurons. Glial cells — astrocytes, oligodendrocytes, microglia and ependymal cells — provide support, myelinate axons and take part in immune defense.",
      neurovascular:
        "It is supplied by the internal carotid and vertebral arteries, which anastomose in the circle of Willis. It lacks conventional lymphatic vessels: the glymphatic system and meningeal lymphatics clear solutes toward the deep cervical nodes.",
      embryology:
        "It derives from the neural tube (ectoderm). Its rostral portion forms three primary vesicles — prosencephalon, mesencephalon and rhombencephalon; the prosencephalon gives rise to the telencephalon, from which the cerebral hemispheres develop.",
      clinical:
        "Sudden-onset focal neurological deficit (hemiparesis, aphasia, facial droop) suggests stroke: a time-critical emergency requiring an immediate non-contrast CT. A thunderclap headache warrants ruling out subarachnoid hemorrhage.",
    },
  },
  lungs: {
    etymology: "From Latin pulmo, pulmonis; the prefix “pneumo-” comes from Greek pneúmon.",
    sections: {
      anatomy:
        "Paired cone-shaped organs with an apex, a base, and costal and mediastinal surfaces. The right lung has three lobes (upper, middle and lower) separated by the oblique and horizontal fissures; the left has two lobes and the lingula. Bronchi, vessels and nerves enter and leave through the hilum.",
      relations:
        "Each lung is surrounded by the visceral and parietal pleura, separated by the pleural cavity. The base rests on the diaphragm; the mediastinal surface relates to the heart, which carves the cardiac notch into the left lung.",
      physiology:
        "Ventilation renews alveolar air and gas exchange occurs by diffusion across the alveolar-capillary membrane. The ventilation/perfusion ratio determines exchange efficiency. The lungs also filter microemboli and convert angiotensin I into angiotensin II.",
      histology:
        "The bronchial tree is lined by ciliated pseudostratified columnar epithelium with goblet cells. Alveoli are formed by type I pneumocytes (gas exchange) and type II pneumocytes (surfactant production), with alveolar macrophages for defense.",
      neurovascular:
        "They have a dual circulation: functional (pulmonary arteries) and nutritive (bronchial arteries). The pulmonary plexus receives vagal fibers (bronchoconstriction) and sympathetic fibers (bronchodilation). Lymph drains to the bronchopulmonary and tracheobronchial nodes.",
      embryology:
        "They arise from the respiratory diverticulum of the foregut (endoderm) in the fourth week. They pass through the pseudoglandular, canalicular, saccular and alveolar stages; sufficient surfactant production is reached around weeks 34–36.",
      clinical:
        "Fever with productive cough and localized crackles suggests pneumonia; confirm with a chest X-ray. Wheezing reversible with bronchodilators points to asthma, and non-reversible obstruction on spirometry (FEV1/FVC < 0.70) in smokers points to COPD.",
    },
  },
  liver: {
    etymology: "From Old English lifer; the prefix “hepato-” comes from Greek hêpar.",
    sections: {
      anatomy:
        "It is the body's largest gland. Anatomically it has right, left, quadrate and caudate lobes, and functionally eight Couinaud segments defined by the distribution of the portal vein, hepatic artery and bile ducts.",
      relations:
        "It occupies the right hypochondrium and part of the epigastrium, beneath the dome of the diaphragm. Its visceral surface relates to the stomach, duodenum, hepatic flexure of the colon, right kidney and the gallbladder, which sits in a fossa on its inferior surface.",
      physiology:
        "It regulates carbohydrate, lipid and protein metabolism; synthesizes albumin and clotting factors; stores glycogen, iron and vitamins; biotransforms drugs and toxins; and produces 500 to 1,000 mL of bile a day.",
      histology:
        "Its structural unit is the hexagonal hepatic lobule, with a central vein and portal tracts at the corners. Hepatocytes form plates separated by sinusoids, where Kupffer cells phagocytose and stellate cells store vitamin A.",
      neurovascular:
        "It has a dual supply: the portal vein provides about 75% of the flow and the hepatic artery the rest. It is innervated by the hepatic plexus (sympathetic and vagal). It produces much of the body's lymph, which drains to the hepatic and celiac nodes.",
      embryology:
        "It arises from the hepatic diverticulum of the foregut in the fourth week. Hepatocyte cords invade the septum transversum; during fetal life it is an important hematopoietic organ.",
      clinical:
        "Jaundice with elevated transaminases suggests hepatocellular injury; if alkaline phosphatase and GGT predominate, it points to cholestasis. Stigmata of chronic liver disease — spider angiomas, palmar erythema, ascites — suggest cirrhosis; ultrasound and elastography assess fibrosis.",
    },
  },
  kidneys: {
    etymology: "From Middle English kidenei; the prefix “nephro-” comes from Greek nephrós and “renal” from Latin renes.",
    sections: {
      anatomy:
        "Paired bean-shaped organs about 11 cm long. They have an outer cortex and a medulla formed by renal pyramids that empty into minor and major calyces, which join to form the renal pelvis and continue as the ureter.",
      relations:
        "They are retroperitoneal, between the T12 and L3 vertebrae; the right one sits slightly lower because of the liver. Each is wrapped by the renal capsule, perirenal fat and renal fascia. The adrenal glands rest on their upper poles.",
      physiology:
        "They filter about 180 L of plasma a day and reabsorb almost 99%. They regulate extracellular volume, electrolytes and acid-base balance; secrete renin and erythropoietin; and activate vitamin D (calcitriol).",
      histology:
        "The nephron is the functional unit: renal corpuscle (glomerulus and Bowman's capsule), proximal convoluted tubule, loop of Henle, distal convoluted tubule and collecting duct. The juxtaglomerular apparatus senses changes in pressure and sodium.",
      neurovascular:
        "They receive about 20% of cardiac output through the renal arteries. The sympathetic renal plexus regulates flow and renin release. Lymph drains to the lumbar (para-aortic) nodes.",
      embryology:
        "They develop from intermediate mesoderm in three successive generations: pronephros, mesonephros and metanephros. The metanephros, induced by the ureteric bud, forms the definitive kidney and “ascends” from the pelvis to the lumbar region.",
      clinical:
        "Colicky flank pain radiating to the groin with hematuria suggests a ureteral stone; non-contrast CT is the test of choice. Chronic kidney disease is staged by glomerular filtration rate and albuminuria; diabetes and hypertension are its leading causes in Mexico.",
    },
  },
  eyeball: {
    etymology: "From Old English ēage; the prefix “ophthalmo-” comes from Greek ophthalmós and “ocular” from Latin oculus.",
    sections: {
      anatomy:
        "A sphere of about 24 mm made of three tunics: fibrous (sclera and cornea), vascular or uvea (choroid, ciliary body and iris) and neural (retina). Inside are the aqueous humor, the lens and the vitreous body.",
      relations:
        "It sits in the bony orbit, surrounded by orbital fat and moved by six extraocular muscles: four recti and two obliques. The eyelids and conjunctiva protect it anteriorly; posteriorly, the optic nerve exits toward the optic canal.",
      physiology:
        "The cornea and lens focus light onto the retina; accommodation changes the curvature of the lens for near vision. Photoreceptors convert light into electrical signals that travel through the optic nerve to the occipital visual cortex.",
      histology:
        "The retina has ten layers. Rods enable vision in low light and cones color and detail vision; the fovea concentrates the cones. The cornea is avascular and is nourished by the aqueous humor and the tear film.",
      neurovascular:
        "It is supplied by the ophthalmic artery, a branch of the internal carotid; the central retinal artery is an end artery. It receives sensory fibers from the ophthalmic nerve (V1) and autonomic fibers controlling the pupil and accommodation. It has no conventional intraocular lymphatic drainage.",
      embryology:
        "It combines three origins: the optic vesicle of the diencephalon (neuroectoderm) forms the retina; surface ectoderm forms the lens and corneal epithelium; and mesenchyme forms the uvea and sclera.",
      clinical:
        "Sudden painless vision loss suggests retinal vascular occlusion or retinal detachment. A painful red eye with blurred vision and a fixed mid-dilated pupil suggests acute angle-closure glaucoma, an ophthalmologic emergency.",
    },
  },
  intestine: {
    etymology: "From Latin intestinum, “that which is within”; the prefix “entero-” comes from Greek énteron.",
    sections: {
      anatomy:
        "It is divided into the small intestine — duodenum, jejunum and ileum, 6 to 7 m long — and the large intestine — cecum with appendix, ascending, transverse, descending and sigmoid colon, rectum and anal canal — about 1.5 m long.",
      relations:
        "The jejunum and ileum hang from the mesentery within the peritoneal cavity. The duodenum is mostly retroperitoneal and wraps around the head of the pancreas. The colonic frame surrounds the loops of small intestine.",
      physiology:
        "The small intestine completes digestion and absorbs nutrients: iron and calcium in the duodenum, most nutrients in the jejunum, and vitamin B12 and bile salts in the terminal ileum. The colon absorbs water and electrolytes and hosts the microbiota.",
      histology:
        "The wall has mucosa, submucosa, muscularis externa and serosa. In the small intestine, circular folds, villi and microvilli multiply the surface; the crypts of Lieberkühn renew the epithelium every 3–5 days. The colon lacks villi and is rich in goblet cells.",
      neurovascular:
        "It is supplied by the superior and inferior mesenteric arteries. The enteric nervous system — Meissner's and Auerbach's plexuses — coordinates motility autonomously. Lymph from the villi (lacteals) carries fats to the mesenteric nodes and the thoracic duct.",
      embryology:
        "It derives from the midgut and hindgut (endoderm). The primitive intestinal loop herniates physiologically into the umbilical cord in the sixth week, rotates 270° and returns to the abdomen around the tenth week.",
      clinical:
        "Periumbilical pain migrating to the right lower quadrant with fever suggests acute appendicitis. Chronic diarrhea with weight loss calls for ruling out celiac or inflammatory bowel disease; fecal occult blood after age 45 warrants colonoscopy.",
    },
  },
  pancreas: {
    etymology: "From Greek pán (all) and kréas (flesh): “all flesh”, for its appearance without cartilage or bone.",
    sections: {
      anatomy:
        "An elongated gland 12 to 15 cm long divided into head, uncinate process, neck, body and tail. The main pancreatic duct (of Wirsung) joins the common bile duct at the ampulla of Vater, which opens into the second part of the duodenum.",
      relations:
        "It is retroperitoneal and lies behind the stomach. The head is framed by the duodenum; the neck rests on the superior mesenteric vessels and the portal vein; the tail reaches the splenic hilum.",
      physiology:
        "Its exocrine portion secretes enzymes (amylase, lipase, trypsinogen) and bicarbonate to neutralize gastric acid. Its endocrine portion releases insulin, glucagon, somatostatin and pancreatic polypeptide to regulate blood glucose.",
      histology:
        "Serous acini with zymogen granules make up most of the gland. Scattered among them are the islets of Langerhans: β cells (insulin), α cells (glucagon), δ cells (somatostatin) and PP cells.",
      neurovascular:
        "It is supplied by branches of the splenic, gastroduodenal and superior mesenteric arteries (pancreaticoduodenal arcades). It receives vagal fibers that stimulate secretion and sympathetic fibers from the celiac plexus. Lymph drains to the pancreaticosplenic, celiac and superior mesenteric nodes.",
      embryology:
        "It forms from two foregut buds — dorsal and ventral. Rotation of the duodenum brings the ventral bud next to the dorsal one and they fuse; abnormal fusion produces pancreas divisum or annular pancreas.",
      clinical:
        "Severe epigastric pain radiating to the back like a band, with lipase above three times the upper limit, confirms acute pancreatitis; in Mexico, gallstones and alcohol are the most common causes. Painless jaundice with weight loss calls for ruling out cancer of the pancreatic head.",
    },
  },
  skin: {
    etymology: "From Old Norse skinn; the prefix “dermato-” comes from Greek dérma and “cutaneous” from Latin cutis.",
    sections: {
      anatomy:
        "It is the body's most extensive organ, with about 2 m² of surface. It has three layers — epidermis, dermis and hypodermis — and appendages such as hair follicles, sebaceous glands, eccrine and apocrine sweat glands, and nails.",
      relations:
        "It covers the entire body surface and becomes continuous with the mucous membranes at the natural orifices. The hypodermis attaches it to the superficial fascia and underlying muscles; its thickness ranges from 0.5 mm on the eyelids to more than 4 mm on the back.",
      physiology:
        "It acts as a physical, chemical and immune barrier; regulates temperature through sweat and dermal blood flow; synthesizes vitamin D under ultraviolet light; and senses touch, pressure, vibration, temperature and pain.",
      histology:
        "The epidermis is a keratinized stratified squamous epithelium with five strata: basale, spinosum, granulosum, lucidum (thick skin only) and corneum. It contains keratinocytes, melanocytes, Langerhans cells and Merkel cells. The papillary and reticular dermis provide collagen and elastin.",
      neurovascular:
        "It is supplied by the deep and superficial dermal vascular plexuses. Its sensory innervation is distributed by dermatomes; Meissner's, Pacinian and Ruffini corpuscles detect different mechanical stimuli. Lymph drains to regional nodes (axillary, inguinal, cervical).",
      embryology:
        "The epidermis derives from surface ectoderm and the dermis from mesoderm. Melanocytes originate from the neural crest and migrate into the epidermis. The epidermal ridges that form fingerprints are established by about week 17.",
      clinical:
        "For a mole, the ABCDE rule — asymmetry, irregular borders, uneven color, diameter over 6 mm and evolution — points to melanoma and warrants dermoscopy and biopsy. An erythematous plaque with silvery scale on the elbows and knees suggests psoriasis.",
    },
  },
};
