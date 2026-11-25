// ALL SUPPLIER, EMISSIONS AND RECOMMENDATION DATA IN THIS APP IS FOR DEMONSTRATION ONLY.
// The company names are fictional.

export const initialSuppliers = [
  { id: 1, name: 'Demo GreenSteel Works', country: 'India', material: 'Steel', risk: 'Medium', documents: 'Partial' },
  { id: 2, name: 'Demo Nordic Timber', country: 'Sweden', material: 'Timber', risk: 'Low', documents: 'Complete' },
  { id: 3, name: 'Demo Pacific Aluminium', country: 'China', material: 'Aluminium', risk: 'High', documents: 'Missing' },
  { id: 4, name: 'Demo Andes Coffee Co-op', country: 'Colombia', material: 'Coffee', risk: 'Medium', documents: 'Partial' },
  { id: 5, name: 'Demo Rhine Polymers', country: 'Germany', material: 'Plastic', risk: 'Low', documents: 'Complete' },
  { id: 6, name: 'Demo Delta Textiles', country: 'Bangladesh', material: 'Cotton', risk: 'High', documents: 'Partial' },
  { id: 7, name: 'Demo Atlas Cement', country: 'Turkey', material: 'Cement', risk: 'Medium', documents: 'Complete' },
  { id: 8, name: 'Demo Borneo Rubber', country: 'Indonesia', material: 'Rubber', risk: 'High', documents: 'Missing' },
]

// Made-up emission factors (tonnes CO2e per tonne of material). NOT for real reporting.
export const materialFactors = {
  Steel: 1.9,
  Aluminium: 8.5,
  Cement: 0.85,
  Plastic: 2.5,
  Timber: 0.4,
  Cotton: 5.0,
  Rubber: 2.8,
  Coffee: 4.0,
  Paper: 1.1,
  Glass: 1.2,
}

// Made-up transport factors (kg CO2e per tonne-kilometre). NOT for real reporting.
export const transportFactors = {
  Road: 0.1,
  Rail: 0.03,
  Sea: 0.015,
  Air: 0.6,
}

export const materials = [...Object.keys(materialFactors), 'Other']

// Illustrative monthly emissions in tonnes CO2e. Not linked to the supplier list.
export const monthlyEmissions = [
  { month: 'May', materials: 820, transport: 210 },
  { month: 'Jun', materials: 790, transport: 225 },
  { month: 'Jul', materials: 805, transport: 198 },
  { month: 'Aug', materials: 760, transport: 187 },
  { month: 'Sep', materials: 735, transport: 192 },
  { month: 'Oct', materials: 702, transport: 176 },
]

export const REGULATIONS_CHECKED = '25 November 2026'

// A short, simplified summary. It is not legal advice and it does not update itself.
export const regulations = [
  {
    code: 'EUDR',
    name: 'EU Deforestation Regulation',
    region: 'European Union',
    materials: ['Timber', 'Coffee', 'Rubber', 'Paper'],
    timing: 'Applies from 30 December 2026. Some micro and small operators: 30 June 2027.',
    summary: 'Due diligence duties for certain products linked to cattle, cocoa, coffee, oil palm, rubber, soya and wood.',
    action: 'Check product codes and collect the location of the land where the raw material was produced.',
    source: 'https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation',
  },
  {
    code: 'CBAM',
    name: 'Carbon Border Adjustment Mechanism',
    region: 'European Union',
    materials: ['Steel', 'Aluminium', 'Cement'],
    timing: 'Definitive regime since 1 January 2026.',
    summary: 'Covers certain imports, including iron and steel, aluminium, cement, fertilisers, hydrogen and electricity. A 50-tonne yearly threshold per importer applies to some of these, but not to hydrogen or electricity.',
    action: 'Check product codes, yearly import weight and whether authorised CBAM declarant status is needed.',
    source: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
  },
  {
    code: 'UFLPA',
    name: 'Uyghur Forced Labor Prevention Act',
    region: 'United States',
    materials: 'ALL',
    timing: 'Enforced since 21 June 2022. The Entity List changes over time.',
    summary: 'Goods made wholly or partly in Xinjiang, or by listed entities, are presumed to be barred from US import unless the presumption is overcome.',
    action: 'Trace inputs to their origin and screen all supplier tiers against the current Entity List.',
    source: 'https://www.dhs.gov/uflpa-entity-list',
  },
  {
    code: 'EUFLR',
    name: 'EU Forced Labour Regulation',
    region: 'European Union',
    materials: 'ALL',
    timing: 'Main rules apply from 14 December 2027.',
    summary: 'Bans products made with forced labour from being sold in, or exported from, the EU market.',
    action: 'Map higher-risk supply chains and plan how concerns will be investigated and fixed.',
    source: 'https://eur-lex.europa.eu/eli/reg/2024/3015/oj/eng',
  },
  {
    code: 'CSDDD',
    name: 'Corporate Sustainability Due Diligence Directive',
    region: 'European Union',
    materials: 'COMPANY',
    timing: 'National laws due by 26 July 2028; application from 26 July 2029.',
    summary: 'Amended in 2026. Scope is limited to very large companies (for EU companies, more than 5,000 employees and over EUR 1.5 billion worldwide turnover). Different tests apply to non-EU companies.',
    action: 'Ask a qualified adviser whether your company or its large customers are in scope.',
    source: 'https://eur-lex.europa.eu/eli/dir/2026/470/oj/eng',
  },
]