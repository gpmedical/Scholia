'use client'

import { LoaderCircle, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

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
import { Button } from '@/components/ui/button'
import type { ActionResult } from '@/lib/domain'

interface DeleteProjectButtonProps {
	projectId: string
	projectName: string
	deleteProject: (projectId: string) => Promise<ActionResult<null>>
}

export function DeleteProjectButton({
	projectId,
	projectName,
	deleteProject,
}: DeleteProjectButtonProps) {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)
	const [isPending, startTransition] = useTransition()

	function handleDelete() {
		startTransition(async () => {
			const result = await deleteProject(projectId)

			if (!result.success) {
				toast.error(result.error)
				return
			}

			setIsOpen(false)
			toast.success('Project deleted')
			router.push('/dashboard')
		})
	}

	return (
		<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
			<AlertDialogTrigger asChild>
				<Button variant='ghost' className='text-destructive'>
					<Trash2 />
					Delete project
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete “{projectName}”?</AlertDialogTitle>
					<AlertDialogDescription>
						Every chapter, translation, lemma, and annotation in this project
						will be permanently removed.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Keep project</AlertDialogCancel>
					<AlertDialogAction
						variant='destructive'
						onClick={handleDelete}
						disabled={isPending}
					>
						{isPending && <LoaderCircle className='animate-spin' />}
						Delete permanently
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
