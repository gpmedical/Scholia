import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import {
	ArrowRight,
	BookMarked,
	Languages,
	LibraryBig,
	MessageSquareText,
	MousePointer2,
} from 'lucide-react'
import Link from 'next/link'

import { BrandMark } from '@/components/brand-mark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'

const features = [
	{
		icon: Languages,
		title: 'Read beside your translation',
		description:
			'Keep Latin or Greek and your working translation aligned in a ' +
			'quiet, line-numbered workspace.',
	},
	{
		icon: MousePointer2,
		title: 'Annotate the exact words',
		description:
			'Select a word or passage, record its morphology, and add the ' +
			'comment your reading needs.',
	},
	{
		icon: LibraryBig,
		title: 'Build a living lexicon',
		description:
			'Link forms to lemmas and revisit every occurrence across the ' +
			'whole project.',
	},
]

export default function HomePage() {
	return (
		<main className='min-h-screen overflow-hidden'>
			<header className='border-b bg-background/90'>
				<div className='mx-auto flex h-18 max-w-7xl items-center px-5 sm:px-8'>
					<BrandMark />
					<div className='ms-auto flex items-center gap-2'>
						<Show when='signed-out'>
							<SignInButton>
								<Button variant='ghost'>Sign in</Button>
							</SignInButton>
							<SignUpButton>
								<Button>
									Begin a project
									<ArrowRight />
								</Button>
							</SignUpButton>
						</Show>
						<Show when='signed-in'>
							<Button asChild>
								<Link href='/dashboard'>
									Open workspace
									<ArrowRight />
								</Link>
							</Button>
							<UserButton />
						</Show>
					</div>
				</div>
			</header>

			<section
				className={
					'relative mx-auto grid max-w-7xl gap-14 px-5 py-18 ' +
					'sm:px-8 lg:grid-cols-[0.88fr_1.12fr] ' +
					'lg:items-center lg:py-28'
				}
			>
				<div className='relative z-10'>
					<Badge
						variant='outline'
						className='mb-6 border-primary/25 bg-card text-primary'
					>
						<BookMarked />
						Built for close reading
					</Badge>
					<h1
						className={
							'max-w-2xl text-5xl leading-[0.98] font-semibold ' +
							'tracking-[-0.045em] text-balance sm:text-6xl ' +
							'lg:text-7xl'
						}
					>
						Every word,
						<span className='reading-text block pt-2 font-normal italic text-primary'>
							carefully considered.
						</span>
					</h1>
					<p className='mt-7 max-w-xl text-lg leading-8 text-muted-foreground'>
						Scholia is a private digital desk for translating and annotating
						Latin and Ancient Greek. Keep the text, your translation, grammar,
						and commentary in one coherent place.
					</p>
					<div className='mt-8 flex flex-col gap-3 sm:flex-row'>
						<Show when='signed-out'>
							<SignUpButton>
								<Button size='lg' className='h-11 px-5'>
									Create your first project
									<ArrowRight />
								</Button>
							</SignUpButton>
						</Show>
						<Show when='signed-in'>
							<Button asChild size='lg' className='h-11 px-5'>
								<Link href='/dashboard'>
									Continue your work
									<ArrowRight />
								</Link>
							</Button>
						</Show>
						<Button asChild variant='outline' size='lg' className='h-11 px-5'>
							<a href='#method'>See how it works</a>
						</Button>
					</div>
					<p className='mt-5 text-xs tracking-wide text-muted-foreground'>
						No subscription · Your scholarship remains private
					</p>
				</div>

				<WorkspacePreview />
			</section>

			<section id='method' className='border-y bg-card/70 px-5 py-20 sm:px-8'>
				<div className='mx-auto max-w-7xl'>
					<div className='max-w-2xl'>
						<p
							className={
								'text-xs font-semibold tracking-[0.2em] ' +
								'text-primary uppercase'
							}
						>
							A method that stays out of the way
						</p>
						<h2 className='mt-3 text-3xl font-semibold tracking-tight sm:text-4xl'>
							From source text to searchable understanding.
						</h2>
					</div>
					<div className='mt-10 grid gap-4 md:grid-cols-3'>
						{features.map((feature, index) => (
							<Card key={feature.title} className='bg-background/80'>
								<CardHeader>
									<div className='mb-3 flex items-center justify-between'>
										<span
											className={
												'grid size-10 place-items-center ' +
												'rounded-lg bg-primary/10 text-primary'
											}
										>
											<feature.icon />
										</span>
										<span className='font-mono text-xs text-muted-foreground'>
											0{index + 1}
										</span>
									</div>
									<CardTitle>{feature.title}</CardTitle>
									<CardDescription className='leading-6'>
										{feature.description}
									</CardDescription>
								</CardHeader>
							</Card>
						))}
					</div>
				</div>
			</section>

			<footer
				className={
					'mx-auto flex max-w-7xl flex-col gap-5 px-5 py-9 ' +
					'text-sm text-muted-foreground sm:flex-row ' +
					'sm:items-center sm:px-8'
				}
			>
				<BrandMark compact />
				<p>Made for patient readers of enduring texts.</p>
				<p className='sm:ms-auto'>Scholia · MMXXVI</p>
			</footer>
		</main>
	)
}

function WorkspacePreview() {
	return (
		<div className='relative'>
			<div
				className={
					'absolute -inset-8 -z-10 rounded-full ' +
					'bg-primary/6 blur-3xl'
				}
			/>
			<div
				className={
					'overflow-hidden rounded-2xl border bg-card ' +
					'shadow-[0_24px_80px_oklch(0.3_0.04_40/0.16)]'
				}
			>
				<div className='flex h-11 items-center gap-2 border-b bg-muted/60 px-4'>
					<span className='size-2 rounded-full bg-primary/55' />
					<span className='size-2 rounded-full bg-brass/70' />
					<span className='size-2 rounded-full bg-border' />
					<span className='ms-3 text-xs font-medium text-muted-foreground'>
						Aeneid · Book I
					</span>
					<Badge variant='secondary' className='ms-auto'>
						Latin
					</Badge>
				</div>
				<div className='grid min-h-80 grid-cols-2'>
					<div className='border-e p-5'>
						<p
							className={
								'mb-5 text-[0.65rem] font-semibold ' +
								'tracking-[0.17em] text-muted-foreground uppercase'
							}
						>
							Original
						</p>
						<div className='grid grid-cols-[1.25rem_1fr] gap-3'>
							<div className='font-mono text-xs leading-8 text-muted-foreground'>
								1<br />2<br />3<br />4
							</div>
							<p className='reading-text text-lg leading-8'>
								Arma virumque cano, Troiae qui primus ab oris Italiam, fato
								profugus, Laviniaque venit litora, multum ille et terris
								iactatus et alto
							</p>
						</div>
					</div>
					<div className='p-5'>
						<p
							className={
								'mb-5 text-[0.65rem] font-semibold ' +
								'tracking-[0.17em] text-muted-foreground uppercase'
							}
						>
							Translation
						</p>
						<p
							className={
								'reading-text text-[1.05rem] leading-8 ' +
								'text-muted-foreground'
							}
						>
							I sing of arms and the man, who first from the shores of Troy,
							exiled by fate, came to Italy and the Lavinian coasts…
						</p>
					</div>
				</div>
				<div className='border-t bg-parchment/70 p-5'>
					<div className='flex items-start gap-3'>
						<span
							className={
								'grid size-9 shrink-0 place-items-center ' +
								'rounded-lg bg-primary text-primary-foreground'
							}
						>
							<MessageSquareText />
						</span>
						<div>
							<div className='flex flex-wrap items-center gap-2'>
								<strong className='reading-text text-lg'>cano</strong>
								<Badge variant='outline'>Verb</Badge>
								<span className='text-xs text-muted-foreground'>line 1</span>
							</div>
							<p className='mt-1 text-sm text-muted-foreground'>
								1st person · singular · present · indicative · active
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
