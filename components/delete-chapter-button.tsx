'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
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

interface DeleteChapterButtonProps {
	chapterId: string
	projectId: string
	chapterTitle: string
	deleteChapter: (
		chapterId: string,
		projectId: string,
	) => Promise<ActionResult<null>>
}

export function DeleteChapterButton({
	chapterId,
	projectId,
	chapterTitle,
	deleteChapter,
}: DeleteChapterButtonProps) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	function handleDelete() {
		startTransition(async () => {
			const result = await deleteChapter(chapterId, projectId)

			if (!result.success) {
				toast.error(result.error)
				return
			}

			toast.success('Chapter deleted')
			router.refresh()
		})
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant='ghost'
					size='icon-sm'
					aria-label={`Delete ${chapterTitle}`}
					className='text-muted-foreground hover:text-destructive'
				>
					<Trash2 />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete “{chapterTitle}”?</AlertDialogTitle>
					<AlertDialogDescription>
						Its source, translation, and annotations will be permanently
						removed.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant='destructive'
						onClick={handleDelete}
						disabled={isPending}
					>
						Delete chapter
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
