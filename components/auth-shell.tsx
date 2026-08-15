import { BookMarked, Languages, LibraryBig } from 'lucide-react'

import { BrandMark } from '@/components/brand-mark'

interface AuthShellProps {
	eyebrow: string
	title: string
	description: string
	children: React.ReactNode
}

export function AuthShell({
	eyebrow,
	title,
	description,
	children,
}: AuthShellProps) {
	return (
		<main className='grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]'>
			<section
				className={
					'relative hidden overflow-hidden border-e bg-primary ' +
					'p-12 text-primary-foreground lg:flex lg:flex-col'
				}
			>
				<div className='auth-pattern absolute inset-0 opacity-15' />
				<BrandMark
					href='/'
					className={
						'relative z-10 ' +
						'[&>span:first-child]:bg-primary-foreground ' +
						'[&>span:first-child]:text-primary'
					}
				/>
				<div className='relative z-10 my-auto max-w-lg'>
					<p
						className={
							'text-xs font-semibold tracking-[0.2em] ' +
							'text-primary-foreground/70 uppercase'
						}
					>
						{eyebrow}
					</p>
					<h1
						className={
							'mt-4 text-5xl leading-[1.04] font-semibold ' +
							'tracking-[-0.04em]'
						}
					>
						{title}
					</h1>
					<p className='mt-5 text-lg leading-8 text-primary-foreground/75'>
						{description}
					</p>
					<div className='mt-10 grid gap-3 text-sm'>
						<AuthFeature icon={Languages} text='Latin and Ancient Greek' />
						<AuthFeature icon={BookMarked} text='Grammar and commentary' />
						<AuthFeature icon={LibraryBig} text='Project-wide lemma index' />
					</div>
				</div>
				<p className='relative z-10 text-xs text-primary-foreground/55'>
					Scholia · A quieter place for difficult texts
				</p>
			</section>
			<section
				className={
					'flex min-h-screen flex-col bg-background ' +
					'px-4 py-6 sm:px-8'
				}
			>
				<div className='lg:hidden'>
					<BrandMark href='/' />
				</div>
				<div className='m-auto flex w-full max-w-md justify-center py-8'>
					{children}
				</div>
			</section>
		</main>
	)
}

interface AuthFeatureProps {
	icon: React.ComponentType<{ className?: string }>
	text: string
}

function AuthFeature({ icon: Icon, text }: AuthFeatureProps) {
	return (
		<div className='flex items-center gap-3'>
			<span
				className={
					'grid size-8 place-items-center rounded-lg ' +
					'bg-primary-foreground/10'
				}
			>
				<Icon className='size-4' />
			</span>
			<span>{text}</span>
		</div>
	)
}
