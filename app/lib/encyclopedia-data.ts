import type { OrganId } from "./anatomy-data";

/**
 * Contenido de la enciclopedia anatómica.
 *
 * Vive separado de `anatomy-data` para que la ficha del visor (datos breves,
 * hotspots, cuestionario) no cargue con el texto largo de los artículos.
 * Solo importa tipos, así que se puede ejecutar y probar sin bundler.
 */

export type ArticleSectionId =
  | "anatomy"
  | "relations"
  | "physiology"
  | "histology"
  | "neurovascular"
  | "embryology"
  | "clinical";

export type OrganArticle = {
  etymology: string;
  sections: Record<ArticleSectionId, string>;
  related: readonly OrganId[];
};

export const ARTICLE_SECTIONS: readonly { id: ArticleSectionId; title: string }[] = [
  { id: "anatomy", title: "Anatomía descriptiva" },
  { id: "relations", title: "Relaciones anatómicas" },
  { id: "physiology", title: "Fisiología" },
  { id: "histology", title: "Histología" },
  { id: "neurovascular", title: "Inervación y drenaje linfático" },
  { id: "embryology", title: "Embriología" },
  { id: "clinical", title: "Correlación clínica" },
];

export const articles: Record<OrganId, OrganArticle> = {
  heart: {
    etymology: "Del latín cor, cordis; el prefijo «cardio-» proviene del griego kardía.",
    related: ["lungs", "brain", "kidneys"],
    sections: {
      anatomy:
        "Órgano muscular hueco con forma de cono invertido, dividido en cuatro cámaras: dos aurículas y dos ventrículos. El tabique interauricular e interventricular separa la circulación derecha (venosa) de la izquierda (arterial). Cuatro válvulas —tricúspide, pulmonar, mitral y aórtica— garantizan el flujo unidireccional.",
      relations:
        "Ocupa el mediastino medio, envuelto por el pericardio. Por delante se relaciona con el esternón y los cartílagos costales; por detrás, con el esófago y la aorta descendente; a los lados, con los pulmones y las pleuras; su cara diafragmática descansa sobre el centro tendinoso del diafragma.",
      physiology:
        "El nodo sinoauricular genera el impulso que se propaga al nodo auriculoventricular, el haz de His y las fibras de Purkinje. Cada ciclo cardíaco alterna sístole y diástole; en reposo expulsa unos 70 mL por latido, lo que da un gasto cardíaco cercano a 5 L/min.",
      histology:
        "La pared tiene tres capas: endocardio, miocardio y epicardio. Los cardiomiocitos son células estriadas, ramificadas y con uno o dos núcleos centrales, unidas por discos intercalares que contienen uniones comunicantes para la conducción eléctrica sincrónica.",
      neurovascular:
        "Recibe inervación autónoma del plexo cardíaco: el simpático aumenta frecuencia y contractilidad; el vago (parasimpático) las disminuye. La linfa drena hacia los ganglios traqueobronquiales y mediastínicos anteriores.",
      embryology:
        "Es el primer órgano funcional del embrión: el tubo cardíaco primitivo comienza a latir alrededor del día 22. El asa cardíaca, la tabicación y el desarrollo valvular ocurren entre la cuarta y la octava semana; el foramen oval y el conducto arterioso se cierran tras el nacimiento.",
      clinical:
        "El dolor torácico opresivo irradiado a brazo izquierdo o mandíbula orienta a síndrome coronario agudo; se confirma con electrocardiograma y troponinas seriadas. Los soplos sugieren valvulopatía y se estudian con ecocardiograma. La disnea con edema de miembros inferiores e ingurgitación yugular orienta a insuficiencia cardíaca.",
    },
  },
  brain: {
    etymology: "Del latín cerebrum; «encéfalo» deriva del griego enképhalos, «dentro de la cabeza».",
    related: ["eyeball", "heart", "skin"],
    sections: {
      anatomy:
        "Formado por dos hemisferios cerebrales unidos por el cuerpo calloso. Cada hemisferio se divide en lóbulos frontal, parietal, temporal, occipital e ínsula. La corteza (sustancia gris) recubre la sustancia blanca, en cuyo interior se sitúan los núcleos basales, el tálamo y el sistema ventricular.",
      relations:
        "Se aloja en la cavidad craneal, protegido por las meninges —duramadre, aracnoides y piamadre— y suspendido en líquido cefalorraquídeo. El tentorio del cerebelo lo separa del cerebelo, y la hoz del cerebro, entre ambos hemisferios.",
      physiology:
        "Integra información sensorial, genera respuestas motoras y sostiene funciones superiores como lenguaje, memoria y juicio. Depende casi por completo de la glucosa y el oxígeno: consume cerca del 20 % del oxígeno corporal pese a representar el 2 % del peso.",
      histology:
        "La corteza cerebral se organiza en seis capas (neocorteza), con neuronas piramidales y estrelladas. Las células gliales —astrocitos, oligodendrocitos, microglía y células ependimarias— dan soporte, mielinizan axones y participan en la defensa inmune.",
      neurovascular:
        "Irrigado por las arterias carótidas internas y vertebrales, que se anastomosan en el polígono de Willis. Carece de vasos linfáticos convencionales: el sistema glinfático y los vasos linfáticos meníngeos eliminan solutos hacia los ganglios cervicales profundos.",
      embryology:
        "Deriva del tubo neural (ectodermo). Su porción rostral forma tres vesículas primarias —prosencéfalo, mesencéfalo y rombencéfalo—; el prosencéfalo da origen al telencéfalo, del que surgen los hemisferios cerebrales.",
      clinical:
        "El déficit neurológico focal de inicio súbito (hemiparesia, afasia, desviación de la comisura labial) sugiere evento vascular cerebral: es una urgencia tiempo-dependiente que requiere tomografía sin contraste inmediata. La cefalea «en trueno» obliga a descartar hemorragia subaracnoidea.",
    },
  },
  lungs: {
    etymology: "Del latín pulmo, pulmonis; el prefijo «neumo-» procede del griego pneúmon.",
    related: ["heart", "liver", "skin"],
    sections: {
      anatomy:
        "Órganos pares de forma cónica con vértice, base y caras costal y mediastínica. El pulmón derecho tiene tres lóbulos (superior, medio e inferior) separados por las cisuras oblicua y horizontal; el izquierdo tiene dos lóbulos y la língula. Por el hilio entran y salen bronquios, vasos y nervios.",
      relations:
        "Cada pulmón está rodeado por la pleura visceral y parietal, separadas por la cavidad pleural. La base descansa sobre el diafragma; la cara mediastínica se relaciona con el corazón, que imprime la escotadura cardíaca en el pulmón izquierdo.",
      physiology:
        "La ventilación renueva el aire alveolar y el intercambio gaseoso ocurre por difusión a través de la membrana alveolocapilar. La relación ventilación/perfusión determina la eficiencia del intercambio. Además, filtran microémbolos y convierten la angiotensina I en angiotensina II.",
      histology:
        "El árbol bronquial está revestido por epitelio cilíndrico seudoestratificado ciliado con células caliciformes. Los alvéolos se forman por neumocitos tipo I (intercambio gaseoso) y tipo II (producen surfactante), con macrófagos alveolares como defensa.",
      neurovascular:
        "Tienen doble circulación: funcional (arterias pulmonares) y nutricia (arterias bronquiales). El plexo pulmonar recibe fibras vagales (broncoconstricción) y simpáticas (broncodilatación). La linfa drena a los ganglios broncopulmonares y traqueobronquiales.",
      embryology:
        "Surgen del divertículo respiratorio del intestino anterior (endodermo) en la cuarta semana. Atraviesan las etapas seudoglandular, canalicular, sacular y alveolar; la producción suficiente de surfactante se alcanza hacia las semanas 34–36.",
      clinical:
        "La fiebre con tos productiva y estertores crepitantes localizados sugiere neumonía; se confirma con radiografía de tórax. Las sibilancias reversibles con broncodilatador orientan a asma, y la obstrucción no reversible en la espirometría (FEV1/FVC < 0.70) en fumadores, a EPOC.",
    },
  },
  liver: {
    etymology: "Del latín ficatum (iecur ficatum, hígado engordado con higos); «hepato-» procede del griego hêpar.",
    related: ["intestine", "pancreas", "kidneys"],
    sections: {
      anatomy:
        "Es la glándula más grande del cuerpo. Se divide anatómicamente en lóbulos derecho, izquierdo, cuadrado y caudado, y funcionalmente en ocho segmentos de Couinaud según la distribución de la vena porta, la arteria hepática y los conductos biliares.",
      relations:
        "Ocupa el hipocondrio derecho y parte del epigastrio, bajo la cúpula diafragmática. Su cara visceral se relaciona con el estómago, el duodeno, el ángulo hepático del colon, el riñón derecho y la vesícula biliar, alojada en una fosa de su cara inferior.",
      physiology:
        "Regula el metabolismo de carbohidratos, lípidos y proteínas; sintetiza albúmina y factores de coagulación; almacena glucógeno, hierro y vitaminas; biotransforma fármacos y toxinas; y produce de 500 a 1000 mL de bilis al día.",
      histology:
        "Su unidad estructural es el lobulillo hepático hexagonal, con una vena central y espacios porta en los vértices. Los hepatocitos se disponen en cordones separados por sinusoides, donde las células de Kupffer fagocitan y las células estrelladas almacenan vitamina A.",
      neurovascular:
        "Recibe un aporte dual: la vena porta aporta cerca del 75 % del flujo y la arteria hepática el resto. Su inervación procede del plexo hepático (simpático y vagal). Produce gran parte de la linfa corporal, que drena a los ganglios hepáticos y celíacos.",
      embryology:
        "Se origina del divertículo hepático del intestino anterior en la cuarta semana. Los cordones de hepatocitos invaden el septum transversum; en la vida fetal es un órgano hematopoyético importante.",
      clinical:
        "La ictericia con elevación de transaminasas sugiere daño hepatocelular; si predominan fosfatasa alcalina y GGT, orienta a colestasis. Los estigmas de hepatopatía crónica —arañas vasculares, eritema palmar, ascitis— sugieren cirrosis; el ultrasonido y la elastografía valoran la fibrosis.",
    },
  },
  kidneys: {
    etymology: "Del latín renes; «nefro-» procede del griego nephrós.",
    related: ["heart", "liver", "pancreas"],
    sections: {
      anatomy:
        "Órganos pares en forma de frijol, de unos 11 cm de longitud. Presentan una corteza externa y una médula formada por pirámides renales que desembocan en cálices menores y mayores, que confluyen en la pelvis renal y continúan como uréter.",
      relations:
        "Son retroperitoneales, entre las vértebras T12 y L3; el derecho está algo más bajo por la presencia del hígado. Cada uno está envuelto por la cápsula renal, la grasa perirrenal y la fascia renal. Las glándulas suprarrenales descansan sobre sus polos superiores.",
      physiology:
        "Filtran cerca de 180 L de plasma al día y reabsorben casi el 99 %. Regulan el volumen extracelular, los electrolitos y el equilibrio ácido-base; secretan renina y eritropoyetina, y activan la vitamina D (calcitriol).",
      histology:
        "La nefrona es su unidad funcional: corpúsculo renal (glomérulo y cápsula de Bowman), túbulo contorneado proximal, asa de Henle, túbulo contorneado distal y túbulo colector. El aparato yuxtaglomerular detecta cambios de presión y de sodio.",
      neurovascular:
        "Reciben cerca del 20 % del gasto cardíaco a través de las arterias renales. El plexo renal simpático regula el flujo y la liberación de renina. La linfa drena a los ganglios lumbares (paraaórticos).",
      embryology:
        "Se desarrollan del mesodermo intermedio en tres generaciones sucesivas: pronefros, mesonefros y metanefros. El metanefros, inducido por la yema ureteral, forma el riñón definitivo y «asciende» de la pelvis a la región lumbar.",
      clinical:
        "El dolor lumbar cólico irradiado a genitales con hematuria sugiere litiasis renoureteral; la tomografía sin contraste es el estudio de elección. La enfermedad renal crónica se estadifica por tasa de filtración glomerular y albuminuria; diabetes e hipertensión son sus causas principales en México.",
    },
  },
  eyeball: {
    etymology: "Del latín oculus; «oftalmo-» procede del griego ophthalmós.",
    related: ["brain", "skin", "heart"],
    sections: {
      anatomy:
        "Esfera de unos 24 mm formada por tres túnicas: fibrosa (esclerótica y córnea), vascular o úvea (coroides, cuerpo ciliar e iris) y nerviosa (retina). En su interior se encuentran el humor acuoso, el cristalino y el cuerpo vítreo.",
      relations:
        "Se aloja en la órbita ósea, rodeado de grasa orbitaria y movido por seis músculos extraoculares: cuatro rectos y dos oblicuos. Los párpados y la conjuntiva lo protegen por delante; por detrás emerge el nervio óptico hacia el canal óptico.",
      physiology:
        "La córnea y el cristalino enfocan la luz sobre la retina; la acomodación modifica la curvatura del cristalino para ver de cerca. Los fotorreceptores transforman la luz en señales eléctricas que viajan por el nervio óptico hasta la corteza visual occipital.",
      histology:
        "La retina tiene diez capas. Los bastones permiten la visión en baja luminosidad y los conos, la visión del color y del detalle; la fóvea concentra los conos. La córnea es avascular y se nutre del humor acuoso y de la película lagrimal.",
      neurovascular:
        "Irrigado por la arteria oftálmica, rama de la carótida interna; la arteria central de la retina es terminal. Recibe fibras sensitivas del nervio oftálmico (V1) y fibras autónomas que controlan la pupila y la acomodación. No tiene drenaje linfático intraocular convencional.",
      embryology:
        "Combina tres orígenes: la vesícula óptica del diencéfalo (neuroectodermo) forma la retina; el ectodermo superficial, el cristalino y el epitelio corneal; y el mesénquima, la úvea y la esclerótica.",
      clinical:
        "La pérdida visual súbita e indolora sugiere oclusión vascular retiniana o desprendimiento de retina. El ojo rojo doloroso con visión borrosa y pupila en midriasis media arreactiva orienta a glaucoma agudo de ángulo cerrado, una urgencia oftalmológica.",
    },
  },
  intestine: {
    etymology: "Del latín intestinum, «lo que está dentro»; «entero-» procede del griego énteron.",
    related: ["liver", "pancreas", "skin"],
    sections: {
      anatomy:
        "Se divide en intestino delgado —duodeno, yeyuno e íleon, de 6 a 7 m— e intestino grueso —ciego con apéndice, colon ascendente, transverso, descendente y sigmoides, recto y conducto anal—, de aproximadamente 1.5 m.",
      relations:
        "El yeyuno y el íleon cuelgan del mesenterio dentro de la cavidad peritoneal. El duodeno es mayormente retroperitoneal y abraza la cabeza del páncreas. El marco cólico rodea las asas del intestino delgado.",
      physiology:
        "El intestino delgado completa la digestión y absorbe nutrientes: hierro y calcio en el duodeno, la mayoría de los nutrientes en el yeyuno, y vitamina B12 y sales biliares en el íleon terminal. El colon absorbe agua y electrolitos y alberga la microbiota.",
      histology:
        "La pared tiene mucosa, submucosa, muscular externa y serosa. En el intestino delgado, pliegues circulares, vellosidades y microvellosidades multiplican la superficie; las criptas de Lieberkühn renuevan el epitelio cada 3–5 días. El colon carece de vellosidades y abunda en células caliciformes.",
      neurovascular:
        "Irrigado por las arterias mesentéricas superior e inferior. El sistema nervioso entérico —plexos de Meissner y Auerbach— coordina la motilidad de forma autónoma. La linfa de las vellosidades (quilíferos) transporta grasas hacia los ganglios mesentéricos y el conducto torácico.",
      embryology:
        "Deriva del intestino medio y posterior (endodermo). El asa intestinal primitiva se hernia fisiológicamente hacia el cordón umbilical en la sexta semana, rota 270° y regresa al abdomen hacia la décima semana.",
      clinical:
        "El dolor periumbilical que migra a fosa ilíaca derecha con fiebre sugiere apendicitis aguda. La diarrea crónica con pérdida de peso obliga a descartar enfermedad celíaca o inflamatoria intestinal; la sangre oculta en heces en mayores de 45 años requiere colonoscopía.",
    },
  },
  pancreas: {
    etymology: "Del griego pán (todo) y kréas (carne): «todo carne», por su aspecto sin cartílago ni hueso.",
    related: ["liver", "intestine", "kidneys"],
    sections: {
      anatomy:
        "Glándula alargada de 12 a 15 cm dividida en cabeza, proceso unciforme, cuello, cuerpo y cola. El conducto pancreático principal (de Wirsung) se une al colédoco en la ampolla de Vater, que desemboca en la segunda porción del duodeno.",
      relations:
        "Es retroperitoneal y está situado detrás del estómago. La cabeza queda enmarcada por el duodeno; el cuello se apoya sobre los vasos mesentéricos superiores y la vena porta; la cola alcanza el hilio del bazo.",
      physiology:
        "Su porción exocrina secreta enzimas (amilasa, lipasa, tripsinógeno) y bicarbonato para neutralizar el ácido gástrico. Su porción endocrina libera insulina, glucagón, somatostatina y polipéptido pancreático para regular la glucemia.",
      histology:
        "Los acinos serosos, con gránulos de cimógeno, constituyen la mayor parte de la glándula. Dispersos entre ellos se encuentran los islotes de Langerhans: células β (insulina), α (glucagón), δ (somatostatina) y PP.",
      neurovascular:
        "Irrigado por ramas de las arterias esplénica, gastroduodenal y mesentérica superior (arcadas pancreaticoduodenales). Recibe fibras vagales que estimulan la secreción y simpáticas del plexo celíaco. La linfa drena a los ganglios pancreatoesplénicos, celíacos y mesentéricos superiores.",
      embryology:
        "Se forma a partir de dos esbozos del intestino anterior —dorsal y ventral—. La rotación del duodeno lleva el esbozo ventral junto al dorsal y ambos se fusionan; una fusión anómala produce páncreas divisum o páncreas anular.",
      clinical:
        "El dolor epigástrico intenso irradiado «en cinturón» hacia la espalda, con lipasa mayor a tres veces el límite superior, confirma pancreatitis aguda; en México, la litiasis biliar y el alcohol son sus causas más frecuentes. La ictericia indolora con pérdida de peso obliga a descartar cáncer de cabeza de páncreas.",
    },
  },
  skin: {
    etymology: "Del latín pellis; «dermato-» procede del griego dérma.",
    related: ["intestine", "brain", "eyeball"],
    sections: {
      anatomy:
        "Es el órgano más extenso del cuerpo, con unos 2 m² de superficie. Tiene tres capas: epidermis, dermis e hipodermis, y anexos como folículos pilosos, glándulas sebáceas, glándulas sudoríparas ecrinas y apocrinas, y uñas.",
      relations:
        "Recubre toda la superficie corporal y se continúa con las mucosas en los orificios naturales. La hipodermis la une a la fascia superficial y a los músculos subyacentes; su grosor varía de 0.5 mm en los párpados a más de 4 mm en la espalda.",
      physiology:
        "Actúa como barrera física, química e inmunológica; regula la temperatura mediante el sudor y el flujo sanguíneo dérmico; sintetiza vitamina D bajo la luz ultravioleta y percibe tacto, presión, vibración, temperatura y dolor.",
      histology:
        "La epidermis es un epitelio plano estratificado queratinizado con cinco estratos: basal, espinoso, granuloso, lúcido (solo en piel gruesa) y córneo. Contiene queratinocitos, melanocitos, células de Langerhans y células de Merkel. La dermis papilar y reticular aporta colágeno y elastina.",
      neurovascular:
        "Irrigada por los plexos vasculares dérmicos profundo y superficial. Su inervación sensitiva se distribuye por dermatomas; los corpúsculos de Meissner, Pacini y Ruffini detectan distintos estímulos mecánicos. La linfa drena a los ganglios regionales (axilares, inguinales, cervicales).",
      embryology:
        "La epidermis deriva del ectodermo superficial y la dermis del mesodermo. Los melanocitos proceden de la cresta neural y migran a la epidermis. Las crestas epidérmicas que forman las huellas dactilares quedan establecidas hacia la semana 17.",
      clinical:
        "Ante un lunar, la regla ABCDE —asimetría, bordes irregulares, color heterogéneo, diámetro mayor de 6 mm y evolución— orienta a melanoma y justifica dermatoscopía y biopsia. La placa eritematosa con escama nacarada en codos y rodillas sugiere psoriasis.",
    },
  },
};

export type GlossaryEntry = {
  term: string;
  definition: string;
  organId?: OrganId;
};

export const glossary: readonly GlossaryEntry[] = [
  { term: "Acino", definition: "Unidad secretora en forma de racimo de una glándula exocrina; en el páncreas produce enzimas digestivas.", organId: "pancreas" },
  { term: "Alvéolo", definition: "Saco microscópico al final del árbol bronquial donde ocurre el intercambio de oxígeno y dióxido de carbono.", organId: "lungs" },
  { term: "Ampolla de Vater", definition: "Confluencia del colédoco y el conducto pancreático que desemboca en el duodeno.", organId: "pancreas" },
  { term: "Aorta", definition: "Arteria principal del cuerpo; nace del ventrículo izquierdo y distribuye sangre oxigenada.", organId: "heart" },
  { term: "Aurícula", definition: "Cámara superior del corazón que recibe la sangre que regresa por las venas.", organId: "heart" },
  { term: "Bilis", definition: "Secreción hepática que emulsiona las grasas y elimina bilirrubina y colesterol.", organId: "liver" },
  { term: "Bronquio", definition: "Conducto que lleva el aire desde la tráquea hacia el interior de cada pulmón.", organId: "lungs" },
  { term: "Cardiomiocito", definition: "Célula muscular cardíaca, estriada y ramificada, unida a sus vecinas por discos intercalares.", organId: "heart" },
  { term: "Cerebelo", definition: "Porción del encéfalo situada en la fosa posterior que coordina el equilibrio y el movimiento fino.", organId: "brain" },
  { term: "Cono", definition: "Fotorreceptor retiniano responsable de la visión del color y la agudeza visual.", organId: "eyeball" },
  { term: "Córnea", definition: "Capa transparente y avascular en la parte frontal del ojo que aporta la mayor parte del poder de enfoque.", organId: "eyeball" },
  { term: "Corteza cerebral", definition: "Capa externa de sustancia gris del cerebro, sede de las funciones cognitivas superiores.", organId: "brain" },
  { term: "Cristalino", definition: "Lente biconvexa del ojo que ajusta su curvatura para enfocar a distintas distancias.", organId: "eyeball" },
  { term: "Dermatoma", definition: "Área de piel inervada por las fibras sensitivas de una sola raíz nerviosa espinal.", organId: "skin" },
  { term: "Dermis", definition: "Capa de tejido conectivo bajo la epidermis que contiene vasos, nervios y anexos cutáneos.", organId: "skin" },
  { term: "Diástole", definition: "Fase del ciclo cardíaco en la que el miocardio se relaja y las cámaras se llenan de sangre.", organId: "heart" },
  { term: "Duodeno", definition: "Primer segmento del intestino delgado, donde llegan la bilis y el jugo pancreático.", organId: "intestine" },
  { term: "Epidermis", definition: "Capa más externa de la piel, formada por epitelio plano estratificado queratinizado.", organId: "skin" },
  { term: "Eritropoyetina", definition: "Hormona renal que estimula la producción de glóbulos rojos en la médula ósea.", organId: "kidneys" },
  { term: "Fóvea", definition: "Depresión central de la retina con la mayor densidad de conos; permite la visión más nítida.", organId: "eyeball" },
  { term: "Gasto cardíaco", definition: "Volumen de sangre que bombea el corazón por minuto; frecuencia cardíaca por volumen sistólico.", organId: "heart" },
  { term: "Glomérulo", definition: "Ovillo de capilares del riñón donde se filtra el plasma hacia la cápsula de Bowman.", organId: "kidneys" },
  { term: "Hepatocito", definition: "Célula funcional del hígado, encargada del metabolismo, la síntesis de proteínas y la producción de bilis.", organId: "liver" },
  { term: "Hilio", definition: "Región de un órgano por donde entran y salen vasos, nervios y conductos." },
  { term: "Hipodermis", definition: "Capa más profunda de la piel, compuesta principalmente por tejido adiposo.", organId: "skin" },
  { term: "Íleon", definition: "Segmento final del intestino delgado donde se absorben la vitamina B12 y las sales biliares.", organId: "intestine" },
  { term: "Insulina", definition: "Hormona de las células β pancreáticas que facilita la entrada de glucosa a los tejidos.", organId: "pancreas" },
  { term: "Iris", definition: "Diafragma pigmentado del ojo que regula el tamaño de la pupila y la entrada de luz.", organId: "eyeball" },
  { term: "Islotes de Langerhans", definition: "Agrupaciones de células endocrinas del páncreas que secretan insulina, glucagón y somatostatina.", organId: "pancreas" },
  { term: "Lobulillo hepático", definition: "Unidad estructural hexagonal del hígado organizada alrededor de una vena central.", organId: "liver" },
  { term: "Melanocito", definition: "Célula derivada de la cresta neural que produce melanina en la capa basal de la epidermis.", organId: "skin" },
  { term: "Meninges", definition: "Membranas que envuelven el encéfalo y la médula espinal: duramadre, aracnoides y piamadre.", organId: "brain" },
  { term: "Mesenterio", definition: "Pliegue peritoneal que fija el intestino a la pared posterior del abdomen y lleva sus vasos.", organId: "intestine" },
  { term: "Microbiota", definition: "Comunidad de microorganismos que habita el intestino y participa en la digestión y la inmunidad.", organId: "intestine" },
  { term: "Nefrona", definition: "Unidad funcional del riñón, formada por el corpúsculo renal y el sistema tubular.", organId: "kidneys" },
  { term: "Neumocito", definition: "Célula del epitelio alveolar: el tipo I permite el intercambio gaseoso y el tipo II produce surfactante.", organId: "lungs" },
  { term: "Neurona", definition: "Célula excitable del sistema nervioso que transmite información mediante señales eléctricas y químicas.", organId: "brain" },
  { term: "Nodo sinoauricular", definition: "Marcapasos natural del corazón, situado en la aurícula derecha.", organId: "heart" },
  { term: "Pericardio", definition: "Saco fibroseroso de doble capa que envuelve y protege al corazón.", organId: "heart" },
  { term: "Peristalsis", definition: "Contracciones musculares coordinadas que hacen avanzar el contenido por el tubo digestivo.", organId: "intestine" },
  { term: "Pleura", definition: "Membrana serosa de doble hoja que recubre los pulmones y la pared interna del tórax.", organId: "lungs" },
  { term: "Polígono de Willis", definition: "Anillo arterial en la base del encéfalo que conecta los sistemas carotídeo y vertebrobasilar.", organId: "brain" },
  { term: "Renina", definition: "Enzima renal que inicia el sistema renina-angiotensina-aldosterona para regular la presión arterial.", organId: "kidneys" },
  { term: "Retina", definition: "Capa nerviosa interna del ojo que transforma la luz en impulsos nerviosos.", organId: "eyeball" },
  { term: "Retroperitoneal", definition: "Situado detrás del peritoneo parietal, como los riñones, el páncreas y gran parte del duodeno." },
  { term: "Segmentos de Couinaud", definition: "Ocho segmentos funcionales del hígado definidos por su irrigación; guían la cirugía hepática.", organId: "liver" },
  { term: "Sinusoide", definition: "Capilar de pared discontinua, como los del hígado, que permite un intercambio amplio con la sangre.", organId: "liver" },
  { term: "Sístole", definition: "Fase del ciclo cardíaco en la que el miocardio se contrae y expulsa la sangre.", organId: "heart" },
  { term: "Surfactante", definition: "Mezcla de lípidos y proteínas que reduce la tensión superficial alveolar y evita el colapso pulmonar.", organId: "lungs" },
  { term: "Vellosidad intestinal", definition: "Proyección digitiforme de la mucosa del intestino delgado que amplía la superficie de absorción.", organId: "intestine" },
  { term: "Vena porta", definition: "Vena que lleva al hígado la sangre rica en nutrientes procedente del intestino y el bazo.", organId: "liver" },
  { term: "Ventrículo", definition: "Cámara inferior del corazón que impulsa la sangre hacia los pulmones o el resto del cuerpo.", organId: "heart" },
];

/** Normaliza para búsqueda: minúsculas y sin acentos («Hígado» → «higado»). */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Primera letra para el índice alfabético, sin acentos («Íleon» → «I»). */
export function indexLetter(term: string): string {
  return normalize(term).charAt(0).toUpperCase();
}

export type SearchableOrgan = {
  id: OrganId;
  name: string;
  scientificName: string;
  system: string;
  description: string;
  conditions: readonly string[];
  hotspots: readonly { label: string; detail: string }[];
};

export type SearchHit =
  | { kind: "organ"; organId: OrganId; title: string; snippet: string }
  | { kind: "section"; organId: OrganId; sectionId: ArticleSectionId; title: string; snippet: string }
  | { kind: "structure"; organId: OrganId; title: string; snippet: string }
  | { kind: "condition"; organId: OrganId; title: string; snippet: string }
  | { kind: "term"; organId?: OrganId; title: string; snippet: string };

const SNIPPET_RADIUS = 60;

/** Recorta un fragmento de `text` centrado en la primera coincidencia. */
function snippetAround(text: string, needle: string): string {
  const index = normalize(text).indexOf(needle);
  if (index < 0) return text.length > SNIPPET_RADIUS * 2 ? `${text.slice(0, SNIPPET_RADIUS * 2)}…` : text;
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(text.length, index + needle.length + SNIPPET_RADIUS);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

/**
 * Búsqueda de texto completo sobre órganos, secciones de artículos,
 * estructuras, condiciones y glosario. Insensible a mayúsculas y acentos.
 * Los resultados se ordenan por relevancia: título exacto, título, cuerpo.
 */
/** Contenido sobre el que se busca, en el idioma activo. */
export type SearchContent = {
  organs: readonly SearchableOrgan[];
  articles: Record<OrganId, Pick<OrganArticle, "sections">>;
  sections: readonly { id: ArticleSectionId; title: string }[];
  glossary: readonly GlossaryEntry[];
};

export function searchEncyclopedia(query: string, content: SearchContent, limit = 40): SearchHit[] {
  const needle = normalize(query);
  if (needle.length < 2) return [];

  const scored: { hit: SearchHit; score: number }[] = [];
  const titleScore = (title: string) => {
    const normalized = normalize(title);
    if (normalized === needle) return 3;
    if (normalized.startsWith(needle)) return 2.5;
    return normalized.includes(needle) ? 2 : 0;
  };

  for (const organ of content.organs) {
    const organTitle = titleScore(`${organ.name} ${organ.scientificName}`);
    const organBody = normalize(`${organ.system} ${organ.description}`).includes(needle) ? 1 : 0;
    if (organTitle || organBody) {
      scored.push({
        hit: { kind: "organ", organId: organ.id, title: organ.name, snippet: snippetAround(organ.description, needle) },
        score: Math.max(organTitle, organBody) + 0.5,
      });
    }

    const article = content.articles[organ.id];
    for (const { id, title } of content.sections) {
      const body = article.sections[id];
      if (normalize(body).includes(needle)) {
        scored.push({
          hit: { kind: "section", organId: organ.id, sectionId: id, title: `${organ.name} · ${title}`, snippet: snippetAround(body, needle) },
          score: 1,
        });
      }
    }

    for (const structure of organ.hotspots) {
      const score = titleScore(structure.label);
      if (score) {
        scored.push({
          hit: { kind: "structure", organId: organ.id, title: structure.label, snippet: `${structure.detail} · ${organ.name}` },
          score,
        });
      }
    }

    for (const condition of organ.conditions) {
      const score = titleScore(condition);
      if (score) {
        scored.push({
          hit: { kind: "condition", organId: organ.id, title: condition, snippet: organ.name },
          score: score - 0.25,
        });
      }
    }
  }

  for (const entry of content.glossary) {
    const score = titleScore(entry.term) || (normalize(entry.definition).includes(needle) ? 0.75 : 0);
    if (score) {
      scored.push({
        hit: { kind: "term", organId: entry.organId, title: entry.term, snippet: snippetAround(entry.definition, needle) },
        score,
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title, "es"))
    .slice(0, limit)
    .map(({ hit }) => hit);
}

export type StudyGuide = {
  /** Lo que el estudiante debe poder hacer al terminar la unidad. */
  objectives: readonly string[];
  /** Conceptos de alto rendimiento para exámenes (ENARM, departamentales). */
  highYield: readonly string[];
  /** Perla clínica breve para conectar anatomía y práctica. */
  pearl: string;
};

export const studyGuides: Record<OrganId, StudyGuide> = {
  heart: {
    objectives: [
      "Identificar las cuatro cámaras y las cuatro válvulas cardíacas en el modelo.",
      "Describir el trayecto del impulso eléctrico desde el nodo sinoauricular hasta las fibras de Purkinje.",
      "Relacionar cada arteria coronaria con el territorio miocárdico que irriga.",
    ],
    highYield: [
      "La coronaria derecha irriga el nodo sinoauricular en cerca del 60 % de las personas.",
      "Foco mitral: 5.º espacio intercostal izquierdo, línea medioclavicular.",
      "Gasto cardíaco = frecuencia cardíaca × volumen sistólico.",
    ],
    pearl: "Un infarto inferior (DII, DIII, aVF) suele comprometer la coronaria derecha: vigila bradicardia y bloqueos AV.",
  },
  brain: {
    objectives: [
      "Ubicar los lóbulos cerebrales y su función predominante.",
      "Reconocer los componentes del polígono de Willis y su importancia colateral.",
      "Correlacionar un déficit neurológico focal con el territorio vascular afectado.",
    ],
    highYield: [
      "Área de Broca (frontal inferior) → afasia motora; área de Wernicke (temporal superior) → afasia sensitiva.",
      "La arteria cerebral media es el territorio más afectado en el evento vascular cerebral isquémico.",
      "El líquido cefalorraquídeo se produce en los plexos coroideos (~500 mL/día).",
    ],
    pearl: "Hemiparesia faciobraquial con afasia sugiere oclusión de la arteria cerebral media izquierda.",
  },
  lungs: {
    objectives: [
      "Distinguir los lóbulos y cisuras de cada pulmón.",
      "Explicar la relación ventilación/perfusión y su efecto en la oxigenación.",
      "Describir la función de los neumocitos tipo I y tipo II.",
    ],
    highYield: [
      "El bronquio principal derecho es más corto, ancho y vertical: ahí van los cuerpos extraños aspirados.",
      "El surfactante (neumocitos tipo II) reduce la tensión superficial alveolar.",
      "Espirometría obstructiva: FEV1/FVC < 0.70 tras broncodilatador.",
    ],
    pearl: "La neumonía por aspiración en decúbito afecta con más frecuencia el segmento superior del lóbulo inferior derecho.",
  },
  liver: {
    objectives: [
      "Describir la segmentación funcional de Couinaud.",
      "Explicar el aporte vascular dual: vena porta y arteria hepática.",
      "Interpretar un patrón hepatocelular frente a uno colestásico en las pruebas de función hepática.",
    ],
    highYield: [
      "La vena porta aporta ~75 % del flujo hepático; la arteria hepática, ~25 %.",
      "Triada portal: vena porta, arteria hepática y conducto biliar.",
      "La zona 3 del acino (centrolobulillar) es la más sensible a la isquemia y a la toxicidad por paracetamol.",
    ],
    pearl: "Ascitis, várices esofágicas y esplenomegalia orientan a hipertensión portal: busca la causa de la cirrosis.",
  },
  kidneys: {
    objectives: [
      "Identificar las partes de la nefrona y la función de cada segmento.",
      "Explicar cómo se regula la tasa de filtración glomerular.",
      "Describir el sistema renina-angiotensina-aldosterona.",
    ],
    highYield: [
      "El túbulo contorneado proximal reabsorbe ~65 % del sodio filtrado.",
      "Los diuréticos de asa actúan en la rama ascendente gruesa (cotransportador Na-K-2Cl).",
      "Los riñones están entre T12 y L3; el derecho es más bajo por el hígado.",
    ],
    pearl: "En México, diabetes e hipertensión son las principales causas de enfermedad renal crónica: tamiza con albuminuria.",
  },
  eyeball: {
    objectives: [
      "Nombrar las tres túnicas del globo ocular y sus componentes.",
      "Describir la vía de formación y drenaje del humor acuoso.",
      "Explicar el reflejo fotomotor y su vía aferente y eferente.",
    ],
    highYield: [
      "El humor acuoso se produce en el cuerpo ciliar y drena por la malla trabecular y el canal de Schlemm.",
      "Reflejo fotomotor: aferencia por el nervio óptico (II), eferencia por el oculomotor (III).",
      "La fóvea contiene solo conos: máxima agudeza visual.",
    ],
    pearl: "Ojo rojo doloroso, visión borrosa y pupila en midriasis media arreactiva: sospecha glaucoma agudo y refiere de urgencia.",
  },
  intestine: {
    objectives: [
      "Diferenciar duodeno, yeyuno e íleon por su anatomía y función.",
      "Relacionar cada segmento con los nutrientes que absorbe.",
      "Describir la irrigación por las arterias mesentéricas superior e inferior.",
    ],
    highYield: [
      "Hierro y calcio se absorben en el duodeno; vitamina B12 y sales biliares en el íleon terminal.",
      "El ángulo de Treitz separa el tubo digestivo alto del bajo.",
      "El divertículo de Meckel sigue la regla de los 2: 2 % de la población, a 2 pies de la válvula ileocecal.",
    ],
    pearl: "Dolor periumbilical que migra a fosa ilíaca derecha: punto de McBurney y escala de Alvarado para apendicitis.",
  },
  pancreas: {
    objectives: [
      "Describir las porciones del páncreas y sus relaciones anatómicas.",
      "Distinguir la función exocrina de la endocrina y sus tipos celulares.",
      "Explicar el drenaje del conducto pancreático en la ampolla de Vater.",
    ],
    highYield: [
      "Células β → insulina; α → glucagón; δ → somatostatina.",
      "La cabeza del páncreas está enmarcada por el duodeno; la cola llega al hilio esplénico.",
      "Pancreatitis aguda: 2 de 3 criterios (dolor típico, lipasa > 3× el límite superior, imagen compatible).",
    ],
    pearl: "Ictericia indolora con vesícula palpable (signo de Courvoisier-Terrier) sugiere tumor de cabeza de páncreas.",
  },
  skin: {
    objectives: [
      "Identificar las capas de la piel y los estratos de la epidermis.",
      "Describir las funciones de barrera, termorregulación y síntesis de vitamina D.",
      "Aplicar la regla ABCDE en la evaluación de lesiones pigmentadas.",
    ],
    highYield: [
      "Los melanocitos derivan de la cresta neural y se ubican en el estrato basal.",
      "Regla de los nueves para estimar la superficie corporal quemada en adultos.",
      "El estrato lúcido solo existe en la piel gruesa (palmas y plantas).",
    ],
    pearl: "Un lunar que cambia de tamaño, forma o color merece dermatoscopía: la evolución (E) es el criterio más sensible.",
  },
};
