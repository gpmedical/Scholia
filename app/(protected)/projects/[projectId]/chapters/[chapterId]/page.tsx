import { notFound } from 'next/navigation'

import {
	createChapterAction,
	deleteAnnotationAction,
	renameChapterAction,
	renameProjectAction,
	saveChapterContentAction,
	upsertAnnotationAction,
} from '@/app/actions'
import { ChapterWorkspace } from '@/components/chapter-workspace'
import { requireUserId } from '@/lib/auth'
import { getChapterWorkspace } from '@/lib/data-access'

interface ChapterPageProps {
	params: Promise<{
		projectId: string
		chapterId: string
	}>
	searchParams: Promise<{
		annotation?: string
	}>
}

export default async function ChapterPage({
	params,
	searchParams,
}: ChapterPageProps) {
	const { projectId, chapterId } = await params
	const { annotation } = await searchParams
	const userId = await requireUserId()
	const data = await getChapterWorkspace(userId, projectId, chapterId)

	if (!data) {
		notFound()
	}

	return (
		<main className='lg:h-[calc(100dvh-4rem)] lg:overflow-hidden'>
			<ChapterWorkspace
				initialData={data}
				initialAnnotationId={annotation}
				saveChapterContent={saveChapterContentAction}
				upsertAnnotation={upsertAnnotationAction}
				deleteAnnotation={deleteAnnotationAction}
				createChapter={createChapterAction}
				renameProject={renameProjectAction}
				renameChapter={renameChapterAction}
			/>
		</main>
	)
}
