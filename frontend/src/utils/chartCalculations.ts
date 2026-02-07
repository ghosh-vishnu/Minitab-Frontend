/**
 * I-Chart (Individuals Chart) Statistical Calculations
 */

export interface IChartData {
  mean: number
  sigma: number
  ucl: number
  lcl: number
  movingRanges: number[]
  mrBar: number
  values: number[]
  outOfControlPoints: number[] // indices of points outside control limits
}

export interface TestResult {
  testNumber: number
  description: string
  failedPoints: number[] // observation indices that failed
  passed: boolean
}

export interface ChartPoint {
  x: number // observation number
  y: number // individual value
  isOutOfControl: boolean
}

/**
 * Test 1: One or more points more than 3 standard deviations from center line
 */
function test1_OutOfControl(values: number[], mean: number, sigma: number): number[] {
  const failedPoints: number[] = []
  const limit = 3 * sigma

  for (let i = 0; i < values.length; i++) {
    const deviation = Math.abs(values[i] - mean)
    if (deviation > limit) {
      failedPoints.push(i + 1) // observation numbers are 1-indexed
    }
  }

  return failedPoints
}

/**
 * Calculate I-Chart statistics
 * Input: array of individual numeric values
 * Output: I-Chart control limits and statistics
 */
export function calculateIChart(values: number[]): IChartData {
  if (values.length === 0) {
    throw new Error('No values provided')
  }

  // Calculate mean
  const mean = values.reduce((a, b) => a + b, 0) / values.length

  // Calculate moving ranges (|Xi - Xi-1|)
  const movingRanges: number[] = []
  for (let i = 1; i < values.length; i++) {
    movingRanges.push(Math.abs(values[i] - values[i - 1]))
  }

  // Calculate mean of moving ranges (MR-bar)
  const mrBar = movingRanges.length > 0 ? movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length : 0

  // Calculate sigma (standard deviation) using moving range
  // Sigma = MR-bar / 1.128 (constant for moving range of size 2)
  const sigma = mrBar / 1.128

  // Calculate control limits
  // UCL = Mean + 3 * Sigma
  // LCL = Mean - 3 * Sigma
  const ucl = mean + 3 * sigma
  const lcl = mean - 3 * sigma

  // Identify out-of-control points using Test 1
  const outOfControlPoints: number[] = test1_OutOfControl(values, mean, sigma)
    .map((obsNum) => obsNum - 1) // Convert back to 0-indexed for array

  return {
    mean,
    sigma,
    ucl,
    lcl,
    movingRanges,
    mrBar,
    values,
    outOfControlPoints,
  }
}

/**
 * Run all statistical tests
 */
export function runTests(values: number[], mean: number, sigma: number): TestResult[] {
  const results: TestResult[] = []

  // Test 1: Points more than 3 sigma from center
  const test1Failed = test1_OutOfControl(values, mean, sigma)
  results.push({
    testNumber: 1,
    description: 'One point more than 3.00 standard deviations from center line.',
    failedPoints: test1Failed,
    passed: test1Failed.length === 0,
  })

  return results
}

/**
 * Convert I-Chart data to chart points
 */
export function convertToChartPoints(chartData: IChartData): ChartPoint[] {
  return chartData.values.map((value, index) => ({
    x: index + 1, // observation numbers start at 1
    y: value,
    isOutOfControl: chartData.outOfControlPoints.includes(index),
  }))
}

/**
 * Format number similar to Minitab
 * - Integers: show without decimals (e.g., 4390016, not 4390016.00)
 * - Large numbers: show 2 decimal places if needed
 * - Small numbers: show 2 decimal places
 */
export function formatNumber(value: number): string {
  // If it's an integer (or very close to integer), show without decimals
  if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 0.001) {
    return Math.round(value).toString()
  }
  // Otherwise show 2 decimal places
  return value.toFixed(2)
}

/**
 * Get color based on out-of-control status
 */
export function getPointColor(isOutOfControl: boolean): string {
  return isOutOfControl ? '#ef4444' : '#3b82f6' // red or blue
}

/**
 * Get line color for control limits
 */
export function getControlLineColor(lineType: 'ucl' | 'lcl' | 'mean'): string {
  if (lineType === 'mean') return '#22c55e' // green
  return '#ef4444' // red for UCL/LCL
}
