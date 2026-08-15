import { BookX } from 'lucide-react'
import Link from 'next/link'

import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NotFoundPage() {
	return (
		<main className='grid min-h-screen place-items-center px-4 py-12'>
			<Card className='w-full max-w-md bg-card/90'>
				<CardContent className='flex flex-col items-center py-10 text-center'>
					<BrandMark compact />
					<span
						className={
							'mt-7 grid size-14 place-items-center ' +
							'rounded-xl bg-primary/9 text-primary'
						}
					>
						<BookX className='size-7' />
					</span>
					<h1 className='mt-5 text-2xl font-semibold'>Page not found</h1>
					<p className='mt-2 text-sm leading-6 text-muted-foreground'>
						This folio may have been moved, deleted, or never belonged to this
						account.
					</p>
					<Button asChild className='mt-6'>
						<Link href='/dashboard'>Return to projects</Link>
					</Button>
				</CardContent>
			</Card>
		</main>
	)
}
