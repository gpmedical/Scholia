import type { Annotation, SourceSelection } from '@/lib/domain'

export interface ReanchoredRange {
	startOffset: number
	endOffset: number
	lineNumber: number | null
	isOrphaned: boolean
}

export function getLineNumber(text: string, offset: number): number {
	return text.slice(0, Math.max(0, offset)).split('\n').length
}

export function trimSourceSelection(
	text: string,
	startOffset: number,
	endOffset: number,
): SourceSelection | null {
	let start = Math.max(0, Math.min(startOffset, text.length))
	let end = Math.max(start, Math.min(endOffset, text.length))

	while (start < end && /\s/u.test(text[start])) {
		start += 1
	}

	while (end > start && /\s/u.test(text[end - 1])) {
		end -= 1
	}

	if (start === end) {
		return null
	}

	return {
		startOffset: start,
		endOffset: end,
		selectedText: text.slice(start, end),
		lineNumber: getLineNumber(text, start),
	}
}

export function annotationMatchesSelection(
	annotation: Annotation,
	selection: SourceSelection,
): boolean {
	if (annotation.isOrphaned) {
		return false
	}

	return (
		annotation.startOffset < selection.endOffset &&
		annotation.endOffset > selection.startOffset
	)
}

export function annotationContainsOffset(
	annotation: Annotation,
	offset: number,
): boolean {
	return (
		!annotation.isOrphaned &&
		annotation.startOffset <= offset &&
		annotation.endOffset >= offset
	)
}

export function reanchorTextRange(
	newText: string,
	selectedText: string,
	previousStart: number,
	previousEnd: number,
): ReanchoredRange {
	if (
		previousStart >= 0 &&
		newText.slice(previousStart, previousEnd) === selectedText
	) {
		return {
			startOffset: previousStart,
			endOffset: previousEnd,
			lineNumber: getLineNumber(newText, previousStart),
			isOrphaned: false,
		}
	}

	let searchOffset = 0
	let nearestOffset = -1
	let nearestDistance = Number.POSITIVE_INFINITY

	while (searchOffset <= newText.length) {
		const matchOffset = newText.indexOf(selectedText, searchOffset)

		if (matchOffset === -1) {
			break
		}

		const distance = Math.abs(matchOffset - previousStart)

		if (distance < nearestDistance) {
			nearestOffset = matchOffset
			nearestDistance = distance
		}

		searchOffset = matchOffset + Math.max(1, selectedText.length)
	}

	if (nearestOffset === -1) {
		return {
			startOffset: -1,
			endOffset: -1,
			lineNumber: null,
			isOrphaned: true,
		}
	}

	return {
		startOffset: nearestOffset,
		endOffset: nearestOffset + selectedText.length,
		lineNumber: getLineNumber(newText, nearestOffset),
		isOrphaned: false,
	}
}
