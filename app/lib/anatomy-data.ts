export type OrganId =
  | "heart"
  | "brain"
  | "lungs"
  | "liver"
  | "kidneys"
  | "eyeball"
  | "intestine"
  | "pancreas"
  | "skin";

export type Hotspot = {
  id: string;
  label: string;
  detail: string;
  position: [number, number, number];
  color: string;
};

export type Quiz = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Organ = {
  id: OrganId;
  name: string;
  scientificName: string;
  system: string;
  model: string;
  icon: string;
  accent: string;
  description: string;
  poetic: string;
  size: string;
  weight: string;
  location: string;
  function: string;
  dailyFact: string;
  medical: string;
  bloodSupply: string;
  /** Una frase memorable, mostrada en la nota "¿Sabías que...?". */
  funFact: string;
  tissue: string;
  comparison: string;
  conditions: string[];
  hotspots: Hotspot[];
  quiz: Quiz;
  /** Si existen ilustraciones en `/anatomy/<id>/*.webp`. Los órganos sin ellas
   *  recurren al glifo de acento en lugar de mostrar una imagen rota. */
  illustrated: boolean;
  /** Nivel de acceso en el plan SaaS: los órganos "pro" requieren suscripción. */
  tier: "free" | "pro";
};

export const organs: Organ[] = [
  {
    id: "heart",
    name: "Corazón",
    scientificName: "Cor",
    system: "Sistema cardiovascular",
    model: "/models/heart.glb",
    icon: "♥",
    accent: "#ee7c6a",
    description: "Un órgano muscular que bombea sangre por todo el cuerpo, entregando oxígeno y nutrientes a cada célula.",
    poetic: "La bomba incansable",
    size: "Aproximadamente el tamaño de tu puño",
    weight: "250–350 g",
    location: "Detrás del esternón, ligeramente a la izquierda",
    function: "Hace circular la sangre oxigenada",
    dailyFact: "Late cerca de 100 000 veces al día",
    medical: "Su ritmo eléctrico coordina cada latido del corazón.",
    bloodSupply: "Arterias coronarias izquierda y derecha",
    funFact: "Late aproximadamente 2500 millones de veces a lo largo de una vida, y comienza a hacerlo antes de nacer.",
    tissue: "Tejido muscular cardíaco",
    comparison: "Corazón vs. cerebro",
    conditions: ["Enfermedad coronaria", "Arritmia", "Valvulopatías cardíacas", "Insuficiencia cardíaca", "Miocardiopatía", "Miocarditis", "Fibrilación auricular", "Cardiopatías congénitas"],
    illustrated: true,
    tier: "free",
    quiz: {
      question: "¿Cuál de las siguientes afirmaciones describe mejor al corazón?",
      options: [
        "Es un órgano muscular que bombea sangre por todo el cuerpo",
        "Es una glándula que produce insulina",
        "Es un músculo que solo se activa durante el sueño",
      ],
      correctIndex: 0,
      explanation: "El corazón es un órgano muscular hueco que impulsa la sangre por el sistema circulatorio, entregando oxígeno y nutrientes a cada célula.",
    },
    hotspots: [
      { id: "aorta", label: "Aorta", detail: "Arteria principal", position: [-0.35, 1.65, 0.55], color: "#ee7c6a" },
      { id: "left-atrium", label: "Aurícula izquierda", detail: "Recibe sangre oxigenada", position: [0.82, 0.65, 0.5], color: "#f2a33b" },
      { id: "right-atrium", label: "Aurícula derecha", detail: "Recibe sangre venosa", position: [-0.9, 0.35, 0.55], color: "#6393d8" },
      { id: "left-ventricle", label: "Ventrículo izquierdo", detail: "Bombea hacia el cuerpo", position: [0.7, -0.75, 0.65], color: "#f2a33b" },
      { id: "right-ventricle", label: "Ventrículo derecho", detail: "Bombea hacia los pulmones", position: [-0.65, -0.68, 0.66], color: "#ee7c6a" },
      { id: "mitral", label: "Válvula mitral", detail: "Evita el reflujo de sangre", position: [0.18, -1.35, 0.48], color: "#d89bc4" },
    ],
  },
  {
    id: "brain",
    name: "Cerebro",
    scientificName: "Encephalon",
    system: "Sistema nervioso",
    model: "/models/brain.glb",
    icon: "◉",
    accent: "#c58696",
    description: "El centro de mando del cuerpo, que integra la sensación, la memoria, la emoción y el movimiento preciso.",
    poetic: "El universo interior",
    size: "Aproximadamente dos puños cerrados",
    weight: "1.3–1.4 kg",
    location: "Protegido dentro del cráneo",
    function: "Procesa y coordina señales nerviosas",
    dailyFact: "Consume cerca del 20 % de la energía del cuerpo",
    medical: "Miles de millones de neuronas se comunican mediante señales eléctricas y químicas.",
    bloodSupply: "Arterias carótidas internas y vertebrales",
    funFact: "No tiene receptores de dolor propios: un dolor de cabeza se siente en los tejidos que lo rodean.",
    tissue: "Corteza cerebral",
    comparison: "Cerebro vs. ojo",
    conditions: ["Migraña", "Accidente cerebrovascular", "Enfermedad neurodegenerativa", "Epilepsia", "Traumatismo craneoencefálico", "Meningitis", "Esclerosis múltiple", "Aneurisma cerebral"],
    illustrated: true,
    tier: "free",
    quiz: {
      question: "¿Qué lóbulo cerebral se encarga principalmente de la planificación y el movimiento voluntario?",
      options: ["Lóbulo frontal", "Lóbulo occipital", "Lóbulo temporal"],
      correctIndex: 0,
      explanation: "El lóbulo frontal coordina la planificación, el juicio y el control del movimiento voluntario.",
    },
    hotspots: [
      { id: "frontal", label: "Lóbulo frontal", detail: "Planificación y movimiento", position: [-0.7, 0.65, 0.8], color: "#ee7c6a" },
      { id: "parietal", label: "Lóbulo parietal", detail: "Integración sensorial", position: [0.15, 1.1, 0.65], color: "#f2a33b" },
      { id: "temporal", label: "Lóbulo temporal", detail: "Memoria y audición", position: [0.75, -0.1, 0.82], color: "#6393d8" },
      { id: "cerebellum", label: "Cerebelo", detail: "Equilibrio y coordinación", position: [0.72, -0.9, 0.55], color: "#d89bc4" },
    ],
  },
  {
    id: "lungs",
    name: "Pulmones",
    scientificName: "Pulmones",
    system: "Sistema respiratorio",
    model: "/models/lungs.glb",
    icon: "◍",
    accent: "#dd8f8b",
    description: "Órganos pares que captan aire e intercambian oxígeno por dióxido de carbono a través de una superficie vasta y delicada.",
    poetic: "El aliento de vida",
    size: "Cada uno mide unos 25 cm de alto",
    weight: "Cerca de 1 kg entre los dos",
    location: "A ambos lados del corazón, dentro de la caja torácica",
    function: "Intercambia oxígeno por dióxido de carbono",
    dailyFact: "Mueve unos 11 000 L de aire al día",
    medical: "Los alvéolos pliegan una superficie de intercambio del tamaño de una pista de tenis dentro del tórax.",
    bloodSupply: "Arterias pulmonares y bronquiales",
    funFact: "El pulmón derecho tiene tres lóbulos y el izquierdo solo dos, dejando espacio para el corazón.",
    tissue: "Tejido alveolar",
    comparison: "Pulmones vs. corazón",
    conditions: ["Asma", "EPOC", "Neumonía", "Embolia pulmonar", "Fibrosis pulmonar", "Bronquitis", "Fibrosis quística", "Cáncer de pulmón"],
    illustrated: true,
    tier: "free",
    quiz: {
      question: "¿Cuál es la función principal de los pulmones?",
      options: ["Filtrar la sangre", "Intercambiar oxígeno por dióxido de carbono", "Producir insulina"],
      correctIndex: 1,
      explanation: "En los alvéolos pulmonares, el oxígeno pasa a la sangre y el dióxido de carbono se elimina del cuerpo.",
    },
    hotspots: [
      { id: "trachea", label: "Tráquea", detail: "Conduce el aire a los pulmones", position: [0, 1.6, 0.2], color: "#6393d8" },
      { id: "right-lung", label: "Pulmón derecho", detail: "Tres lóbulos", position: [-1.2, 0.1, 0.7], color: "#ee7c6a" },
      { id: "left-lung", label: "Pulmón izquierdo", detail: "Dos lóbulos, espacio para el corazón", position: [1.2, 0.1, 0.7], color: "#f2a33b" },
      { id: "bronchus", label: "Bronquio", detail: "Vía aérea ramificada", position: [-0.03, 0.3, 0.35], color: "#d89bc4" },
      { id: "base", label: "Base pulmonar", detail: "Apoyada sobre el diafragma", position: [-1.14, -1.2, 1], color: "#7fa88a" },
    ],
  },
  {
    id: "liver",
    name: "Hígado",
    scientificName: "Hepar",
    system: "Sistema digestivo",
    model: "/models/liver.glb",
    icon: "≈",
    accent: "#b86858",
    description: "Un órgano metabólico notable que filtra la sangre, procesa nutrientes y produce bilis.",
    poetic: "El alquimista silencioso",
    size: "Aproximadamente el tamaño de un balón de fútbol americano",
    weight: "1.4–1.6 kg",
    location: "Abdomen superior derecho",
    function: "Metabolismo, desintoxicación y producción de bilis",
    dailyFact: "Realiza más de 500 funciones distintas",
    medical: "Puede regenerar una porción considerable de tejido perdido.",
    bloodSupply: "Arteria hepática y vena porta",
    funFact: "Es el único órgano humano capaz de recuperar su tamaño completo a partir de una fracción de sí mismo.",
    tissue: "Lobulillos hepáticos",
    comparison: "Hígado vs. intestino",
    conditions: ["Hígado graso", "Hepatitis", "Cirrosis", "Cálculos biliares", "Hemocromatosis", "Cáncer de hígado", "Hepatitis autoinmune", "Hipertensión portal"],
    illustrated: true,
    tier: "free",
    quiz: {
      question: "¿Qué característica hace único al hígado entre los órganos humanos?",
      options: ["No tiene vasos sanguíneos", "Puede regenerarse hasta su tamaño completo", "No puede enfermar"],
      correctIndex: 1,
      explanation: "El hígado es el único órgano humano capaz de regenerar su masa completa a partir de una fracción del tejido original.",
    },
    hotspots: [
      { id: "right-lobe", label: "Lóbulo derecho", detail: "El lóbulo hepático más grande", position: [-0.75, 0.35, 0.75], color: "#ee7c6a" },
      { id: "left-lobe", label: "Lóbulo izquierdo", detail: "Cruza la línea media", position: [0.85, 0.25, 0.75], color: "#f2a33b" },
      { id: "portal", label: "Vena porta", detail: "Aporte rico en nutrientes", position: [0.1, -0.3, 0.82], color: "#6393d8" },
    ],
  },
  {
    id: "kidneys",
    name: "Riñones",
    scientificName: "Renes",
    system: "Sistema urinario",
    model: "/models/kidneys.glb",
    icon: "∞",
    accent: "#c96963",
    description: "Órganos pares de filtración que regulan líquidos, electrolitos, presión arterial y eliminación de desechos.",
    poetic: "Los filtros maestros",
    size: "Cada uno del tamaño de un mouse de computadora",
    weight: "120–170 g cada uno",
    location: "A ambos lados de la columna, debajo de las costillas",
    function: "Filtra la sangre y forma la orina",
    dailyFact: "Filtra unos 180 L de líquido al día",
    medical: "Las nefronas ajustan con precisión la química del torrente sanguíneo.",
    bloodSupply: "Arterias renales",
    funFact: "Recuperan casi todo lo que filtran: solo 1–2 L salen del cuerpo como orina.",
    tissue: "Corteza renal",
    comparison: "Riñones vs. hígado",
    conditions: ["Cálculos renales", "Enfermedad renal crónica", "Infección urinaria", "Glomerulonefritis", "Riñón poliquístico", "Hipertensión renal", "Lesión renal aguda", "Síndrome nefrótico"],
    illustrated: true,
    tier: "pro",
    quiz: {
      question: "¿Cuál es la función principal de los riñones?",
      options: ["Producir bilis", "Bombear sangre", "Filtrar la sangre y formar orina"],
      correctIndex: 2,
      explanation: "Los riñones filtran el plasma sanguíneo, regulan el equilibrio de líquidos y electrolitos, y forman la orina.",
    },
    hotspots: [
      { id: "cortex", label: "Corteza renal", detail: "Capa filtrante externa", position: [-0.9, 0.55, 0.7], color: "#ee7c6a" },
      { id: "medulla", label: "Médula renal", detail: "Concentra la orina", position: [0.85, 0.2, 0.7], color: "#f2a33b" },
      { id: "ureter", label: "Uréter", detail: "Transporta la orina", position: [0.4, -1.1, 0.5], color: "#6393d8" },
    ],
  },
  {
    id: "eyeball",
    name: "Ojo",
    scientificName: "Oculus",
    system: "Sistema sensorial",
    model: "/models/eyeball.glb",
    icon: "⊙",
    accent: "#7294b9",
    description: "Un órgano sensorial de precisión que convierte la luz enfocada en señales neuronales interpretadas como visión.",
    poetic: "Una ventana hecha de luz",
    size: "Aproximadamente 24 mm de diámetro",
    weight: "Alrededor de 7.5 g",
    location: "Dentro de la órbita ósea",
    function: "Capta y enfoca la luz",
    dailyFact: "Realiza miles de pequeños movimientos al día",
    medical: "La retina es una extensión del sistema nervioso central.",
    bloodSupply: "Arteria oftálmica",
    funFact: "La córnea no tiene vasos sanguíneos: obtiene oxígeno directamente del aire.",
    tissue: "Capas de la retina",
    comparison: "Ojo vs. cerebro",
    conditions: ["Miopía", "Cataratas", "Glaucoma", "Degeneración macular", "Desprendimiento de retina", "Ojo seco", "Astigmatismo", "Conjuntivitis"],
    illustrated: true,
    tier: "pro",
    quiz: {
      question: "¿Qué estructura del ojo controla la cantidad de luz que entra?",
      options: ["La córnea", "El iris", "El nervio óptico"],
      correctIndex: 1,
      explanation: "El iris ajusta el tamaño de la pupila para regular cuánta luz entra al ojo.",
    },
    hotspots: [
      { id: "cornea", label: "Córnea", detail: "Superficie transparente de enfoque", position: [-0.94, 0.05, 1.47], color: "#6393d8" },
      { id: "iris", label: "Iris", detail: "Controla la entrada de luz", position: [-1.22, -0.53, 1.15], color: "#f2a33b" },
      { id: "optic", label: "Nervio óptico", detail: "Transmite señales visuales", position: [1.61, -0.18, 0.54], color: "#d89bc4" },
    ],
  },
  {
    id: "intestine",
    name: "Intestino",
    scientificName: "Intestinum",
    system: "Sistema digestivo",
    model: "/models/intestine.glb",
    icon: "§",
    accent: "#d78b77",
    description: "Un conducto digestivo plegado donde se absorben los nutrientes y el microbioma sostiene la salud de todo el cuerpo.",
    poetic: "El jardín interior",
    size: "De 6 a 7 m extendido",
    weight: "Varía según su contenido",
    location: "Abdomen central e inferior",
    function: "Digestión y absorción de nutrientes",
    dailyFact: "Alberga billones de microorganismos",
    medical: "Su superficie se amplía mediante pliegues, vellosidades y microvellosidades.",
    bloodSupply: "Arterias mesentéricas superior e inferior",
    funFact: "Su revestimiento se renueva cada pocos días: la renovación de tejido más rápida del cuerpo.",
    tissue: "Vellosidades intestinales",
    comparison: "Intestino vs. hígado",
    conditions: ["Síndrome de intestino irritable", "Enfermedad inflamatoria intestinal", "Enfermedad celíaca", "Diverticulitis", "Obstrucción intestinal", "Pólipos colorrectales", "Enfermedad de Crohn", "Intolerancia a la lactosa"],
    illustrated: true,
    tier: "pro",
    quiz: {
      question: "¿Cuál es la función principal del intestino?",
      options: ["Absorber nutrientes durante la digestión", "Filtrar la sangre", "Producir hormonas tiroideas"],
      correctIndex: 0,
      explanation: "El intestino absorbe los nutrientes de los alimentos digeridos y aloja al microbioma intestinal.",
    },
    hotspots: [
      { id: "duodenum", label: "Duodeno", detail: "Primer segmento del intestino delgado", position: [0.6, 0.8, 0.75], color: "#f2a33b" },
      { id: "jejunum", label: "Yeyuno", detail: "Principal región de absorción", position: [-0.45, 0.1, 0.82], color: "#ee7c6a" },
      { id: "colon", label: "Colon", detail: "Recupera agua", position: [0.75, -0.55, 0.72], color: "#6393d8" },
    ],
  },
  {
    id: "pancreas",
    name: "Páncreas",
    scientificName: "Pancreas",
    system: "Sistema endocrino",
    model: "/models/pancreas.glb",
    icon: "◈",
    accent: "#c69a5e",
    description: "Una glándula de doble función que libera enzimas digestivas al intestino y las hormonas que regulan la glucosa en sangre.",
    poetic: "El regulador silencioso",
    size: "Aproximadamente 15 cm de largo",
    weight: "70–100 g",
    location: "Detrás del estómago, en el abdomen superior",
    function: "Enzimas digestivas e insulina",
    dailyFact: "Produce cerca de 1.5 L de jugo rico en enzimas al día",
    medical: "Los islotes de Langerhans liberan insulina y glucagón para equilibrar la glucosa en sangre.",
    bloodSupply: "Arterias esplénica y pancreaticoduodenal",
    funFact: "Apenas el 2 % produce hormonas; el resto se dedica a las enzimas digestivas.",
    tissue: "Acinos pancreáticos",
    comparison: "Páncreas vs. hígado",
    conditions: ["Pancreatitis", "Diabetes tipo 1", "Cáncer de páncreas", "Diabetes tipo 2", "Insuficiencia exocrina", "Quistes pancreáticos", "Pancreatitis biliar", "Insulinoma"],
    illustrated: true,
    tier: "pro",
    quiz: {
      question: "¿Qué produce el páncreas para regular el azúcar en sangre?",
      options: ["Ácido gástrico", "Bilis", "Insulina y glucagón"],
      correctIndex: 2,
      explanation: "Los islotes de Langerhans del páncreas liberan insulina y glucagón, que equilibran los niveles de glucosa en sangre.",
    },
    hotspots: [
      { id: "head", label: "Cabeza", detail: "Rodeada por el duodeno", position: [-1.32, -0.36, 0.55], color: "#ee7c6a" },
      { id: "body", label: "Cuerpo", detail: "Cruza la columna vertebral", position: [0.05, 0.25, 0.45], color: "#f2a33b" },
      { id: "tail", label: "Cola", detail: "Alcanza el bazo", position: [1.55, 0.3, 0.35], color: "#6393d8" },
      { id: "duct", label: "Conducto pancreático", detail: "Drena enzimas hacia el intestino", position: [-0.61, 0.39, 0.5], color: "#d89bc4" },
    ],
  },
  {
    id: "skin",
    name: "Piel",
    scientificName: "Integumentum",
    system: "Sistema tegumentario",
    model: "/models/skin.glb",
    icon: "▦",
    accent: "#c99277",
    description: "El órgano más grande del cuerpo: una barrera viva que percibe el tacto, retiene el agua y regula la temperatura.",
    poetic: "El límite vivo",
    size: "Cerca de 2 m² extendida",
    weight: "3.5–5 kg",
    location: "Cubre todo el cuerpo",
    function: "Protege, percibe y refrigera",
    dailyFact: "Descama alrededor de 500 millones de células al día",
    medical: "Tres capas —epidermis, dermis e hipodermis— cada una con una función distinta.",
    bloodSupply: "Plexo vascular dérmico",
    funFact: "Un solo centímetro cuadrado puede contener cientos de glándulas sudoríparas y metros de vasos sanguíneos.",
    tissue: "Capas epidérmicas",
    comparison: "Piel vs. intestino",
    conditions: ["Eccema", "Psoriasis", "Melanoma", "Acné vulgar", "Celulitis infecciosa", "Dermatitis de contacto", "Rosácea", "Vitíligo"],
    illustrated: true,
    tier: "pro",
    quiz: {
      question: "¿Cuántas capas principales tiene la piel?",
      options: ["Una capa única", "Tres: epidermis, dermis e hipodermis", "Cinco capas musculares"],
      correctIndex: 1,
      explanation: "La piel se organiza en tres capas principales: la epidermis, la dermis y la hipodermis, cada una con funciones distintas.",
    },
    hotspots: [
      { id: "epidermis", label: "Epidermis", detail: "Capa protectora externa", position: [-0.05, 0.88, 1.4], color: "#ee7c6a" },
      { id: "dermis", label: "Dermis", detail: "Nervios, vasos y glándulas", position: [0.29, 0.05, 1.4], color: "#f2a33b" },
      { id: "hypodermis", label: "Hipodermis", detail: "Grasa y aislamiento", position: [-0.39, -1.15, 1.4], color: "#6393d8" },
      { id: "follicle", label: "Folículo piloso", detail: "Ancla cada pelo", position: [0.89, -0.44, 1.4], color: "#d89bc4" },
    ],
  },
];

export const organById = Object.fromEntries(organs.map((organ) => [organ.id, organ])) as Record<OrganId, Organ>;
