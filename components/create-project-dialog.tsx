'use client'

import { BookPlus, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
	ActionResult,
	CreateProjectInput,
	CreateProjectResult,
	Language,
} from '@/lib/domain'

interface CreateProjectDialogProps {
	createProject: (
		input: CreateProjectInput,
	) => Promise<ActionResult<CreateProjectResult>>
}

export function CreateProjectDialog({
	createProject,
}: CreateProjectDialogProps) {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)
	const [isPending, startTransition] = useTransition()
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [language, setLanguage] = useState<Language>('LATIN')
	const [error, setError] = useState('')

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError('')

		startTransition(async () => {
			const result = await createProject({
				name,
				description,
				language,
			})

			if (!result.success) {
				setError(result.error)
				return
			}

			setIsOpen(false)
			router.push(
				`/projects/${result.data.projectId}/chapters/` + result.data.chapterId,
			)
		})
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button size='lg' className='h-10'>
					<BookPlus />
					New project
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-md'>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Begin a new text</DialogTitle>
						<DialogDescription>
							Choose the language now. You can add or import chapters once the
							project opens.
						</DialogDescription>
					</DialogHeader>
					<div className='grid gap-5 py-6'>
						<div className='grid gap-2'>
							<Label htmlFor='project-name'>Project title</Label>
							<Input
								id='project-name'
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder='e.g. Virgil, Aeneid'
								maxLength={100}
								autoFocus
								required
							/>
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='project-language'>Language</Label>
							<Select
								value={language}
								onValueChange={(value) => {
									setLanguage(value as Language)
								}}
							>
								<SelectTrigger id='project-language' className='w-full'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='LATIN'>Latin</SelectItem>
									<SelectItem value='GREEK'>Ancient Greek</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='project-description'>
								Description
								<span className='font-normal text-muted-foreground'>
									optional
								</span>
							</Label>
							<Textarea
								id='project-description'
								value={description}
								onChange={(event) => {
									setDescription(event.target.value)
								}}
								placeholder='Edition, course, or research context'
								maxLength={500}
								rows={3}
							/>
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
								<BookPlus />
							)}
							Create project
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
