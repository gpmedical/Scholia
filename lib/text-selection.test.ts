import { describe, expect, it } from 'vitest'

import {
	getLineNumber,
	reanchorTextRange,
	trimSourceSelection,
} from '@/lib/text-selection'

describe('text selection helpers', () => {
	it('trims whitespace without losing absolute offsets', () => {
		const text = 'Arma  virumque cano'
		const selection = trimSourceSelection(text, 4, 15)

		expect(selection).toEqual({
			startOffset: 6,
			endOffset: 14,
			selectedText: 'virumque',
			lineNumber: 1,
		})
	})

	it('returns null for a whitespace-only selection', () => {
		expect(trimSourceSelection('arma   virum', 4, 7)).toBeNull()
	})

	it('calculates one-based line numbers', () => {
		expect(getLineNumber('first\nsecond\nthird', 13)).toBe(3)
	})

	it('keeps a range whose text is unchanged at the same position', () => {
		expect(reanchorTextRange('arma cano', 'cano', 5, 9)).toEqual({
			startOffset: 5,
			endOffset: 9,
			lineNumber: 1,
			isOrphaned: false,
		})
	})

	it('moves a range to the nearest matching occurrence', () => {
		const result = reanchorTextRange('cano arma cano', 'cano', 8, 12)

		expect(result.startOffset).toBe(10)
		expect(result.isOrphaned).toBe(false)
	})

	it('marks a removed passage as orphaned', () => {
		expect(reanchorTextRange('arma virumque', 'cano', 14, 18)).toEqual({
			startOffset: -1,
			endOffset: -1,
			lineNumber: null,
			isOrphaned: true,
		})
	})
})
