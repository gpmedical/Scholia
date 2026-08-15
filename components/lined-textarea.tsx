'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'

import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface LinedTextareaProps {
	value: string
	onChange: (value: string) => void
	onSelectionChange?: (startOffset: number, endOffset: number) => void
	ariaLabel: string
	placeholder: string
	showLineNumbers?: boolean
	className?: string
}

export const LinedTextarea = forwardRef<
	HTMLTextAreaElement,
	LinedTextareaProps
>(function LinedTextarea(
	{
		value,
		onChange,
		onSelectionChange,
		ariaLabel,
		placeholder,
		showLineNumbers = true,
		className,
	},
	forwardedRef,
) {
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const gutterRef = useRef<HTMLDivElement>(null)
	const lineCount = Math.max(1, value.split('\n').length)

	useImperativeHandle(forwardedRef, () => {
		if (!textareaRef.current) {
			throw new Error('Text editor is not available')
		}

		return textareaRef.current
	})

	function handleSelection(event: React.SyntheticEvent<HTMLTextAreaElement>) {
		if (!onSelectionChange) {
			return
		}

		onSelectionChange(
			event.currentTarget.selectionStart,
			event.currentTarget.selectionEnd,
		)
	}

	function handleScroll(event: React.UIEvent<HTMLTextAreaElement>) {
		if (gutterRef.current) {
			gutterRef.current.scrollTop = event.currentTarget.scrollTop
		}
	}

	return (
		<div
			className={cn(
				'grid min-h-0 flex-1 overflow-hidden bg-card',
				showLineNumbers && 'grid-cols-[3rem_1fr]',
				className,
			)}
		>
			{showLineNumbers && (
				<div
					ref={gutterRef}
					aria-hidden='true'
					className={cn(
						'overflow-hidden border-e bg-muted/45 py-4 text-end',
						'font-mono text-xs leading-7 text-muted-foreground select-none',
					)}
				>
					{Array.from({ length: lineCount }, (_, index) => (
						<div key={index} className='pe-3'>
							{index + 1}
						</div>
					))}
				</div>
			)}
			<Textarea
				ref={textareaRef}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onSelect={handleSelection}
				onClick={handleSelection}
				onKeyUp={handleSelection}
				onScroll={handleScroll}
				aria-label={ariaLabel}
				placeholder={placeholder}
				spellCheck={false}
				className={cn(
					'reading-text h-full min-h-72 resize-none rounded-none',
					'border-0 bg-transparent px-5 py-4 text-lg leading-7',
					'shadow-none focus-visible:ring-0 lg:min-h-0',
					!showLineNumbers && 'col-span-full',
				)}
			/>
		</div>
	)
})
