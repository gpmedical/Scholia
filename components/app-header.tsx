import { UserButton } from '@clerk/nextjs'
import { BookOpenText, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'

export function AppHeader() {
	return (
		<header
			className={
				'sticky top-0 z-40 h-16 border-b ' +
				'bg-background/95 backdrop-blur'
			}
		>
			<div
				className={
					'mx-auto flex h-full max-w-[1600px] items-center ' +
					'px-4 sm:px-6'
				}
			>
				<BrandMark href='/dashboard' />
				<nav
					aria-label='Primary navigation'
					className='ms-auto flex items-center gap-1 sm:gap-2'
				>
					<Button asChild variant='ghost' className='hidden sm:flex'>
						<Link href='/dashboard'>
							<LayoutGrid />
							Projects
						</Link>
					</Button>
					<span className='mx-1 hidden h-5 w-px bg-border sm:block' />
					<div
						className={
							'flex items-center gap-2 rounded-full border ' +
							'bg-card px-2 py-1'
						}
					>
						<BookOpenText
							aria-hidden='true'
							className='size-3.5 text-muted-foreground'
						/>
						<UserButton
							appearance={{
								elements: {
									userButtonAvatarBox: 'size-7',
								},
							}}
						/>
					</div>
				</nav>
			</div>
		</header>
	)
}
