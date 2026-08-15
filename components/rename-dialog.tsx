'use client'

import { LoaderCircle, PencilLine } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

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
	RenameChapterInput,
	RenameProjectInput,
} from '@/lib/domain'

type RenameDialogProps =
	| {
			kind: 'project'
			id: string
			currentName: string
			rename: (
				input: RenameProjectInput,
			) => Promise<ActionResult<null>>
			trigger?: 'button' | 'icon'
	  }
	| {
			kind: 'chapter'
			id: string
			currentName: string
			rename: (
				input: RenameChapterInput,
			) => Promise<ActionResult<null>>
			trigger?: 'button' | 'icon'
	  }

export function RenameDialog(props: RenameDialogProps) {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)
	const [isPending, startTransition] = useTransition()
	const [name, setName] = useState(props.currentName)
	const [error, setError] = useState('')
	const entityLabel = props.kind === 'project' ? 'project' : 'chapter'
	const maxLength = props.kind === 'project' ? 100 : 120
	const isUnchanged = name.trim() === props.currentName

	function handleOpenChange(nextIsOpen: boolean) {
		setIsOpen(nextIsOpen)
		setError('')

		if (nextIsOpen) {
			setName(props.currentName)
		}
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError('')

		startTransition(async () => {
			const result =
				props.kind === 'project'
					? await props.rename({
							projectId: props.id,
							name,
						})
					: await props.rename({
							chapterId: props.id,
							title: name,
						})

			if (!result.success) {
				setError(result.error)
				return
			}

			setIsOpen(false)
			toast.success(
				props.kind === 'project'
					? 'Project renamed'
					: 'Chapter renamed',
			)
			router.refresh()
		})
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				{props.trigger === 'icon' ? (
					<Button
						variant='ghost'
						size='icon-sm'
						aria-label={`Rename ${entityLabel}`}
						className='shrink-0 text-muted-foreground'
					>
						<PencilLine />
					</Button>
				) : (
					<Button variant='outline'>
						<PencilLine />
						Rename {entityLabel}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className='sm:max-w-md'>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Rename {entityLabel}</DialogTitle>
						<DialogDescription>
							The new name will appear everywhere in this project.
						</DialogDescription>
					</DialogHeader>
					<div className='grid gap-2 py-6'>
						<Label htmlFor={`rename-${props.kind}`}>
							{props.kind === 'project'
								? 'Project name'
								: 'Chapter name'}
						</Label>
						<Input
							id={`rename-${props.kind}`}
							value={name}
							onChange={(event) => setName(event.target.value)}
							maxLength={maxLength}
							autoFocus
							required
						/>
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
						<Button
							type='submit'
							disabled={isPending || isUnchanged}
						>
							{isPending ? (
								<LoaderCircle className='animate-spin' />
							) : (
								<PencilLine />
							)}
							Save name
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
