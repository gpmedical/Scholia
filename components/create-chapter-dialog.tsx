'use client'

import { FilePlus2, FileText, LoaderCircle, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type {
	ActionResult,
	ChapterSummary,
	CreateChapterInput,
} from '@/lib/domain'

const MAX_IMPORT_BYTES = 2 * 1024 * 1024

interface CreateChapterDialogProps {
	projectId: string
	createChapter: (
		input: CreateChapterInput,
	) => Promise<ActionResult<ChapterSummary>>
	variant?: 'default' | 'outline'
}

export function CreateChapterDialog({
	projectId,
	createChapter,
	variant = 'default',
}: CreateChapterDialogProps) {
	const router = useRouter()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [isOpen, setIsOpen] = useState(false)
	const [isPending, startTransition] = useTransition()
	const [title, setTitle] = useState('')
	const [originalText, setOriginalText] = useState('')
	const [fileName, setFileName] = useState('')
	const [error, setError] = useState('')

	async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		setError('')

		if (!file) {
			return
		}

		const isTextFile =
			file.type === 'text/plain' ||
			file.name.toLocaleLowerCase().endsWith('.txt')

		if (!isTextFile) {
			setError('Choose a plain-text .txt file.')
			event.target.value = ''
			return
		}

		if (file.size > MAX_IMPORT_BYTES) {
			setError('Text files must be 2 MB or smaller.')
			event.target.value = ''
			return
		}

		try {
			const text = await file.text()
			const baseName = file.name.replace(/\.txt$/iu, '')

			setOriginalText(text.replace(/^\uFEFF/u, ''))
			setFileName(file.name)

			if (!title) {
				setTitle(baseName)
			}
		} catch (err) {
			console.error(err)
			setError('The file could not be read as UTF-8 text.')
		}
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError('')

		startTransition(async () => {
			const result = await createChapter({
				projectId,
				title,
				originalText,
			})

			if (!result.success) {
				setError(result.error)
				return
			}

			setIsOpen(false)
			router.push(`/projects/${projectId}/chapters/${result.data.id}`)
		})
	}

	function handleOpenChange(nextIsOpen: boolean) {
		setIsOpen(nextIsOpen)

		if (!nextIsOpen) {
			setError('')
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant={variant}>
					<FilePlus2 />
					New chapter
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-lg'>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Add a chapter</DialogTitle>
						<DialogDescription>
							Start blank or import a UTF-8 text file. The source stays fully
							editable after import.
						</DialogDescription>
					</DialogHeader>
					<div className='grid gap-5 py-6'>
						<div className='grid gap-2'>
							<Label htmlFor='chapter-title'>Chapter title</Label>
							<Input
								id='chapter-title'
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder='e.g. Book I or Chapter 3'
								maxLength={120}
								autoFocus
								required
							/>
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='chapter-file'>Original text</Label>
							<input
								ref={fileInputRef}
								id='chapter-file'
								type='file'
								accept='.txt,text/plain'
								onChange={handleFileChange}
								className='sr-only'
							/>
							<Button
								type='button'
								variant='outline'
								className='h-auto min-h-24 w-full border-dashed'
								onClick={() => fileInputRef.current?.click()}
							>
								<span className='flex flex-col items-center gap-2 py-2'>
									{fileName ? (
										<FileText className='size-6 text-primary' />
									) : (
										<Upload className='size-6 text-muted-foreground' />
									)}
									<span>{fileName || 'Choose a .txt file'}</span>
									<span className='text-xs font-normal text-muted-foreground'>
										UTF-8 plain text · up to 2 MB
									</span>
								</span>
							</Button>
							{originalText && (
								<div className='rounded-lg border bg-muted/45 p-3'>
									<p className='mb-1 text-xs font-medium text-muted-foreground'>
										Import preview
									</p>
									<p className='reading-text line-clamp-3 text-sm leading-6'>
										{originalText}
									</p>
								</div>
							)}
						</div>
						{error && (
							<p role='alert' className='text-sm text-destructive'>
								{error}
							</p>
						)}
					</div>
					<DialogFooter className='-mx-4 -mb-4'>
						<Button
							type='button'
							variant='outline'
							onClick={() => setIsOpen(false)}
						>
							Cancel
						</Button>
						<Button type='submit' disabled={isPending}>
							{isPending ? (
								<LoaderCircle className='animate-spin' />
							) : (
								<FilePlus2 />
							)}
							Create chapter
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
