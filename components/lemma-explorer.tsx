'use client'

import {
	ArrowUpRight,
	BookMarked,
	LibraryBig,
	RotateCcw,
	Search,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	PARTS_OF_SPEECH,
	getPartOfSpeechLabel,
	type PartOfSpeech,
	type ProjectLexiconData,
} from '@/lib/domain'
import { formatMorphology } from '@/lib/morphology'

interface LemmaExplorerProps {
	data: ProjectLexiconData
}

export function LemmaExplorer({ data }: LemmaExplorerProps) {
	const [query, setQuery] = useState('')
	const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech | 'ALL'>('ALL')
	const filteredLemmas = useMemo(() => {
		const normalizedQuery = query.normalize('NFKC').trim().toLocaleLowerCase()

		return data.lemmas.filter((lemma) => {
			if (partOfSpeech !== 'ALL' && lemma.partOfSpeech !== partOfSpeech) {
				return false
			}

			if (!normalizedQuery) {
				return true
			}

			return [
				lemma.headword,
				lemma.gloss,
				lemma.details,
				getPartOfSpeechLabel(lemma.partOfSpeech),
			]
				.join(' ')
				.normalize('NFKC')
				.toLocaleLowerCase()
				.includes(normalizedQuery)
		})
	}, [data.lemmas, partOfSpeech, query])

	return (
		<>
			<div className='grid gap-3 sm:grid-cols-[1fr_13rem]'>
				<div className='relative'>
					<Search
						className={
							'pointer-events-none absolute top-1/2 left-3 ' +
							'size-4 -translate-y-1/2 text-muted-foreground'
						}
					/>
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder='Search headwords, glosses, or details…'
						aria-label='Search lemma index'
						className='ps-9'
					/>
				</div>
				<Select
					value={partOfSpeech}
					onValueChange={(value) => {
						setPartOfSpeech(value as PartOfSpeech | 'ALL')
					}}
				>
					<SelectTrigger
						className='w-full'
						aria-label='Filter by part of speech'
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='ALL'>All parts of speech</SelectItem>
						{PARTS_OF_SPEECH.map((item) => (
							<SelectItem key={item} value={item}>
								{getPartOfSpeechLabel(item)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className='mt-6 grid gap-4'>
				{filteredLemmas.length === 0 ? (
					<Card className='border-dashed bg-card/70'>
						<CardContent
							className={
								'flex min-h-48 flex-col items-center ' +
								'justify-center text-center'
							}
						>
							<span
								className={
									'grid size-11 place-items-center ' +
									'rounded-lg bg-primary/9 text-primary'
								}
							>
								{data.lemmas.length === 0 ? <LibraryBig /> : <Search />}
							</span>
							<h2 className='mt-4 font-semibold'>
								{data.lemmas.length === 0
									? 'No base forms yet'
									: 'No matching base forms'}
							</h2>
							<p className='mt-1 max-w-md text-sm text-muted-foreground'>
								{data.lemmas.length === 0
									? 'Link an annotation to a base form and it will appear here.'
									: 'Try a different search or part-of-speech filter.'}
							</p>
						</CardContent>
					</Card>
				) : (
					filteredLemmas.map((lemma) => (
						<Card key={lemma.id} className='bg-card/90'>
							<CardHeader className='border-b'>
								<div className='flex flex-col gap-3 sm:flex-row sm:items-start'>
									<span
										className={
											'grid size-10 shrink-0 place-items-center ' +
											'rounded-lg bg-primary/9 text-primary'
										}
									>
										<BookMarked />
									</span>
									<div className='min-w-0'>
										<div className='flex flex-wrap items-center gap-2'>
											<CardTitle className='reading-text text-2xl'>
												{lemma.headword}
											</CardTitle>
											<Badge variant='secondary'>
												{getPartOfSpeechLabel(lemma.partOfSpeech)}
											</Badge>
										</div>
										<CardDescription className='mt-1 text-sm'>
											{lemma.gloss || 'No gloss'}
											{lemma.details ? ` · ${lemma.details}` : ''}
										</CardDescription>
									</div>
									<Badge variant='outline' className='sm:ms-auto'>
										{lemma.occurrences.length}{' '}
										{lemma.occurrences.length === 1
											? 'occurrence'
											: 'occurrences'}
									</Badge>
								</div>
							</CardHeader>
							<CardContent className='p-0'>
								{lemma.occurrences.length === 0 ? (
									<p className='px-5 py-4 text-sm text-muted-foreground'>
										This base form has no linked occurrences.
									</p>
								) : (
									<div className='divide-y'>
										{lemma.occurrences.map((occurrence) => {
											const morphology = formatMorphology(
												occurrence.morphology,
											)

											return (
												<div
													key={occurrence.annotationId}
													className={
														'flex flex-col gap-3 px-5 py-4 ' +
														'sm:flex-row sm:items-center'
													}
												>
													<div className='min-w-0 flex-1'>
														<div className='flex flex-wrap items-center gap-2'>
															<strong className='reading-text text-lg'>
																{occurrence.selectedText}
															</strong>
															{occurrence.isOrphaned && (
																<Badge
																	variant='outline'
																	className='text-amber-700'
																>
																	<RotateCcw />
																	Needs relinking
																</Badge>
															)}
														</div>
														{morphology && (
															<p className='mt-1 text-xs text-muted-foreground'>
																{morphology}
															</p>
														)}
														{occurrence.comment && (
															<p className='mt-1 line-clamp-1 text-sm text-muted-foreground'>
																{occurrence.comment}
															</p>
														)}
													</div>
													<div className='flex items-center gap-3 sm:shrink-0'>
														<span className='text-xs text-muted-foreground'>
															{occurrence.chapterTitle}
															{occurrence.lineNumber
																? `, line ${occurrence.lineNumber}`
																: ''}
														</span>
														<Button asChild variant='outline' size='sm'>
															<Link
																href={
																	`/projects/${data.project.id}/chapters/` +
																	`${occurrence.chapterId}` +
																	`?annotation=${occurrence.annotationId}`
																}
															>
																Open
																<ArrowUpRight />
															</Link>
														</Button>
													</div>
												</div>
											)
										})}
									</div>
								)}
							</CardContent>
						</Card>
					))
				)}
			</div>
		</>
	)
}
