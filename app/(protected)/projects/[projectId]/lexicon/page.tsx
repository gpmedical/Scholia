import { ArrowLeft, BookMarked, LibraryBig } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LemmaExplorer } from '@/components/lemma-explorer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { requireUserId } from '@/lib/auth'
import { getProjectLexicon } from '@/lib/data-access'
import { getLanguageLabel } from '@/lib/domain'

interface LexiconPageProps {
	params: Promise<{ projectId: string }>
}

export default async function LexiconPage({ params }: LexiconPageProps) {
	const { projectId } = await params
	const userId = await requireUserId()
	const data = getProjectLexicon(userId, projectId)

	if (!data) {
		notFound()
	}

	const occurrenceCount = data.lemmas.reduce(
		(total, lemma) => total + lemma.occurrences.length,
		0,
	)

	return (
		<main className='mx-auto w-full max-w-6xl px-4 py-9 sm:px-6 sm:py-12'>
			<Button asChild variant='ghost' className='mb-6 -ms-2'>
				<Link href={`/projects/${data.project.id}`}>
					<ArrowLeft />
					{data.project.name}
				</Link>
			</Button>

			<div className='flex flex-col gap-5 sm:flex-row sm:items-end'>
				<div>
					<div className='flex flex-wrap items-center gap-2'>
						<Badge variant='secondary'>
							{getLanguageLabel(data.project.language)}
						</Badge>
						<Badge variant='outline'>
							<BookMarked />
							{data.lemmas.length} base forms
						</Badge>
						<Badge variant='outline'>{occurrenceCount} occurrences</Badge>
					</div>
					<h1
						className={
							'mt-3 flex items-center gap-3 text-3xl ' +
							'font-semibold tracking-tight sm:text-4xl'
						}
					>
						<LibraryBig className='size-8 text-primary' />
						Lemma index
					</h1>
					<p className='mt-3 max-w-2xl leading-7 text-muted-foreground'>
						Every base form annotated in {data.project.name}, with each
						inflected occurrence linked back to its chapter and line.
					</p>
				</div>
			</div>

			<div className='folio-rule my-8 opacity-60' />
			<LemmaExplorer data={data} />
		</main>
	)
}
