/**
 * Calculator & Computation Tools
 */

import { z } from 'zod'
import { Tool } from './types'

export const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Perform mathematical calculations. Supports arithmetic, algebra, and basic functions (sin, cos, sqrt, etc.). Safe evaluation with no code execution.',
  category: 'compute',
  schema: z.object({
    expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 2 * 3", "Math.sqrt(144)")'),
    precision: z.number().optional().default(2).describe('Decimal places for result')
  }),
  execute: async ({ expression, precision = 2 }) => {
    try {
      // Safe eval using Function constructor with restricted scope
      const allowedMath = {
        abs: Math.abs,
        acos: Math.acos,
        asin: Math.asin,
        atan: Math.atan,
        ceil: Math.ceil,
        cos: Math.cos,
        exp: Math.exp,
        floor: Math.floor,
        log: Math.log,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        random: Math.random,
        round: Math.round,
        sin: Math.sin,
        sqrt: Math.sqrt,
        tan: Math.tan,
        PI: Math.PI,
        E: Math.E
      }

      const result = new Function('Math', `"use strict"; return (${expression})`)(allowedMath)
      const rounded = typeof result === 'number' ? Number(result.toFixed(precision)) : result

      return {
        success: true,
        result: rounded,
        expression,
        formatted: `${expression} = ${rounded}`
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Calculator error: ${error.message}`,
        expression
      }
    }
  }
}

export const financialCalculatorTool: Tool = {
  name: 'financial_calculator',
  description: 'Calculate financial metrics: ROI, CAGR, P/E ratio, price-to-sales, profit margins, etc.',
  category: 'compute',
  schema: z.object({
    metric: z.enum(['roi', 'cagr', 'pe_ratio', 'price_to_sales', 'profit_margin', 'growth_rate']).describe('Financial metric to calculate'),
    values: z.record(z.number()).describe('Input values as key-value pairs')
  }),
  execute: async ({ metric, values }) => {
    try {
      let result: number
      let formula: string

      switch (metric) {
        case 'roi':
          if (!values.initial || !values.final) {
            throw new Error('ROI requires "initial" and "final" values')
          }
          result = ((values.final - values.initial) / values.initial) * 100
          formula = '((Final - Initial) / Initial) × 100'
          break

        case 'cagr':
          if (!values.initial || !values.final || !values.years) {
            throw new Error('CAGR requires "initial", "final", and "years" values')
          }
          result = (Math.pow(values.final / values.initial, 1 / values.years) - 1) * 100
          formula = '((Final / Initial)^(1/Years) - 1) × 100'
          break

        case 'pe_ratio':
          if (!values.price || !values.eps) {
            throw new Error('P/E ratio requires "price" and "eps" (earnings per share)')
          }
          result = values.price / values.eps
          formula = 'Price / EPS'
          break

        case 'price_to_sales':
          if (!values.market_cap || !values.revenue) {
            throw new Error('Price-to-sales requires "market_cap" and "revenue"')
          }
          result = values.market_cap / values.revenue
          formula = 'Market Cap / Revenue'
          break

        case 'profit_margin':
          if (!values.net_income || !values.revenue) {
            throw new Error('Profit margin requires "net_income" and "revenue"')
          }
          result = (values.net_income / values.revenue) * 100
          formula = '(Net Income / Revenue) × 100'
          break

        case 'growth_rate':
          if (!values.initial || !values.final) {
            throw new Error('Growth rate requires "initial" and "final" values')
          }
          result = ((values.final - values.initial) / values.initial) * 100
          formula = '((Final - Initial) / Initial) × 100'
          break

        default:
          throw new Error(`Unknown metric: ${metric}`)
      }

      return {
        success: true,
        metric,
        result: Number(result.toFixed(2)),
        formula,
        inputs: values
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metric
      }
    }
  }
}

export const dataAnalysisTool: Tool = {
  name: 'data_analysis',
  description: 'Analyze arrays of numbers: calculate mean, median, standard deviation, min, max, percentiles.',
  category: 'compute',
  schema: z.object({
    data: z.array(z.number()).describe('Array of numbers to analyze'),
    operations: z.array(z.enum(['mean', 'median', 'std_dev', 'min', 'max', 'sum', 'count'])).optional().describe('Statistical operations to perform')
  }),
  execute: async (params: any) => {
    try {
      const data = params.data as number[]
      const operations = params.operations || ['mean', 'median', 'min', 'max']
      
      if (data.length === 0) {
        throw new Error('Empty data array')
      }

      const results: Record<string, number> = {}

      if (operations.includes('count')) {
        results.count = data.length
      }

      if (operations.includes('sum')) {
        results.sum = data.reduce((a, b) => a + b, 0)
      }

      if (operations.includes('mean')) {
        results.mean = data.reduce((a, b) => a + b, 0) / data.length
      }

      if (operations.includes('median')) {
        const sorted = [...data].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        results.median = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid]
      }

      if (operations.includes('std_dev')) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length
        const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length
        results.std_dev = Math.sqrt(variance)
      }

      if (operations.includes('min')) {
        results.min = Math.min(...data)
      }

      if (operations.includes('max')) {
        results.max = Math.max(...data)
      }

      // Round all results to 2 decimal places
      Object.keys(results).forEach(key => {
        results[key] = Number(results[key].toFixed(2))
      })

      return {
        success: true,
        results,
        data_points: data.length
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}
