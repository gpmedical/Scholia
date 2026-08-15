import { BookOpen, Clock3, FileText, LibraryBig } from 'lucide-react'
import Link from 'next/link'

import { createProjectAction } from '@/app/actions'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { requireUserId } from '@/lib/auth'
import { getProjectsForUser } from '@/lib/data-access'
import { getLanguageLabel } from '@/lib/domain'

export const metadata = {
	title: 'Projects',
}

const dateFormatter = new Intl.DateTimeFormat('en', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
})

export default async function DashboardPage() {
	const userId = await requireUserId()
	const projects = getProjectsForUser(userId)

	return (
		<main className='mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14'>
			<div className='flex flex-col gap-6 sm:flex-row sm:items-end'>
				<div>
					<p
						className={
							'text-xs font-semibold tracking-[0.2em] ' +
							'text-primary uppercase'
						}
					>
						Your library
					</p>
					<h1 className='mt-2 text-3xl font-semibold tracking-tight sm:text-4xl'>
						Projects
					</h1>
					<p className='mt-2 max-w-xl text-muted-foreground'>
						Return to a text or begin a new work of translation and
						commentary.
					</p>
				</div>
				<div className='sm:ms-auto'>
					<CreateProjectDialog createProject={createProjectAction} />
				</div>
			</div>

			<div className='folio-rule my-8 opacity-60' />

			{projects.length === 0 ? (
				<Card className='border-dashed bg-card/75 py-8'>
					<CardContent className='flex flex-col items-center text-center'>
						<span
							className={
								'grid size-14 place-items-center rounded-xl ' +
								'bg-primary/10 text-primary'
							}
						>
							<LibraryBig className='size-7' />
						</span>
						<h2 className='mt-5 text-xl font-semibold'>
							Your library is ready
						</h2>
						<p className='mt-2 max-w-md text-sm leading-6 text-muted-foreground'>
							Create a Latin or Ancient Greek project. Scholia will open a first
							blank chapter for you.
						</p>
						<div className='mt-6'>
							<CreateProjectDialog createProject={createProjectAction} />
						</div>
					</CardContent>
				</Card>
			) : (
				<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
					{projects.map((project) => (
						<Link
							key={project.id}
							href={`/projects/${project.id}`}
							className={
								'group rounded-xl focus-visible:ring-3 ' +
								'focus-visible:ring-ring/40 focus-visible:outline-none'
							}
						>
							<Card
								className={
									'h-full bg-card/90 transition ' +
									'group-hover:-translate-y-0.5 ' +
									'group-hover:border-primary/25 ' +
									'group-hover:shadow-lg'
								}
							>
								<CardHeader>
									<div className='flex items-start gap-4'>
										<span
											className={
												'grid size-11 shrink-0 place-items-center ' +
												'rounded-lg bg-primary/10 text-primary'
											}
										>
											<BookOpen />
										</span>
										<div className='min-w-0'>
											<Badge variant='secondary'>
												{getLanguageLabel(project.language)}
											</Badge>
											<CardTitle className='mt-3 line-clamp-2 text-xl'>
												{project.name}
											</CardTitle>
										</div>
									</div>
								<CardDescription
									className='mt-3 line-clamp-2 min-h-10 leading-5'
								>
										{project.description || 'No description yet.'}
									</CardDescription>
								</CardHeader>
								<CardContent
									className={
										'mt-auto flex items-center gap-4 border-t ' +
										'pt-4 text-xs text-muted-foreground'
									}
								>
									<span className='inline-flex items-center gap-1.5'>
										<FileText className='size-3.5' />
										{project.chapterCount} chapters
									</span>
									<span className='inline-flex items-center gap-1.5'>
										<Clock3 className='size-3.5' />
										{dateFormatter.format(new Date(project.updatedAt))}
									</span>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</main>
	)
}
