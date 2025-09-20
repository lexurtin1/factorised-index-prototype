export type ESGFlag = 'fossilFuels' | 'tobacco' | 'defense' | 'renewable'

export type Company = {
  symbol: string
  name: string
  sector: 'Technology' | 'Energy' | 'Financials' | 'Healthcare' | 'Consumer' | 'Industrials'
  baseWeight: number
  price: number
  esg: Record<ESGFlag, boolean>
}

export const companies: Company[] = [
  {
    symbol: 'SPRK',
    name: 'SparkByte Innovations',
    sector: 'Technology',
    baseWeight: 0.12,
    price: 145,
    esg: { fossilFuels: false, tobacco: false, defense: false, renewable: true },
  },
  {
    symbol: 'QANT',
    name: 'Quantum Atlas',
    sector: 'Technology',
    baseWeight: 0.09,
    price: 212,
    esg: { fossilFuels: false, tobacco: false, defense: true, renewable: true },
  },
  {
    symbol: 'FLUX',
    name: 'Flux Energy Grid',
    sector: 'Energy',
    baseWeight: 0.08,
    price: 78,
    esg: { fossilFuels: true, tobacco: false, defense: false, renewable: true },
  },
  {
    symbol: 'ECHO',
    name: 'Echo Renewables',
    sector: 'Energy',
    baseWeight: 0.07,
    price: 65,
    esg: { fossilFuels: false, tobacco: false, defense: false, renewable: true },
  },
  {
    symbol: 'HEAL',
    name: 'Healix Biolabs',
    sector: 'Healthcare',
    baseWeight: 0.1,
    price: 98,
    esg: { fossilFuels: false, tobacco: false, defense: false, renewable: false },
  },
  {
    symbol: 'MOSA',
    name: 'Mosaic Retail',
    sector: 'Consumer',
    baseWeight: 0.08,
    price: 54,
    esg: { fossilFuels: false, tobacco: true, defense: false, renewable: false },
  },
  {
    symbol: 'NOVA',
    name: 'Nova Aerospace',
    sector: 'Industrials',
    baseWeight: 0.07,
    price: 187,
    esg: { fossilFuels: true, tobacco: false, defense: true, renewable: false },
  },
  {
    symbol: 'FINC',
    name: 'Finch & Co Banking',
    sector: 'Financials',
    baseWeight: 0.11,
    price: 62,
    esg: { fossilFuels: false, tobacco: false, defense: false, renewable: false },
  },
  {
    symbol: 'ARBR',
    name: 'Arbor Living',
    sector: 'Consumer',
    baseWeight: 0.07,
    price: 43,
    esg: { fossilFuels: false, tobacco: false, defense: false, renewable: true },
  },
  {
    symbol: 'CYBR',
    name: 'CybrDefense Systems',
    sector: 'Technology',
    baseWeight: 0.09,
    price: 123,
    esg: { fossilFuels: false, tobacco: false, defense: true, renewable: false },
  },
  {
    symbol: 'BLUM',
    name: 'Blum Tobacco Group',
    sector: 'Consumer',
    baseWeight: 0.05,
    price: 39,
    esg: { fossilFuels: false, tobacco: true, defense: false, renewable: false },
  },
  {
    symbol: 'HYDR',
    name: 'Hydra Deepwater',
    sector: 'Energy',
    baseWeight: 0.07,
    price: 91,
    esg: { fossilFuels: true, tobacco: false, defense: false, renewable: false },
  },
]
