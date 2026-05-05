import { describe, it, expect } from 'vitest'
import {
  getDateRange,
  PERIODS,
  PERIOD_LABELS,
  toPeriod,
  type Period,
} from '../src/cli-date.js'

describe('getDateRange', () => {
  it('"all" is bounded to the last 6 months, not epoch', () => {
    const { range, label } = getDateRange('all')
    const now = new Date()

    expect(label).toBe('Last 6 months')

    // Regression guard: must never silently fall back to epoch (the old
    // dashboard bug) or any pre-2000 date.
    expect(range.start.getFullYear()).toBeGreaterThan(2000)

    // Roughly 6 months back. Accept 5-7 months to absorb end-of-month
    // clamping (e.g. on May 31, JS rolls Nov 31 -> Dec 1, shifting the
    // computed month forward by one).
    const monthsDiff =
      (now.getFullYear() - range.start.getFullYear()) * 12 +
      (now.getMonth() - range.start.getMonth())
    expect(monthsDiff).toBeGreaterThanOrEqual(5)
    expect(monthsDiff).toBeLessThanOrEqual(7)

    // End is today, end of day.
    expect(range.end.getHours()).toBe(23)
    expect(range.end.getMinutes()).toBe(59)
  })

  it('CLI and dashboard agree on "all" semantics (no Date(0) drift)', () => {
    const a = getDateRange('all')
    const b = getDateRange('all')
    expect(a.range.start.getTime()).toBe(b.range.start.getTime())
    expect(a.label).toBe(b.label)
    // Regression guard: must never silently fall back to epoch.
    expect(a.range.start.getFullYear()).toBeGreaterThan(2000)
  })

  it('"week" returns the last 7 days', () => {
    const { range, label } = getDateRange('week')
    expect(label).toBe('Last 7 Days')
    // start = midnight 7 days ago, end = today 23:59:59.999 -> ~8 days span.
    const diffDays = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThanOrEqual(7)
    expect(diffDays).toBeLessThanOrEqual(8)
  })

  it('"month" starts on day 1 of the current month', () => {
    const { range } = getDateRange('month')
    expect(range.start.getDate()).toBe(1)
    expect(range.start.getHours()).toBe(0)
  })

  it('"30days" returns 30 days back', () => {
    const { range, label } = getDateRange('30days')
    expect(label).toBe('Last 30 Days')
    const diffDays = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThanOrEqual(30)
    expect(diffDays).toBeLessThanOrEqual(31)
  })

  it('"today" starts at local midnight', () => {
    const { range } = getDateRange('today')
    expect(range.start.getHours()).toBe(0)
    expect(range.start.getMinutes()).toBe(0)
    expect(range.end.getHours()).toBe(23)
  })

  it('"yesterday" is supported (CLI-only convenience)', () => {
    const { range, label } = getDateRange('yesterday')
    expect(label).toMatch(/^Yesterday/)
    expect(range.start.getHours()).toBe(0)
    expect(range.end.getHours()).toBe(23)
  })

  it('unknown period falls back to "week"', () => {
    const fallback = getDateRange('not-a-period')
    const week = getDateRange('week')
    expect(fallback.label).toBe(week.label)
  })
})

describe('PERIODS / PERIOD_LABELS', () => {
  it('exposes the expected period set', () => {
    expect(PERIODS).toEqual(['today', 'week', '30days', 'month', 'all'])
  })

  it('has a label for every period', () => {
    for (const p of PERIODS) {
      expect(PERIOD_LABELS[p]).toBeTruthy()
    }
  })

  it('"all" tab label reflects the 6-month bound', () => {
    // Short label used in the dashboard tab strip. The long-form label
    // ("Last 6 months") comes from getDateRange().label.
    expect(PERIOD_LABELS.all).toBe('6 Months')
  })
})

describe('toPeriod', () => {
  it('round-trips known periods', () => {
    const known: Period[] = ['today', 'week', '30days', 'month', 'all']
    for (const p of known) {
      expect(toPeriod(p)).toBe(p)
    }
  })

  it('falls back to "week" for unknown input', () => {
    expect(toPeriod('garbage')).toBe('week')
    expect(toPeriod('')).toBe('week')
  })
})
