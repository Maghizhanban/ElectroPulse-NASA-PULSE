export const SYSTEMS = [
  { id: 'skeletal', name: 'Skeleton', color: '#e2d9ba', description: 'Bones form the supporting framework of the body, protect organs, and provide attachment points for muscles.' },
  { id: 'muscular', name: 'Muscles', color: '#a85b50', description: 'Skeletal muscles generate movement by pulling on their attachments. Microgravity causes rapid postural atrophy in antigravity soleus fibers.' },
  { id: 'cardiac', name: 'Heart', color: '#b96760', description: 'The heart is a muscular pump. Microgravity causes cephalad fluid shifts, increasing right atrial volume and triggering neurohumoral diuresis.' },
  { id: 'sensory', name: 'Sensory / Eye', color: '#00e5ff', description: 'Structures supporting sight and balance. Microgravity cephalad venous engorgement raises ICP, causing optic disc edema (SANS).' },
  { id: 'arterial', name: 'Arteries', color: '#ff4d4d', description: 'Arteries deliver oxygenated blood. Cephalad fluid redistribution causes jugular and carotid venous distention on orbit.' },
  { id: 'venous', name: 'Veins', color: '#38bdf8', description: 'Veins return blood toward the heart. Thoracic central venous pressure and internal jugular stagnation are actively monitored.' },
  { id: 'nervous', name: 'Nervous System', color: '#fbbf24', description: 'The brain and spinal cord regulate autonomic balance, sensorimotor adaptation, and space motion sickness (SAS).' },
  { id: 'respiratory', name: 'Respiratory', color: '#b98991', description: 'Conducts gas exchange. Cabin CO2 levels (>2.5 mmHg) can induce mild hypercapnic headaches and visual changes.' },
  { id: 'digestive', name: 'Digestive', color: '#b8916b', description: 'Processes nutrients. Microgravity causes gastrointestinal transit delays and microbiome shifts.' },
  { id: 'urinary', name: 'Urinary / Kidneys', color: '#b47961', description: 'Filters blood and regulates fluid balance. Hypercalciuria from bone demineralization increases nephrolithiasis risk.' },
  { id: 'lymphatic', name: 'Lymphatic', color: '#879f7c', description: 'Returns interstitial fluid to circulation. Cephalad edema alters mucosal lymphatic drainage.' },
  { id: 'endocrine', name: 'Endocrine', color: '#c5a09a', description: 'Secretes regulatory hormones. Microgravity suppresses erythropoietin and alters cortisol and insulin.' },
  { id: 'reproductive', name: 'Reproductive', color: '#bda098', description: 'Endocrine and reproductive tissue monitored for cosmic radiation particle tracks.' },
  { id: 'integumentary', name: 'Body Surface / Skin', color: '#ba9b7d', description: 'Outer skin boundary. Microgravity causes stratum corneum thinning, dryness, and delayed wound healing.' },
  { id: 'connective', name: 'Connective Tissue', color: '#aec3bb', description: 'Cartilage, tendons, and ligaments. Spinal intervertebral disc unloading causes up to 5cm height elongation.' },
];

export const DEFAULT_VISIBLE = [
  'cardiac', 'sensory', 'skeletal', 'muscular', 'arterial', 'venous',
  'nervous', 'respiratory', 'digestive', 'urinary', 'lymphatic', 'endocrine',
  'reproductive', 'connective'
];

export const EXPLANATIONS = {
  'heart': 'Central cardiovascular pump. In 0-G, ~1.8L of blood redistributes headward, causing facial puffiness, carotid dilation, and baroreflex deconditioning.',
  'liver': 'Metabolic center. Spaceflight shifts hepatic glycogen synthesis and alters xenobiotic drug clearance rates.',
  'brain': 'Central nervous system. Upward brain displacement in microgravity crowds the vertex and tightens the superior sagittal sinus.',
  'optic nerve': 'Vulnerable to SANS. Microgravity venous congestion increases retrobulbar subarachnoid pressure, flattening the posterior globe and elevating optic disc margins.',
  'lumbar vertebra': 'High-risk trabecular bone loss site (-1.1% to -1.5% BMD per month in 0-G without high-load eccentric ARED resistive countermeasure).',
  'soleus muscle': 'Primary slow-twitch antigravity postural muscle. Exhibits up to 20% volume loss during long-duration flight if not exercised under axial load.',
  'kidney': 'Excretes mobilised skeletal calcium. In microgravity, astronaut urinary calcium output increases significantly, elevating renal stone hazard.',
  'internal jugular vein': 'Experiences retrograde flow or stagnant thrombosis during extended orbital missions due to cephalad venous hypertension.'
};

export function explanation(name, system) {
  if (!name) return '';
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(EXPLANATIONS)) {
    if (lower.includes(key)) return val;
  }
  const sys = SYSTEMS.find(s => s.id === system);
  return sys ? sys.description : 'Spaceflight anatomical reference model.';
}
