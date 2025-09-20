import React from 'react'
import { companies, type Company } from './data/companies'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Switch } from './components/ui/switch'
import { Slider } from './components/ui/slider'
import { Badge } from './components/ui/badge'
import {
  Sparkles,
  SlidersHorizontal,
  Filter,
  Leaf,
  Factory,
  Flame,
  ShieldAlert,
  Rocket,
  Gauge,
  LineChart,
  Gift,
  Coins,
} from 'lucide-react'
import Confetti from 'react-confetti'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { createSeededRandom } from './lib/random'
import { applyWeightCap, normaliseWeights, type WeightMap } from './lib/weights'

const HISTORY_LENGTH = 120

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
})

type FilterKey = 'fossilFuels' | 'tobacco' | 'defense'

type FiltersState = Record<FilterKey, boolean>

type Holding = {
  company: Company
  weight: number
}

type Token = {
  id: string
  mintedAt: string
  nav: number
  weights: Holding[]
}

type PriceHistory = Record<string, number[]>

const createPriceHistories = (): PriceHistory => {
  const seeded = createSeededRandom(2049)
  const histories: PriceHistory = {}

  companies.forEach((company, index) => {
    const series: number[] = []
    let price = company.price
    for (let i = 0; i < HISTORY_LENGTH; i++) {
      const tiltBoost = company.sector === 'Technology' ? 0.002 : 0
      const sustainabilityBonus = company.esg.renewable ? 0.001 : 0
      const drift = 0.0015 + tiltBoost + sustainabilityBonus
      const noise = (seeded() - 0.5) * (0.04 + index * 0.001)
      price = Math.max(12, price * (1 + drift + noise))
      series.push(Number(price.toFixed(2)))
    }
    histories[company.symbol] = series
  })

  return histories
}

const formatPercent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`
const formatNav = (value: number) => value.toFixed(2)

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-3 shadow-lg">
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      {payload.map((item: any) => (
        <div key={item.name} className="mt-1 flex items-center justify-between gap-6 text-sm">
          <span className="flex items-center gap-2 text-slate-200">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.name}
          </span>
          <span className="font-semibold text-white">{Number(item.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

const App: React.FC = () => {
  const [filters, setFilters] = React.useState<FiltersState>({
    fossilFuels: true,
    tobacco: true,
    defense: true,
  })
  const [techTilt, setTechTilt] = React.useState(10)
  const [energyTilt, setEnergyTilt] = React.useState(-5)
  const [cap, setCap] = React.useState(15)
  const [mintedTokens, setMintedTokens] = React.useState<Token[]>([])
  const [showConfetti, setShowConfetti] = React.useState(false)
  const [windowSize, setWindowSize] = React.useState({ width: 0, height: 0 })

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const priceHistories = React.useMemo(() => createPriceHistories(), [])
  const dates = React.useMemo(() => {
    const start = new Date()
    start.setDate(start.getDate() - (HISTORY_LENGTH - 1))
    const timeline: string[] = []
    for (let i = 0; i < HISTORY_LENGTH; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      timeline.push(dateFormatter.format(date))
    }
    return timeline
  }, [])

  const baseWeights = React.useMemo(() => {
    const map: WeightMap = {}
    companies.forEach((company) => {
      map[company.symbol] = company.baseWeight
    })
    return normaliseWeights(map)
  }, [])

  const filteredCompanies = React.useMemo(() => {
    return companies.filter((company) => {
      if (filters.fossilFuels && company.esg.fossilFuels) return false
      if (filters.tobacco && company.esg.tobacco) return false
      if (filters.defense && company.esg.defense) return false
      return true
    })
  }, [filters])

  const appliedHoldings = React.useMemo<Holding[]>(() => {
    const investable = filteredCompanies.length === 0 ? companies : filteredCompanies

    const base: WeightMap = {}
    investable.forEach((company) => {
      base[company.symbol] = company.baseWeight
    })
    const normalised = normaliseWeights(base)

    const tilted: WeightMap = {}
    investable.forEach((company) => {
      const multiplier =
        (company.sector === 'Technology' ? 1 + techTilt / 100 : 1) *
        (company.sector === 'Energy' ? 1 + energyTilt / 100 : 1)
      tilted[company.symbol] = normalised[company.symbol] * Math.max(multiplier, 0.2)
    })

    const reweighted = normaliseWeights(tilted)
    const capped = applyWeightCap(reweighted, cap / 100)

    return investable.map((company) => ({
      company,
      weight: capped[company.symbol] ?? 0,
    }))
  }, [filteredCompanies, cap, energyTilt, techTilt])

  const customWeightMap = React.useMemo<WeightMap>(() => {
    const map: WeightMap = {}
    appliedHoldings.forEach((holding) => {
      map[holding.company.symbol] = holding.weight
    })
    return normaliseWeights(map)
  }, [appliedHoldings])

  const computeSeries = React.useCallback(
    (weights: WeightMap) => {
      const normalised = normaliseWeights(weights)
      return dates.map((_, index) => {
        let value = 0
        Object.entries(normalised).forEach(([symbol, weight]) => {
          const series = priceHistories[symbol]
          if (!series) return
          value += weight * series[index]
        })
        return value
      })
    },
    [dates, priceHistories],
  )

  const baselineSeries = React.useMemo(() => computeSeries(baseWeights), [baseWeights, computeSeries])
  const customSeries = React.useMemo(() => computeSeries(customWeightMap), [computeSeries, customWeightMap])

  const navFromSeries = React.useCallback((series: number[]) => {
    if (series.length === 0) return []
    const first = series[0]
    return series.map((value) => Number(((value / first) * 100).toFixed(2)))
  }, [])

  const baselineNav = React.useMemo(() => navFromSeries(baselineSeries), [baselineSeries, navFromSeries])
  const customNav = React.useMemo(() => navFromSeries(customSeries), [customSeries, navFromSeries])

  const chartData = React.useMemo(() => {
    return dates.map((date, index) => ({
      date,
      Baseline: baselineNav[index],
      'Your basket': customNav[index],
    }))
  }, [baselineNav, customNav, dates])

  const latestNav = customNav[customNav.length - 1] ?? 100
  const latestBaseline = baselineNav[baselineNav.length - 1] ?? 100
  const navDifference = latestNav - latestBaseline

  const sectorExposure = React.useMemo(() => {
    const map: Record<string, number> = {}
    appliedHoldings.forEach((holding) => {
      map[holding.company.sector] =
        (map[holding.company.sector] ?? 0) + holding.weight
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [appliedHoldings])

  const activeFilters = React.useMemo(() => {
    const flags: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
      { key: 'fossilFuels', label: 'Fossil fuels', icon: <Flame className="h-4 w-4" /> },
      { key: 'tobacco', label: 'Tobacco', icon: <Factory className="h-4 w-4" /> },
      { key: 'defense', label: 'Defense', icon: <ShieldAlert className="h-4 w-4" /> },
    ]

    return flags.filter((flag) => filters[flag.key])
  }, [filters])

  const handleMint = () => {
    const id = `FX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const token: Token = {
      id,
      mintedAt: new Date().toISOString(),
      nav: latestNav,
      weights: appliedHoldings,
    }
    setMintedTokens((prev) => [token, ...prev])
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2800)
  }

  return (
    <div className="gradient-bg min-h-screen pb-24">
      {showConfetti && windowSize.width > 0 && (
        <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={420} />
      )}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pt-12">
        <header className="flex flex-col gap-6 rounded-3xl border border-sky-400/40 bg-slate-950/60 p-8 text-white shadow-2xl shadow-sky-500/30 backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-slate-400">Factorised Playground</p>
              <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold font-display">
                <Sparkles className="h-10 w-10 text-sky-300" /> Factorised Index
              </h1>
              <p className="mt-3 max-w-xl text-base text-slate-300">
                Experiment with ESG screens, thematic tilts, and playful constraints to craft a personalised mini index. Mint it as a factorised token and show off your allocator superpowers.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3 text-right">
              <Badge className="bg-gradient-to-r from-sky-400/40 via-fuchsia-400/40 to-emerald-400/40 text-slate-100">
                Proof-of-concept • Local demo
              </Badge>
              <div className="rounded-2xl bg-slate-900/70 px-6 py-4 text-sm text-slate-300">
                <p className="flex items-center gap-2 text-lg font-semibold text-white">
                  <LineChart className="h-5 w-5 text-emerald-300" /> NAV {formatNav(latestNav)}
                </p>
                <p className="text-xs text-slate-400">
                  vs baseline {formatNav(latestBaseline)}{' '}
                  <span className={navDifference >= 0 ? 'text-emerald-300' : 'text-rose-400'}>
                    ({navDifference >= 0 ? '+' : ''}{navDifference.toFixed(2)} pts)
                  </span>
                </p>
              </div>
            </div>
          </div>
          {activeFilters.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <Filter className="h-4 w-4 text-sky-300" />
              <span>Excluding:</span>
              {activeFilters.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-100"
                >
                  {item.icon}
                  {item.label}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Filter className="h-4 w-4 text-sky-300" />
              <span>No exclusions applied — full S&P-style basket active.</span>
            </div>
          )}
          {filteredCompanies.length === 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-300">
              <ShieldAlert className="h-4 w-4" />
              <span>
                Every filter removed its category — showcasing the fallback to the original universe.
              </span>
            </div>
          )}
        </header>

        <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <Card className="card-glow border-slate-800/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <SlidersHorizontal className="h-5 w-5 text-sky-300" /> Tune your basket
              </CardTitle>
              <p className="text-sm text-slate-400">
                Toggle exclusion filters, tilt towards your favourite themes, and limit concentration risk. Everything updates instantly.
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">ESG screens</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {(
                    [
                      {
                        key: 'fossilFuels' as const,
                        label: 'Fossil fuels',
                        description: 'Exclude heavy emitters and drillers.',
                        icon: <Flame className="h-4 w-4 text-emerald-300" />,
                      },
                      {
                        key: 'tobacco' as const,
                        label: 'Tobacco',
                        description: 'Remove tobacco manufacturing exposure.',
                        icon: <Leaf className="h-4 w-4 text-lime-300" />,
                      },
                      {
                        key: 'defense' as const,
                        label: 'Defense',
                        description: 'Avoid defense contractors and arms.',
                        icon: <ShieldAlert className="h-4 w-4 text-rose-300" />,
                      },
                    ] satisfies {
                      key: FilterKey
                      label: string
                      description: string
                      icon: React.ReactNode
                    }[]
                  ).map((item) => (
                    <div
                      key={item.key}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-100">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/80">
                            {item.icon}
                          </span>
                          {item.label}
                        </div>
                        <Switch
                          checked={filters[item.key]}
                          onCheckedChange={(checked) =>
                            setFilters((prev) => ({ ...prev, [item.key]: Boolean(checked) }))
                          }
                        />
                      </div>
                      <p className="text-xs text-slate-400">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">Tech tilt</p>
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-200">
                      <span className="flex items-center gap-2 font-medium">
                        <Rocket className="h-4 w-4 text-fuchsia-300" /> Amplify innovation
                      </span>
                      <span className="text-xs text-slate-400">{techTilt}%</span>
                    </div>
                    <Slider
                      className="mt-4"
                      value={[techTilt]}
                      min={-20}
                      max={30}
                      step={1}
                      onValueChange={(value) => setTechTilt(value[0] ?? 0)}
                    />
                    <p className="mt-3 text-xs text-slate-400">
                      Boost or trim exposure to the technology trio. Positive values overweight innovators.
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">Energy tilt</p>
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-200">
                      <span className="flex items-center gap-2 font-medium">
                        <Gauge className="h-4 w-4 text-amber-300" /> Balance renewables
                      </span>
                      <span className="text-xs text-slate-400">{energyTilt}%</span>
                    </div>
                    <Slider
                      className="mt-4"
                      value={[energyTilt]}
                      min={-30}
                      max={20}
                      step={1}
                      onValueChange={(value) => setEnergyTilt(value[0] ?? 0)}
                    />
                    <p className="mt-3 text-xs text-slate-400">
                      Re-weight traditional and clean energy names. Negative values lean harder into renewables.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">Concentration guardrail</p>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-200">
                    <span className="flex items-center gap-2 font-medium">
                      <SlidersHorizontal className="h-4 w-4 text-sky-300" /> Cap single-name weight
                    </span>
                    <span className="text-xs text-slate-400">{cap}%</span>
                  </div>
                  <Slider
                    className="mt-4"
                    value={[cap]}
                    min={8}
                    max={25}
                    step={1}
                    onValueChange={(value) => setCap(value[0] ?? 0)}
                  />
                  <p className="mt-3 text-xs text-slate-400">
                    Keeps any single position from dominating. Remaining weight is redistributed proportionally.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">Mint your index token</p>
                  <p className="text-sm text-slate-200">
                    Lock today’s mix into a shareable on-chain-ready identity. Demo only — no live settlement.
                  </p>
                </div>
                <Button onClick={handleMint} className="shadow-lg shadow-fuchsia-500/25">
                  <Gift className="mr-2 h-4 w-4" /> Mint factorised token
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-8">
            <Card className="card-glow border-slate-800/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <LineChart className="h-5 w-5 text-emerald-300" /> NAV vs baseline
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="custom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="baseline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#1f2937" opacity={0.4} />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#1f2937' }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#1f2937' }} domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="Your basket" stroke="#38bdf8" strokeWidth={2.5} fill="url(#custom)" />
                    <Area type="monotone" dataKey="Baseline" stroke="#818cf8" strokeWidth={2} fill="url(#baseline)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-800/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Coins className="h-5 w-5 text-amber-300" /> Portfolio snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-400">Active names</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {appliedHoldings.length}
                    </p>
                    <p className="text-xs text-slate-400">
                      from {companies.length} original constituents
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-400">Top sector tilts</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-200">
                      {sectorExposure.map(([sector, weight]) => (
                        <li key={sector} className="flex items-center justify-between gap-3">
                          <span>{sector}</span>
                          <span className="font-semibold text-white">{formatPercent(weight)}</span>
                        </li>
                      ))}
                      {sectorExposure.length === 0 && (
                        <li className="text-xs text-slate-400">No sectors selected.</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-400">Renewable exposure</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {formatPercent(
                        appliedHoldings.reduce(
                          (sum, holding) =>
                            sum + (holding.company.esg.renewable ? holding.weight : 0),
                          0,
                        ),
                      )}
                    </p>
                    <p className="text-xs text-slate-400">Share of companies flagged as renewable leaders</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-800/60">
                  <table className="min-w-full divide-y divide-slate-800/80 text-sm">
                    <thead className="bg-slate-900/80 text-xs uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Company</th>
                        <th className="px-4 py-3 text-left">Sector</th>
                        <th className="px-4 py-3 text-right">Weight</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">ESG flags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {appliedHoldings.map((holding) => (
                        <tr key={holding.company.symbol} className="hover:bg-slate-900/60">
                          <td className="px-4 py-3 text-slate-100">
                            <div className="flex flex-col">
                              <span className="font-medium text-white">{holding.company.symbol}</span>
                              <span className="text-xs text-slate-400">{holding.company.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{holding.company.sector}</td>
                          <td className="px-4 py-3 text-right font-semibold text-white">
                            {formatPercent(holding.weight)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300">${holding.company.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-xs text-slate-400">
                            <div className="flex justify-end gap-2">
                              {holding.company.esg.renewable && (
                                <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-[10px] uppercase text-emerald-200">
                                  Renewable
                                </span>
                              )}
                              {holding.company.esg.fossilFuels && (
                                <span className="rounded-full bg-rose-400/20 px-2 py-1 text-[10px] uppercase text-rose-200">
                                  Fossil
                                </span>
                              )}
                              {holding.company.esg.tobacco && (
                                <span className="rounded-full bg-amber-400/20 px-2 py-1 text-[10px] uppercase text-amber-200">
                                  Tobacco
                                </span>
                              )}
                              {holding.company.esg.defense && (
                                <span className="rounded-full bg-sky-400/20 px-2 py-1 text-[10px] uppercase text-sky-200">
                                  Defense
                                </span>
                              )}
                              {!holding.company.esg.renewable &&
                                !holding.company.esg.fossilFuels &&
                                !holding.company.esg.tobacco &&
                                !holding.company.esg.defense && (
                                  <span className="rounded-full bg-slate-700/40 px-2 py-1 text-[10px] uppercase text-slate-200">
                                    Neutral
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <Card className="border-slate-800/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Sparkles className="h-5 w-5 text-sky-300" /> Minted factorised tokens
              </CardTitle>
              <p className="text-sm text-slate-400">
                Every mint locks in your current mix, NAV, and ESG story. Confetti guaranteed.
              </p>
            </CardHeader>
            <CardContent>
              {mintedTokens.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
                  No tokens minted yet. Dial in your basket and hit the mint button!
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {mintedTokens.map((token) => (
                    <div
                      key={token.id}
                      className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-fuchsia-500/10 to-emerald-500/10" />
                      <div className="relative flex flex-col gap-3 text-sm text-slate-200">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-white">{token.id}</span>
                          <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                            {new Date(token.mintedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-lg font-semibold text-white">
                          <Rocket className="h-5 w-5 text-sky-300" /> NAV {formatNav(token.nav)}
                        </div>
                        <p className="text-xs text-slate-400">Top holdings</p>
                        <ul className="grid grid-cols-2 gap-2 text-xs">
                          {token.weights
                            .slice()
                            .sort((a, b) => b.weight - a.weight)
                            .slice(0, 4)
                            .map((holding) => (
                              <li
                                key={`${token.id}-${holding.company.symbol}`}
                                className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2"
                              >
                                <span className="font-medium text-slate-100">
                                  {holding.company.symbol}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {formatPercent(holding.weight)}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <footer className="pb-12 text-center text-xs text-slate-400">
          Built with React, Tailwind, shadcn/ui flavours, Recharts, and a sprinkle of confetti. Purely for demo vibes — no real trading, no custody, just imagination.
        </footer>
      </div>
    </div>
  )
}

export default App
