import {
	ArrowLeft,
	BookOpenText,
	FileText,
	LibraryBig,
	MessageSquareText,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
	createChapterAction,
	deleteChapterAction,
	deleteProjectAction,
	renameChapterAction,
	renameProjectAction,
} from '@/app/actions'
import { CreateChapterDialog } from '@/components/create-chapter-dialog'
import { DeleteChapterButton } from '@/components/delete-chapter-button'
import { DeleteProjectButton } from '@/components/delete-project-button'
import { RenameDialog } from '@/components/rename-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { requireUserId } from '@/lib/auth'
import { getProjectForUser } from '@/lib/data-access'
import { getLanguageLabel } from '@/lib/domain'

interface ProjectPageProps {
	params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
	const { projectId } = await params
	const userId = await requireUserId()
	const project = getProjectForUser(userId, projectId)

	if (!project) {
		notFound()
	}

	return (
		<main className='mx-auto w-full max-w-6xl px-4 py-9 sm:px-6 sm:py-12'>
			<Button asChild variant='ghost' className='mb-6 -ms-2'>
				<Link href='/dashboard'>
					<ArrowLeft />
					All projects
				</Link>
			</Button>

			<div className='flex flex-col gap-6 md:flex-row md:items-start'>
				<div className='min-w-0 flex-1'>
					<Badge variant='secondary'>
						{getLanguageLabel(project.language)}
					</Badge>
					<h1 className='mt-3 text-3xl font-semibold tracking-tight sm:text-4xl'>
						{project.name}
					</h1>
					<p className='mt-3 max-w-2xl leading-7 text-muted-foreground'>
						{project.description || 'Add chapters and begin your translation.'}
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<RenameDialog
						kind='project'
						id={project.id}
						currentName={project.name}
						rename={renameProjectAction}
					/>
					<Button asChild variant='outline'>
						<Link href={`/projects/${project.id}/lexicon`}>
							<LibraryBig />
							Lemma index
						</Link>
					</Button>
					<CreateChapterDialog
						projectId={project.id}
						createChapter={createChapterAction}
					/>
				</div>
			</div>

			<div className='mt-8 grid gap-3 sm:grid-cols-3'>
				<StatCard
					icon={FileText}
					label='Chapters'
					value={project.chapterCount}
				/>
				<StatCard
					icon={MessageSquareText}
					label='Annotations'
					value={project.annotationCount}
				/>
				<StatCard
					icon={LibraryBig}
					label='Base forms'
					value={project.lemmaCount}
				/>
			</div>

			<div className='folio-rule my-8 opacity-60' />

			<div className='flex items-center justify-between gap-4'>
				<div>
					<h2 className='text-xl font-semibold'>Chapters</h2>
					<p className='mt-1 text-sm text-muted-foreground'>
						Open a chapter to read, translate, and annotate it.
					</p>
				</div>
			</div>

			<div className='mt-5 grid gap-3'>
				{project.chapters.map((chapter) => (
					<Card
						key={chapter.id}
						className='group bg-card/90 transition hover:border-primary/25'
					>
						<CardContent className='flex items-center gap-4 py-4'>
							<Link
								href={`/projects/${project.id}/chapters/${chapter.id}`}
								className={
									'flex min-w-0 flex-1 items-center gap-4 ' +
									'rounded-lg focus-visible:ring-3 ' +
									'focus-visible:ring-ring/40 ' +
									'focus-visible:outline-none'
								}
							>
								<span
									className={
										'grid size-10 shrink-0 place-items-center ' +
										'rounded-lg bg-primary/9 text-primary'
									}
								>
									<BookOpenText />
								</span>
								<span className='min-w-0'>
									<span className='block truncate font-medium'>
										{chapter.title}
									</span>
									<span className='mt-1 block text-xs text-muted-foreground'>
										{chapter.annotationCount} annotations
									</span>
								</span>
							</Link>
							<RenameDialog
								kind='chapter'
								id={chapter.id}
								currentName={chapter.title}
								rename={renameChapterAction}
								trigger='icon'
							/>
							<DeleteChapterButton
								chapterId={chapter.id}
								projectId={project.id}
								chapterTitle={chapter.title}
								deleteChapter={deleteChapterAction}
							/>
						</CardContent>
					</Card>
				))}
			</div>

			<Card className='mt-10 border-destructive/15 bg-card/65'>
				<CardHeader>
					<CardTitle className='text-base'>Project settings</CardTitle>
					<CardDescription>
						Deleting a project cannot be undone.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DeleteProjectButton
						projectId={project.id}
						projectName={project.name}
						deleteProject={deleteProjectAction}
					/>
				</CardContent>
			</Card>
		</main>
	)
}

interface StatCardProps {
	icon: React.ComponentType<{ className?: string }>
	label: string
	value: number
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
	return (
		<Card className='bg-card/75'>
			<CardContent className='flex items-center gap-3 py-4'>
				<Icon className='size-4 text-primary' />
				<span className='text-sm text-muted-foreground'>{label}</span>
				<strong className='ms-auto text-lg'>{value}</strong>
			</CardContent>
		</Card>
	)
}
