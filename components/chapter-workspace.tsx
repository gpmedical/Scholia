'use client'

import {
	AlertCircle,
	BookMarked,
	BookOpenText,
	Check,
	ChevronLeft,
	LibraryBig,
	LoaderCircle,
	Menu,
	MessageSquarePlus,
	PenLine,
	RotateCcw,
	Save,
	Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AnnotationEditor } from '@/components/annotation-editor'
import { CreateChapterDialog } from '@/components/create-chapter-dialog'
import { LinedTextarea } from '@/components/lined-textarea'
import { RenameDialog } from '@/components/rename-dialog'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet'
import type {
	ActionResult,
	Annotation,
	ChapterSummary,
	ChapterWorkspaceData,
	CreateChapterInput,
	Lemma,
	LemmaChoice,
	PartOfSpeech,
	RenameChapterInput,
	RenameProjectInput,
	SaveChapterContentInput,
	SourceSelection,
	UpsertAnnotationInput,
} from '@/lib/domain'
import { getLanguageLabel, getPartOfSpeechLabel } from '@/lib/domain'
import { formatMorphology } from '@/lib/morphology'
import {
	annotationContainsOffset,
	annotationMatchesSelection,
	trimSourceSelection,
} from '@/lib/text-selection'
import { cn } from '@/lib/utils'

type SaveChapterAction = (
	input: SaveChapterContentInput,
) => Promise<ActionResult<Annotation[]>>

type UpsertAnnotationAction = (input: UpsertAnnotationInput) => Promise<
	ActionResult<{
		annotation: Annotation
		lemmas: Lemma[]
	}>
>

type DeleteAnnotationAction = (
	annotationId: string,
	projectId: string,
) => Promise<ActionResult<null>>

type CreateChapterAction = (
	input: CreateChapterInput,
) => Promise<ActionResult<ChapterSummary>>

type RenameProjectAction = (
	input: RenameProjectInput,
) => Promise<ActionResult<null>>

type RenameChapterAction = (
	input: RenameChapterInput,
) => Promise<ActionResult<null>>

interface ChapterWorkspaceProps {
	initialData: ChapterWorkspaceData
	initialAnnotationId?: string
	saveChapterContent: SaveChapterAction
	upsertAnnotation: UpsertAnnotationAction
	deleteAnnotation: DeleteAnnotationAction
	createChapter: CreateChapterAction
	renameProject: RenameProjectAction
	renameChapter: RenameChapterAction
}

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'

interface AnnotationDraft {
	partOfSpeech: PartOfSpeech
	morphology: Record<string, string>
	comment: string
	lemma: LemmaChoice | null
}

export function ChapterWorkspace({
	initialData,
	initialAnnotationId,
	saveChapterContent,
	upsertAnnotation,
	deleteAnnotation,
	createChapter,
	renameProject,
	renameChapter,
}: ChapterWorkspaceProps) {
	const initialFocusedAnnotation = initialData.annotations.find(
		(item) => item.id === initialAnnotationId && !item.isOrphaned,
	)
	const router = useRouter()
	const sourceTextareaRef = useRef<HTMLTextAreaElement>(null)
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const saveRequestRef = useRef(0)
	const editVersionRef = useRef(0)
	const originalTextRef = useRef(initialData.chapter.originalText)
	const translationTextRef = useRef(initialData.chapter.translationText)
	const [originalText, setOriginalText] = useState(
		initialData.chapter.originalText,
	)
	const [translationText, setTranslationText] = useState(
		initialData.chapter.translationText,
	)
	const [annotations, setAnnotations] = useState(initialData.annotations)
	const [lemmas, setLemmas] = useState(initialData.lemmas)
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
	const [selection, setSelection] = useState<SourceSelection | null>(
		initialFocusedAnnotation
			? selectionFromAnnotation(initialFocusedAnnotation)
			: null,
	)
	const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(
		null,
	)
	const [isEditorOpen, setIsEditorOpen] = useState(false)
	const [isSavingNote, setIsSavingNote] = useState(false)

	const performSave = useCallback(async (): Promise<boolean> => {
		if (saveTimerRef.current) {
			clearTimeout(saveTimerRef.current)
			saveTimerRef.current = null
		}

		const requestId = saveRequestRef.current + 1
		const editVersion = editVersionRef.current
		saveRequestRef.current = requestId
		setSaveStatus('saving')

		const result = await saveChapterContent({
			chapterId: initialData.chapter.id,
			originalText: originalTextRef.current,
			translationText: translationTextRef.current,
		})

		if (requestId !== saveRequestRef.current) {
			return result.success
		}

		if (!result.success) {
			setSaveStatus('error')
			return false
		}

		if (editVersion === editVersionRef.current) {
			setAnnotations(result.data)
			setSaveStatus('saved')
		}

		return true
	}, [
		initialData.chapter.id,
		saveChapterContent,
		setAnnotations,
		setSaveStatus,
	])

	const scheduleSave = useCallback(() => {
		if (saveTimerRef.current) {
			clearTimeout(saveTimerRef.current)
		}

		saveTimerRef.current = setTimeout(() => {
			void performSave()
		}, 900)
	}, [performSave])

	useEffect(() => {
		return () => {
			if (saveTimerRef.current) {
				clearTimeout(saveTimerRef.current)
			}
		}
	}, [])

	useEffect(() => {
		function handleSaveShortcut(event: KeyboardEvent) {
			if ((event.ctrlKey || event.metaKey) && event.key === 's') {
				event.preventDefault()
				void performSave()
			}
		}

		window.addEventListener('keydown', handleSaveShortcut)

		return () => {
			window.removeEventListener('keydown', handleSaveShortcut)
		}
	}, [performSave])

	useEffect(() => {
		const annotation = annotations.find(
			(item) => item.id === initialAnnotationId,
		)

		if (!annotation || annotation.isOrphaned) {
			return
		}

		requestAnimationFrame(() => {
			sourceTextareaRef.current?.focus()
			sourceTextareaRef.current?.setSelectionRange(
				annotation.startOffset,
				annotation.endOffset,
			)
		})
	}, [annotations, initialAnnotationId])

	function handleOriginalTextChange(value: string) {
		originalTextRef.current = value
		editVersionRef.current += 1
		setOriginalText(value)
		setSaveStatus('unsaved')
		setSelection(null)
		setIsEditorOpen(false)
		setEditingAnnotation(null)
		scheduleSave()
	}

	function handleTranslationTextChange(value: string) {
		translationTextRef.current = value
		editVersionRef.current += 1
		setTranslationText(value)
		setSaveStatus('unsaved')
		scheduleSave()
	}

	function handleSourceSelection(startOffset: number, endOffset: number) {
		if (startOffset !== endOffset) {
			const nextSelection = trimSourceSelection(
				originalText,
				startOffset,
				endOffset,
			)
			setSelection(nextSelection)
			setEditingAnnotation(null)
			setIsEditorOpen(false)
			return
		}

		const annotation = annotations.find((item) => {
			return annotationContainsOffset(item, startOffset)
		})

		setSelection(annotation ? selectionFromAnnotation(annotation) : null)
		setEditingAnnotation(null)
		setIsEditorOpen(false)
	}

	function handleFocusAnnotation(annotation: Annotation) {
		if (annotation.isOrphaned) {
			return
		}

		setSelection(selectionFromAnnotation(annotation))
		setEditingAnnotation(null)
		setIsEditorOpen(false)
		sourceTextareaRef.current?.focus()
		sourceTextareaRef.current?.setSelectionRange(
			annotation.startOffset,
			annotation.endOffset,
		)
	}

	function handleEditAnnotation(annotation: Annotation) {
		if (!annotation.isOrphaned) {
			handleFocusAnnotation(annotation)
		}

		setEditingAnnotation(annotation)
		setIsEditorOpen(true)
	}

	async function handleSaveAnnotation(draft: AnnotationDraft) {
		if (!selection) {
			return
		}

		setIsSavingNote(true)
		const isContentSaved = await performSave()

		if (!isContentSaved) {
			setIsSavingNote(false)
			toast.error('Save the chapter before adding this note.')
			return
		}

		const result = await upsertAnnotation({
			annotationId: editingAnnotation?.id,
			chapterId: initialData.chapter.id,
			startOffset: selection.startOffset,
			endOffset: selection.endOffset,
			selectedText: selection.selectedText,
			partOfSpeech: draft.partOfSpeech,
			morphology: draft.morphology,
			comment: draft.comment,
			lemma: draft.lemma,
		})

		setIsSavingNote(false)

		if (!result.success) {
			toast.error(result.error)
			return
		}

		setAnnotations((current) => {
			const existingIndex = current.findIndex(
				(item) => item.id === result.data.annotation.id,
			)

			if (existingIndex === -1) {
				return [...current, result.data.annotation]
			}

			return current.map((item) => {
				return item.id === result.data.annotation.id
					? result.data.annotation
					: item
			})
		})
		setLemmas(result.data.lemmas)
		setEditingAnnotation(null)
		setIsEditorOpen(false)
		toast.success('Annotation saved')
		router.refresh()
	}

	async function handleDeleteAnnotation(annotationId: string) {
		const result = await deleteAnnotation(annotationId, initialData.project.id)

		if (!result.success) {
			toast.error(result.error)
			return
		}

		setAnnotations((current) => {
			return current.filter((item) => item.id !== annotationId)
		})
		setEditingAnnotation(null)
		setIsEditorOpen(false)
		toast.success('Annotation deleted')
	}

	const matchingAnnotations = useMemo(() => {
		if (!selection) {
			return []
		}

		return annotations.filter((annotation) => {
			return annotationMatchesSelection(annotation, selection)
		})
	}, [annotations, selection])
	const orphanedAnnotations = annotations.filter(
		(annotation) => annotation.isOrphaned,
	)

	return (
		<div
			className={cn(
				'lg:grid lg:h-full lg:[contain:layout_paint]',
				'lg:grid-cols-[17rem_minmax(0,1fr)] lg:overflow-hidden',
			)}
		>
			<aside className='hidden border-e bg-sidebar lg:flex lg:min-h-0 lg:flex-col'>
				<WorkspaceNavigation
					data={initialData}
					createChapter={createChapter}
					renameProject={renameProject}
				/>
			</aside>

			<section className='flex min-w-0 flex-col lg:min-h-0 lg:overflow-hidden'>
				<WorkspaceToolbar
					data={initialData}
					renameChapter={renameChapter}
					saveStatus={saveStatus}
					orphanedCount={orphanedAnnotations.length}
					onSave={() => void performSave()}
					mobileNavigation={
						<MobileNavigation
							data={initialData}
							createChapter={createChapter}
							renameProject={renameProject}
						/>
					}
				/>

				<div
					className={cn(
						'grid min-h-0 flex-1',
						'lg:grid-rows-[minmax(0,0.46fr)_minmax(0,0.54fr)]',
					)}
				>
					<div
						data-workspace-region='text'
						className='grid min-h-0 overflow-hidden border-b md:grid-cols-2'
					>
						<EditorPanel title='Original' hint='Select words to annotate'>
							<LinedTextarea
								ref={sourceTextareaRef}
								value={originalText}
								onChange={handleOriginalTextChange}
								onSelectionChange={handleSourceSelection}
								ariaLabel='Original text'
								placeholder={
									initialData.project.language === 'LATIN'
										? 'Paste or type the Latin text here…'
										: 'Paste or type the Ancient Greek text here…'
								}
							/>
						</EditorPanel>
						<EditorPanel
							title='Translation'
							className='border-t md:border-t-0 md:border-s'
						>
							<LinedTextarea
								value={translationText}
								onChange={handleTranslationTextChange}
								ariaLabel='Translation'
								placeholder='Write your translation here…'
								showLineNumbers={false}
							/>
						</EditorPanel>
					</div>

					<NotesPanel
						selection={selection}
						matchingAnnotations={matchingAnnotations}
						orphanedAnnotations={orphanedAnnotations}
						lemmas={lemmas}
						editingAnnotation={editingAnnotation}
						isEditorOpen={isEditorOpen}
						isSavingNote={isSavingNote}
						onAdd={() => {
							setEditingAnnotation(null)
							setIsEditorOpen(true)
						}}
						onCancel={() => {
							setEditingAnnotation(null)
							setIsEditorOpen(false)
						}}
						onEdit={handleEditAnnotation}
						onFocus={handleFocusAnnotation}
						onRelink={(annotation) => {
							setEditingAnnotation(annotation)
							setIsEditorOpen(true)
						}}
						onSave={handleSaveAnnotation}
						onDelete={handleDeleteAnnotation}
					/>
				</div>
			</section>
		</div>
	)
}

function selectionFromAnnotation(annotation: Annotation): SourceSelection {
	return {
		startOffset: annotation.startOffset,
		endOffset: annotation.endOffset,
		selectedText: annotation.selectedText,
		lineNumber: annotation.lineNumber ?? 1,
	}
}

interface WorkspaceNavigationProps {
	data: ChapterWorkspaceData
	createChapter: CreateChapterAction
	renameProject: RenameProjectAction
}

function WorkspaceNavigation({
	data,
	createChapter,
	renameProject,
}: WorkspaceNavigationProps) {
	return (
		<>
			<div className='border-b p-4'>
				<Button asChild variant='ghost' className='mb-3 -ms-2'>
					<Link href={`/projects/${data.project.id}`}>
						<ChevronLeft />
						Project overview
					</Link>
				</Button>
				<div className='flex items-center gap-1'>
					<p className='min-w-0 flex-1 truncate font-semibold'>
						{data.project.name}
					</p>
					<RenameDialog
						kind='project'
						id={data.project.id}
						currentName={data.project.name}
						rename={renameProject}
						trigger='icon'
					/>
				</div>
				<Badge variant='secondary' className='mt-2'>
					{getLanguageLabel(data.project.language)}
				</Badge>
			</div>
			<nav
				aria-label='Project chapters'
				className='min-h-0 flex-1 overflow-y-auto p-3'
			>
				<p
					className={cn(
						'px-2 pb-2 text-[0.65rem] font-semibold',
						'tracking-[0.17em] text-muted-foreground uppercase',
					)}
				>
					Chapters
				</p>
				<div className='grid gap-1'>
					{data.chapters.map((chapter) => (
						<Button
							key={chapter.id}
							asChild
							variant={chapter.id === data.chapter.id ? 'secondary' : 'ghost'}
							className='h-auto justify-start py-2 text-start'
						>
							<Link
								href={`/projects/${data.project.id}/chapters/` + chapter.id}
							>
								<BookOpenText />
								<span className='truncate'>{chapter.title}</span>
							</Link>
						</Button>
					))}
				</div>
			</nav>
			<div className='grid gap-2 border-t p-3'>
				<CreateChapterDialog
					projectId={data.project.id}
					createChapter={createChapter}
					variant='outline'
				/>
				<Button asChild variant='ghost' className='justify-start'>
					<Link href={`/projects/${data.project.id}/lexicon`}>
						<LibraryBig />
						Lemma index
					</Link>
				</Button>
			</div>
		</>
	)
}

function MobileNavigation(props: WorkspaceNavigationProps) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					variant='outline'
					size='icon'
					aria-label='Open project navigation'
					className='lg:hidden'
				>
					<Menu />
				</Button>
			</SheetTrigger>
			<SheetContent side='left' className='p-0'>
				<SheetHeader className='sr-only'>
					<SheetTitle>Project navigation</SheetTitle>
					<SheetDescription>
						Choose a chapter or open the lemma index.
					</SheetDescription>
				</SheetHeader>
				<div className='flex h-full flex-col bg-sidebar'>
					<WorkspaceNavigation {...props} />
				</div>
			</SheetContent>
		</Sheet>
	)
}

interface WorkspaceToolbarProps {
	data: ChapterWorkspaceData
	renameChapter: RenameChapterAction
	saveStatus: SaveStatus
	orphanedCount: number
	onSave: () => void
	mobileNavigation: React.ReactNode
}

function WorkspaceToolbar({
	data,
	renameChapter,
	saveStatus,
	orphanedCount,
	onSave,
	mobileNavigation,
}: WorkspaceToolbarProps) {
	const status = {
		saved: { icon: Check, label: 'Saved', className: 'text-emerald-700' },
		unsaved: {
			icon: PenLine,
			label: 'Unsaved changes',
			className: 'text-amber-700',
		},
		saving: {
			icon: LoaderCircle,
			label: 'Saving…',
			className: 'text-muted-foreground',
		},
		error: {
			icon: AlertCircle,
			label: 'Save failed',
			className: 'text-destructive',
		},
	}[saveStatus]
	const StatusIcon = status.icon

	return (
		<header
			className={cn(
				'flex min-h-15 shrink-0 items-center gap-3 border-b',
				'bg-card/80 px-3 sm:px-4',
			)}
		>
			{mobileNavigation}
			<div className='min-w-0'>
				<h1 className='truncate text-sm font-semibold sm:text-base'>
					{data.chapter.title}
				</h1>
				<p className='hidden truncate text-xs text-muted-foreground sm:block'>
					{data.project.name}
				</p>
			</div>
			<RenameDialog
				kind='chapter'
				id={data.chapter.id}
				currentName={data.chapter.title}
				rename={renameChapter}
				trigger='icon'
			/>
			{orphanedCount > 0 && (
				<Badge variant='outline' className='hidden text-amber-700 sm:flex'>
					<RotateCcw />
					{orphanedCount} to relink
				</Badge>
			)}
			<div className='ms-auto flex items-center gap-2'>
				<span
					className={cn(
						'hidden items-center gap-1.5 text-xs sm:flex',
						status.className,
					)}
				>
					<StatusIcon
						className={cn(
							'size-3.5',
							saveStatus === 'saving' && 'animate-spin',
						)}
					/>
					{status.label}
				</span>
				<Button
					variant={saveStatus === 'error' ? 'default' : 'outline'}
					onClick={onSave}
					disabled={saveStatus === 'saving'}
					aria-label='Save chapter'
				>
					<Save />
					<span className='hidden sm:inline'>Save</span>
				</Button>
			</div>
		</header>
	)
}

interface EditorPanelProps {
	title: string
	hint?: string
	className?: string
	children: React.ReactNode
}

function EditorPanel({ title, hint, className, children }: EditorPanelProps) {
	return (
		<section className={cn('flex min-h-0 flex-col', className)}>
			<header
				className={cn(
					'flex h-10 shrink-0 items-center border-b',
					'bg-muted/35 px-4',
				)}
			>
				<h2
					className={cn(
						'text-[0.68rem] font-semibold tracking-[0.17em]',
						'text-muted-foreground uppercase',
					)}
				>
					{title}
				</h2>
				{hint && (
					<span className='ms-auto text-[0.68rem] text-muted-foreground'>
						{hint}
					</span>
				)}
			</header>
			{children}
		</section>
	)
}

interface NotesPanelProps {
	selection: SourceSelection | null
	matchingAnnotations: Annotation[]
	orphanedAnnotations: Annotation[]
	lemmas: Lemma[]
	editingAnnotation: Annotation | null
	isEditorOpen: boolean
	isSavingNote: boolean
	onAdd: () => void
	onCancel: () => void
	onEdit: (annotation: Annotation) => void
	onFocus: (annotation: Annotation) => void
	onRelink: (annotation: Annotation) => void
	onSave: (draft: AnnotationDraft) => void
	onDelete: (annotationId: string) => Promise<void>
}

function NotesPanel({
	selection,
	matchingAnnotations,
	orphanedAnnotations,
	lemmas,
	editingAnnotation,
	isEditorOpen,
	isSavingNote,
	onAdd,
	onCancel,
	onEdit,
	onFocus,
	onRelink,
	onSave,
	onDelete,
}: NotesPanelProps) {
	if (selection && isEditorOpen) {
		return (
			<section
				aria-label='Annotation editor'
				data-workspace-region='notes'
				className='h-full min-h-0 overflow-hidden bg-card'
			>
				<AnnotationEditor
					key={`${editingAnnotation?.id ?? 'new'}-${selection.startOffset}`}
					selection={selection}
					annotation={editingAnnotation}
					lemmas={lemmas}
					isSaving={isSavingNote}
					onCancel={onCancel}
					onSave={onSave}
				/>
			</section>
		)
	}

	return (
		<section
			aria-label='Notes'
			data-workspace-region='notes'
			className='h-full min-h-0 overflow-y-auto bg-parchment/45'
		>
			<header
				className={cn(
					'sticky top-0 z-10 flex min-h-11 items-center',
					'gap-3 border-b bg-background/95 px-4 py-2',
					'backdrop-blur sm:px-5',
				)}
			>
				<BookMarked className='size-4 text-primary' />
				<h2
					className={cn(
						'text-[0.68rem] font-semibold tracking-[0.17em]',
						'text-muted-foreground uppercase',
					)}
				>
					Notes
				</h2>
				{selection && (
					<>
						<span className='h-4 w-px bg-border' />
						<p className='reading-text truncate text-sm font-semibold'>
							“{selection.selectedText}”
						</p>
						<Badge variant='outline' className='hidden sm:flex'>
							line {selection.lineNumber}
						</Badge>
						<Button size='sm' className='ms-auto' onClick={onAdd}>
							<MessageSquarePlus />
							Add note
						</Button>
					</>
				)}
			</header>

			<div className='p-4 sm:p-5'>
				{!selection ? (
					<div
						className={cn(
							'flex min-h-28 flex-col items-center',
							'justify-center text-center',
						)}
					>
						<span
							className={cn(
								'grid size-10 place-items-center rounded-lg',
								'bg-primary/9 text-primary',
							)}
						>
							<MessageSquarePlus />
						</span>
						<p className='mt-3 text-sm font-medium'>
							Select a word or passage in the original
						</p>
						<p className='mt-1 text-xs text-muted-foreground'>
							Its grammar and commentary will appear here.
						</p>
					</div>
				) : matchingAnnotations.length === 0 ? (
					<div
						className={cn(
							'flex min-h-24 flex-col items-center justify-center',
							'rounded-lg border border-dashed bg-card/60 text-center',
						)}
					>
						<p className='text-sm font-medium'>No note for this selection</p>
						<p className='mt-1 text-xs text-muted-foreground'>
							Add morphology, a base form, or your own comment.
						</p>
						<Button size='sm' className='mt-3' onClick={onAdd}>
							<MessageSquarePlus />
							Add the first note
						</Button>
					</div>
				) : (
					<div className='grid gap-3 xl:grid-cols-2'>
						{matchingAnnotations.map((annotation) => (
							<AnnotationCard
								key={annotation.id}
								annotation={annotation}
								lemma={lemmas.find((item) => item.id === annotation.lemmaId)}
								onEdit={() => onEdit(annotation)}
								onFocus={() => onFocus(annotation)}
								onDelete={() => onDelete(annotation.id)}
							/>
						))}
					</div>
				)}

				{orphanedAnnotations.length > 0 && (
					<div className='mt-5 border-t pt-4'>
						<div className='mb-3 flex items-center gap-2'>
							<RotateCcw className='size-4 text-amber-700' />
							<h3 className='text-sm font-semibold'>Notes to relink</h3>
							<Badge variant='outline'>{orphanedAnnotations.length}</Badge>
						</div>
						<p className='mb-3 text-xs text-muted-foreground'>
							Their quoted text was edited away. Select a replacement passage,
							then relink the note.
						</p>
						<div className='grid gap-2'>
							{orphanedAnnotations.map((annotation) => (
								<div
									key={annotation.id}
									className='flex items-center gap-3 rounded-lg border bg-card px-3 py-2'
								>
									<span className='reading-text truncate font-semibold'>
										“{annotation.selectedText}”
									</span>
									<Badge variant='secondary'>
										{getPartOfSpeechLabel(annotation.partOfSpeech)}
									</Badge>
									<Button
										size='sm'
										variant='outline'
										className='ms-auto'
										disabled={!selection}
										onClick={() => onRelink(annotation)}
									>
										<RotateCcw />
										Relink here
									</Button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</section>
	)
}

interface AnnotationCardProps {
	annotation: Annotation
	lemma?: Lemma
	onEdit: () => void
	onFocus: () => void
	onDelete: () => Promise<void>
}

function AnnotationCard({
	annotation,
	lemma,
	onEdit,
	onFocus,
	onDelete,
}: AnnotationCardProps) {
	const morphology = formatMorphology(annotation.morphology)

	return (
		<article className='rounded-xl border bg-card p-4 shadow-xs'>
			<div className='flex items-start gap-3'>
				<Button
					variant='ghost'
					className='h-auto min-w-0 justify-start px-0 hover:bg-transparent'
					onClick={onFocus}
				>
					<span className='reading-text truncate text-lg font-semibold'>
						{annotation.selectedText}
					</span>
				</Button>
				<Badge variant='secondary' className='ms-auto'>
					{getPartOfSpeechLabel(annotation.partOfSpeech)}
				</Badge>
			</div>
			{lemma && (
				<div className='mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm'>
					<BookMarked className='size-3.5 text-primary' />
					<strong className='reading-text'>{lemma.headword}</strong>
					{lemma.gloss && (
						<span className='text-muted-foreground'>— {lemma.gloss}</span>
					)}
					{lemma.details && (
						<span className='w-full ps-5 text-xs text-muted-foreground'>
							{lemma.details}
						</span>
					)}
				</div>
			)}
			{morphology && (
				<p className='mt-2 text-xs leading-5 text-muted-foreground'>
					{morphology}
				</p>
			)}
			{annotation.comment && (
				<p
					className={cn(
						'reading-text mt-3 border-s-2 border-brass/55',
						'ps-3 text-sm leading-6',
					)}
				>
					{annotation.comment}
				</p>
			)}
			<div className='mt-3 flex items-center gap-2 border-t pt-3'>
				<span className='text-xs text-muted-foreground'>
					Line {annotation.lineNumber}
				</span>
				<Button size='sm' variant='ghost' className='ms-auto' onClick={onEdit}>
					<PenLine />
					Edit
				</Button>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							size='icon-sm'
							variant='ghost'
							className='text-muted-foreground hover:text-destructive'
							aria-label='Delete annotation'
						>
							<Trash2 />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete this note?</AlertDialogTitle>
							<AlertDialogDescription>
								Its grammar and comment will be permanently removed.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								variant='destructive'
								onClick={() => void onDelete()}
							>
								Delete note
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</article>
	)
}
