/**
 * Process Capability Analysis (Normal Distribution) Utilities
 * Implements Minitab-compatible capability calculations
 */

export type ArrangementMode = 'single-column' | 'subgroups-across-rows'

export interface CapabilityInput {
  columnId: string // e.g. 'C2'
  arrangement: ArrangementMode
  subgroupSize?: number | string // number or columnId like 'C3'
  data: number[] // flattened numeric values (single-column case)
  subgroups?: number[][] // if you pre-build subgroups
  lsl: number
  usl: number
  historicalMean?: number
  historicalSigma?: number
}

export interface CapabilitySigma {
  overall: number
  within: number
}

export interface CapabilityPPMRow {
  label: 'PPM < LSL' | 'PPM > USL' | 'PPM Total'
  observed: number
  expectedOverall: number
  expectedWithin: number
}

export interface CapabilityResult {
  input: CapabilityInput
  n: number
  mean: number
  sigma: CapabilitySigma
  cp: number
  cpl: number
  cpu: number
  cpk: number
  pp: number
  ppl: number
  ppu: number
  ppk: number
  cpm: number | null
  ppmLess: number
  ppmGreater: number
  ppmTotal: number
  ppmTable: CapabilityPPMRow[]
  histogram: {
    bins: { x0: number; x1: number; count: number }[]
    domain: [number, number]
  }
}

// Basic statistics
export function mean(xs: number[]): number {
  const n = xs.length
  if (n === 0) return NaN
  return xs.reduce((s, x) => s + x, 0) / n
}

export function sampleStd(xs: number[]): number {
  const n = xs.length
  if (n < 2) return NaN
  const m = mean(xs)
  const ss = xs.reduce((s, x) => s + (x - m) ** 2, 0)
  return Math.sqrt(ss / (n - 1))
}

// Average Moving Range (MR) method for single-column data (Minitab's default)
// Used when no explicit subgroups are provided
export function averageMovingRangeSigma(data: number[]): number {
  const n = data.length
  if (n < 2) return NaN
  
  // Calculate moving ranges: |x_i - x_(i-1)| for i = 2 to n
  const movingRanges: number[] = []
  for (let i = 1; i < n; i++) {
    const mr = Math.abs(data[i] - data[i - 1])
    movingRanges.push(mr)
  }
  
  // Average moving range
  const avgMR = mean(movingRanges)
  if (!Number.isFinite(avgMR) || avgMR <= 0) return NaN
  
  // d2 constant for subgroup size 2 (from control chart constants)
  // sigmaWithin = Average MR / d2
  const d2 = 1.128 // For subgroup size n=2
  return avgMR / d2
}

// Pooled within-subgroup standard deviation
export function pooledWithinSigma(subgroups: number[][]): number {
  const valid = subgroups.filter(g => g.length >= 2)
  const k = valid.length
  if (k === 0) return NaN

  let num = 0
  let denom = 0

  for (const g of valid) {
    const n = g.length
    const s = sampleStd(g)
    if (!Number.isNaN(s)) {
      num += (n - 1) * s * s
      denom += (n - 1)
    }
  }

  if (denom <= 0) return NaN
  return Math.sqrt(num / denom)
}

// Normal CDF using Abramowitz-Stegun approximation (returns P(Z ≤ z))
// Standard normal cumulative distribution function: Φ(z) = P(Z ≤ z)
export function normalCdf(z: number): number {
  // Abramowitz-Stegun approximation for P(Z > |z|)
  const absZ = Math.abs(z)
  const t = 1 / (1 + 0.2316419 * absZ)
  const d = 0.3989423 * Math.exp(-absZ * absZ / 2)
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  
  // Convert to P(Z ≤ z)
  if (z < 0) {
    return p  // For z < 0: P(Z ≤ z) = P(Z > |z|) due to symmetry
  } else {
    return 1 - p  // For z ≥ 0: P(Z ≤ z) = 1 - P(Z > z)
  }
}

// Build histogram bins using Scott's rule (Minitab-compatible)
function buildHistogram(
  data: number[],
  lsl: number,
  usl: number,
  sigma: number,
  n: number
): CapabilityResult['histogram'] {
  // Calculate domain with 1σ margin
  const dataMin = Math.min(...data)
  const dataMax = Math.max(...data)
  const xMin = Math.min(dataMin, lsl) - sigma
  const xMax = Math.max(dataMax, usl) + sigma
  const range = xMax - xMin
  
  // Scott's rule: binWidth = 3.49 * σ * n^(-1/3)
  const scottBinWidth = 3.49 * sigma * Math.pow(n, -1/3)
  
  // Calculate number of bins using Scott's rule
  let numBins = Math.max(1, Math.ceil(range / scottBinWidth))
  
  // Minitab adjustment: For small samples, use more bins to show distribution clearly
  // Minitab typically shows 8-15 bins for capability analysis with small samples
  if (n <= 15) {
    // For small samples (like n=8), use more bins (8-12) to show individual data points
    // This creates gaps between bars, matching Minitab's visual style
    const targetBins = Math.max(8, Math.min(12, Math.ceil(range / (sigma * 0.8))))
    numBins = Math.max(numBins, targetBins)
  } else {
    // For larger samples, ensure at least 8 bins
    numBins = Math.max(numBins, 8)
  }
  
  // Adjust bin width to fit exactly in domain
  const adjustedBinWidth = range / numBins
  
  const bins = Array.from({ length: numBins }, (_, i) => ({
    x0: xMin + i * adjustedBinWidth,
    x1: xMin + (i + 1) * adjustedBinWidth,
    count: 0,
  }))

  // Count data points in each bin
  for (const x of data) {
    let idx = Math.floor((x - xMin) / adjustedBinWidth)
    if (idx < 0) idx = 0
    if (idx >= numBins) idx = numBins - 1
    bins[idx].count += 1
  }

  return { bins, domain: [xMin, xMax] }
}

// Main capability computation function
export function computeCapability(input: CapabilityInput): CapabilityResult {
  const { data, subgroups, lsl, usl, historicalMean, historicalSigma } = input

  // Validation
  if (!data.length || data.length < 2) {
    throw new Error('Sample size must be at least 2.')
  }
  if (!Number.isFinite(lsl) || !Number.isFinite(usl) || lsl >= usl) {
    throw new Error('LSL must be less than USL.')
  }
  if (!data.every(x => Number.isFinite(x))) {
    throw new Error('All data must be numeric.')
  }

  const n = data.length
  const xbar = historicalMean ?? mean(data)

  const sigmaOverall = historicalSigma ?? sampleStd(data)

  // Within-subgroup sigma
  // If subgroups exist, use pooled within-subgroup deviation.
  // If NO subgroups, Minitab uses Average Moving Range (MR) method for single-column data
  let sigmaWithin: number
  if (subgroups && subgroups.length > 0) {
    const sw = pooledWithinSigma(subgroups)
    // Check if all subgroups are single points (size 1) - Minitab sets sigmaWithin = 0
    const allSinglePoint = subgroups.every(g => g.length === 1)
    if (allSinglePoint) {
      sigmaWithin = 0
    } else {
      // Check if all subgroups have identical values (within sigma = 0)
      const allIdentical = subgroups.every(g => {
        if (g.length < 2) return true // Single point subgroups
        const first = g[0]
        return g.every(v => v === first)
      })
      if (allIdentical) {
        sigmaWithin = 0
      } else {
        sigmaWithin = !Number.isNaN(sw) && sw > 0 ? sw : sigmaOverall * 0.91
      }
    }
  } else {
    // No subgroups: Minitab uses Average Moving Range (MR) method for single-column data
    // This is the standard approach for I-MR (Individual-Moving Range) control charts
    const mrSigma = averageMovingRangeSigma(data)
    if (Number.isFinite(mrSigma) && mrSigma > 0) {
      sigmaWithin = mrSigma
    } else {
      // Fallback: if MR method fails (e.g., all values identical), use 0
      sigmaWithin = 0
    }
  }

  // Capability indices (handle division by zero when sigmaWithin = 0)
  const cp = sigmaWithin > 0 ? (usl - lsl) / (6 * sigmaWithin) : NaN
  const cpl = sigmaWithin > 0 ? (xbar - lsl) / (3 * sigmaWithin) : NaN
  const cpu = sigmaWithin > 0 ? (usl - xbar) / (3 * sigmaWithin) : NaN
  const cpk = sigmaWithin > 0 ? Math.min(cpl, cpu) : NaN

  const pp = (usl - lsl) / (6 * sigmaOverall)
  const ppl = (xbar - lsl) / (3 * sigmaOverall)
  const ppu = (usl - xbar) / (3 * sigmaOverall)
  const ppk = Math.min(ppl, ppu)

  const cpm: number | null = null // Optional Taguchi index

  // PPM calculations using overall σ by default
  const zL = (lsl - xbar) / sigmaOverall
  const zU = (usl - xbar) / sigmaOverall

  const ppmLess = normalCdf(zL) * 1_000_000
  const ppmGreater = (1 - normalCdf(zU)) * 1_000_000
  const ppmTotal = ppmLess + ppmGreater

  // Expected overall/within PPM
  const expectedOverallLess = ppmLess
  const expectedOverallGreater = ppmGreater
  const expectedOverallTotal = ppmTotal
  
  // Handle within PPM when sigmaWithin = 0 (division by zero)
  let expectedWithinLess: number
  let expectedWithinGreater: number
  let expectedWithinTotal: number
  
  if (sigmaWithin > 0) {
    const zLWithin = (lsl - xbar) / sigmaWithin
    const zUWithin = (usl - xbar) / sigmaWithin
    expectedWithinLess = normalCdf(zLWithin) * 1_000_000
    expectedWithinGreater = (1 - normalCdf(zUWithin)) * 1_000_000
    expectedWithinTotal = expectedWithinLess + expectedWithinGreater
  } else {
    // When sigmaWithin = 0, within PPM is undefined
    expectedWithinLess = NaN
    expectedWithinGreater = NaN
    expectedWithinTotal = NaN
  }

  // Observed PPM (count actual violations)
  const observedLess = (data.filter(x => x < lsl).length / n) * 1_000_000
  const observedGreater = (data.filter(x => x > usl).length / n) * 1_000_000
  const observedTotal = observedLess + observedGreater

  const ppmTable: CapabilityPPMRow[] = [
    {
      label: 'PPM < LSL',
      observed: observedLess,
      expectedOverall: expectedOverallLess,
      expectedWithin: expectedWithinLess,
    },
    {
      label: 'PPM > USL',
      observed: observedGreater,
      expectedOverall: expectedOverallGreater,
      expectedWithin: expectedWithinGreater,
    },
    {
      label: 'PPM Total',
      observed: observedTotal,
      expectedOverall: expectedOverallTotal,
      expectedWithin: expectedWithinTotal,
    },
  ]

  // Histogram (use overall sigma for binning)
  const histogram = buildHistogram(data, lsl, usl, sigmaOverall, n)

  return {
    input,
    n,
    mean: xbar,
    sigma: { overall: sigmaOverall, within: sigmaWithin },
    cp,
    cpl,
    cpu,
    cpk,
    pp,
    ppl,
    ppu,
    ppk,
    cpm,
    ppmLess,
    ppmGreater,
    ppmTotal,
    ppmTable,
    histogram,
  }
}
