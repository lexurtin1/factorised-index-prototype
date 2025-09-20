export type WeightMap = Record<string, number>

export const normaliseWeights = (weights: WeightMap): WeightMap => {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0)
  if (total === 0) {
    const equal = Object.keys(weights).length
    if (equal === 0) return {}
    const fallback = 1 / equal
    return Object.fromEntries(Object.keys(weights).map((key) => [key, fallback]))
  }
  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / total]),
  )
}

export const applyWeightCap = (
  weights: WeightMap,
  cap: number,
): WeightMap => {
  const keys = Object.keys(weights)
  if (keys.length === 0) return {}
  let remaining = 1
  const result: WeightMap = {}
  const active = new Set(keys)
  const base = { ...weights }

  while (active.size > 0) {
    const activeTotal = Array.from(active).reduce(
      (sum, key) => sum + base[key],
      0,
    )
    let adjustedThisRound = false

    for (const key of Array.from(active)) {
      const target = (base[key] / activeTotal) * remaining
      if (target > cap + 1e-9) {
        result[key] = cap
        remaining -= cap
        active.delete(key)
        adjustedThisRound = true
      }
    }

    if (!adjustedThisRound) {
      for (const key of Array.from(active)) {
        const target = (base[key] / activeTotal) * remaining
        result[key] = target
      }
      break
    }

    if (remaining <= 1e-9) {
      for (const key of Array.from(active)) {
        result[key] = 0
      }
      break
    }
  }

  return result
}
