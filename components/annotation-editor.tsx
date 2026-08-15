'use client'

import { BookMarked, LoaderCircle, Save } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
	PARTS_OF_SPEECH,
	getPartOfSpeechLabel,
	type Annotation,
	type Lemma,
	type LemmaChoice,
	type PartOfSpeech,
	type SourceSelection,
} from '@/lib/domain'
import { getMorphologyFields } from '@/lib/morphology'

interface AnnotationDraft {
	partOfSpeech: PartOfSpeech
	morphology: Record<string, string>
	comment: string
	lemma: LemmaChoice | null
}

interface AnnotationEditorProps {
	selection: SourceSelection
	annotation: Annotation | null
	lemmas: Lemma[]
	isSaving: boolean
	onCancel: () => void
	onSave: (draft: AnnotationDraft) => void
}

export function AnnotationEditor({
	selection,
	annotation,
	lemmas,
	isSaving,
	onCancel,
	onSave,
}: AnnotationEditorProps) {
	const initialLemmaChoice = annotation?.lemmaId ?? 'none'
	const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>(
		annotation?.partOfSpeech ?? 'NOUN',
	)
	const [morphology, setMorphology] = useState<Record<string, string>>(
		annotation?.morphology ?? {},
	)
	const [comment, setComment] = useState(annotation?.comment ?? '')
	const [lemmaChoice, setLemmaChoice] = useState(initialLemmaChoice)
	const [headword, setHeadword] = useState('')
	const [gloss, setGloss] = useState('')
	const [details, setDetails] = useState('')
	const [error, setError] = useState('')
	const morphologyFields = useMemo(
		() => getMorphologyFields(partOfSpeech),
		[partOfSpeech],
	)

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError('')

		let lemma: LemmaChoice | null = null

		if (lemmaChoice === 'new') {
			if (!headword.trim()) {
				setError('Enter the base form before saving.')
				return
			}

			lemma = {
				type: 'new',
				headword,
				gloss,
				details,
			}
		} else if (lemmaChoice !== 'none') {
			lemma = {
				type: 'existing',
				lemmaId: lemmaChoice,
			}
		}

		const activeMorphology = Object.fromEntries(
			morphologyFields
				.map((field) => [field.key, morphology[field.key]])
				.filter((entry) => Boolean(entry[1])),
		)

		onSave({
			partOfSpeech,
			morphology: activeMorphology,
			comment,
			lemma,
		})
	}

	return (
		<form onSubmit={handleSubmit} className='flex h-full flex-col'>
			<div
				className={
					'flex shrink-0 flex-wrap items-center gap-3 border-b ' +
					'px-4 py-3 sm:px-5'
				}
			>
				<div className='min-w-0'>
					<p
						className={
							'text-xs font-medium tracking-wide ' +
							'text-muted-foreground uppercase'
						}
					>
						{annotation ? 'Edit note' : 'New note'} · line{' '}
						{selection.lineNumber}
					</p>
					<p className='reading-text mt-0.5 truncate text-lg font-semibold'>
						“{selection.selectedText}”
					</p>
				</div>
				<Badge variant='outline' className='ms-auto'>
					{selection.endOffset - selection.startOffset} characters
				</Badge>
			</div>

			<Tabs
				defaultValue='grammar'
				className='flex min-h-0 flex-1 flex-col overflow-hidden'
			>
				<div className='shrink-0 border-b px-4 pt-3 sm:px-5'>
					<TabsList>
						<TabsTrigger value='grammar'>Grammar</TabsTrigger>
						<TabsTrigger value='comment'>Comment</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent
					value='grammar'
					className={
						'grid min-h-0 flex-1 gap-4 overflow-y-auto ' +
						'px-4 py-4 sm:px-5'
					}
				>
					<div className='grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center'>
						<Label htmlFor='part-of-speech'>Part of speech</Label>
						<Select
							value={partOfSpeech}
							onValueChange={(value) => {
								setPartOfSpeech(value as PartOfSpeech)
							}}
						>
							<SelectTrigger id='part-of-speech' className='w-full'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PARTS_OF_SPEECH.map((item) => (
									<SelectItem key={item} value={item}>
										{getPartOfSpeechLabel(item)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{morphologyFields.length > 0 && (
						<div
							className={
								'grid gap-4 rounded-lg border bg-muted/35 ' +
								'p-4 sm:grid-cols-2'
							}
						>
							{morphologyFields.map((field) => (
								<div key={field.key} className='grid gap-2'>
									<Label htmlFor={`morphology-${field.key}`}>
										{field.label}
									</Label>
									<Select
										value={morphology[field.key] ?? ''}
										onValueChange={(value) => {
											setMorphology((current) => ({
												...current,
												[field.key]: value,
											}))
										}}
									>
										<SelectTrigger
											id={`morphology-${field.key}`}
											className='w-full bg-background'
										>
											<SelectValue placeholder={field.placeholder} />
										</SelectTrigger>
										<SelectContent>
											{field.options.map((option) => (
												<SelectItem key={option} value={option}>
													{option}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							))}
						</div>
					)}

					<div className='grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center'>
						<Label htmlFor='lemma-choice'>Base form</Label>
						<Select value={lemmaChoice} onValueChange={setLemmaChoice}>
							<SelectTrigger id='lemma-choice' className='w-full'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='none'>No linked base form</SelectItem>
								<SelectItem value='new'>+ Create a new base form</SelectItem>
								{lemmas.map((lemma) => (
									<SelectItem key={lemma.id} value={lemma.id}>
										{lemma.headword}
										{lemma.gloss ? ` — ${lemma.gloss}` : ''}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{lemmaChoice === 'new' && (
						<div
							className={
								'grid gap-4 rounded-lg border border-primary/15 ' +
								'bg-primary/4 p-4 sm:grid-cols-2'
							}
						>
							<div className='grid gap-2'>
								<Label htmlFor='lemma-headword'>Headword</Label>
								<Input
									id='lemma-headword'
									value={headword}
									onChange={(event) => {
										setHeadword(event.target.value)
									}}
									placeholder='e.g. cano'
									maxLength={120}
								/>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='lemma-gloss'>Gloss</Label>
								<Input
									id='lemma-gloss'
									value={gloss}
									onChange={(event) => {
										setGloss(event.target.value)
									}}
									placeholder='to sing'
									maxLength={240}
								/>
							</div>
							<div className='grid gap-2 sm:col-span-2'>
								<Label htmlFor='lemma-details'>Dictionary details</Label>
								<Input
									id='lemma-details'
									value={details}
									onChange={(event) => {
										setDetails(event.target.value)
									}}
									placeholder='3rd conjugation, irregular'
									maxLength={300}
								/>
							</div>
						</div>
					)}
				</TabsContent>

				<TabsContent
					value='comment'
					className={
						'min-h-0 flex-1 overflow-y-auto px-4 py-4 ' +
						'sm:px-5'
					}
				>
					<div className='grid gap-2'>
						<Label htmlFor='annotation-comment'>Comment</Label>
						<Textarea
							id='annotation-comment'
							value={comment}
							onChange={(event) => setComment(event.target.value)}
							placeholder={
								'Translation choice, syntax, textual note, ' +
								'or interpretation…'
							}
							rows={7}
							maxLength={10_000}
							className='reading-text text-base leading-6'
						/>
						<p className='text-end text-xs text-muted-foreground'>
							{comment.length.toLocaleString()} / 10,000
						</p>
					</div>
				</TabsContent>
			</Tabs>

			{error && (
				<p role='alert' className='px-4 pb-3 text-sm text-destructive sm:px-5'>
					{error}
				</p>
			)}

			<div
				className={
					'mt-auto flex shrink-0 flex-col-reverse gap-2 border-t ' +
					'bg-muted/35 px-4 py-3 sm:flex-row ' +
					'sm:justify-end sm:px-5'
				}
			>
				<Button type='button' variant='outline' onClick={onCancel}>
					Cancel
				</Button>
				<Button type='submit' disabled={isSaving}>
					{isSaving ? (
						<LoaderCircle className='animate-spin' />
					) : annotation ? (
						<Save />
					) : (
						<BookMarked />
					)}
					{annotation ? 'Save changes' : 'Add note'}
				</Button>
			</div>
		</form>
	)
}
