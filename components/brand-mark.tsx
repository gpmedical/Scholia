import Link from 'next/link'

import { cn } from '@/lib/utils'

interface BrandMarkProps {
	className?: string
	compact?: boolean
	href?: string
}

export function BrandMark({
	className,
	compact = false,
	href = '/',
}: BrandMarkProps) {
	return (
		<Link
			href={href}
			aria-label='Scholia home'
			className={cn('group inline-flex items-center gap-3', className)}
		>
			<span
				aria-hidden='true'
				className={cn(
					'grid size-9 place-items-center rounded-lg border',
					'border-primary/20 bg-primary text-primary-foreground',
					'shadow-[inset_0_0_0_1px_oklch(1_0_0/0.12)]',
					'transition-transform group-hover:-rotate-2',
				)}
			>
				<span className='reading-text text-xl leading-none'>Σ</span>
			</span>
			{!compact && (
				<span className='flex flex-col leading-none'>
					<span className='text-[1.05rem] font-semibold tracking-tight'>
						Scholia
					</span>
					<span
						className={
							'mt-1 text-[0.62rem] font-medium ' +
							'tracking-[0.18em] text-muted-foreground uppercase'
						}
					>
						Classical workspace
					</span>
				</span>
			)}
		</Link>
	)
}
