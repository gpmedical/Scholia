import 'server-only'

import type {
	Annotation,
	ChapterSummary,
	ChapterWorkspaceData,
	CreateChapterInput,
	CreateProjectInput,
	CreateProjectResult,
	Lemma,
	ProjectDetail,
	ProjectLexiconData,
	ProjectSummary,
	RenameChapterInput,
	RenameProjectInput,
	SaveChapterContentInput,
	UpsertAnnotationInput,
} from '@/lib/domain'

type Awaitable<T> = T | Promise<T>

type AsyncCapable<T> = {
	[Key in keyof T]: T[Key] extends (...args: infer Args) => infer Result
		? (...args: Args) => Awaitable<Result>
		: T[Key]
}

type DataAccessAdapter = AsyncCapable<
	typeof import('@/lib/data-access-sqlite')
>

let adapterPromise: Promise<DataAccessAdapter> | undefined

function isNetlifyRuntime(): boolean {
	return Boolean(process.env.NETLIFY_DB_URL || process.env.SITE_ID)
}

function getAdapter(): Promise<DataAccessAdapter> {
	if (!adapterPromise) {
		adapterPromise = isNetlifyRuntime()
			? import('@/lib/data-access-postgres')
			: import('@/lib/data-access-sqlite')
	}

	return adapterPromise
}

export async function getProjectsForUser(
	userId: string,
): Promise<ProjectSummary[]> {
	return (await getAdapter()).getProjectsForUser(userId)
}

export async function createProject(
	userId: string,
	input: CreateProjectInput,
): Promise<CreateProjectResult> {
	return (await getAdapter()).createProject(userId, input)
}

export async function getProjectForUser(
	userId: string,
	projectId: string,
): Promise<ProjectDetail | null> {
	return (await getAdapter()).getProjectForUser(userId, projectId)
}

export async function deleteProject(
	userId: string,
	projectId: string,
): Promise<boolean> {
	return (await getAdapter()).deleteProject(userId, projectId)
}

export async function renameProject(
	userId: string,
	input: RenameProjectInput,
): Promise<boolean> {
	return (await getAdapter()).renameProject(userId, input)
}

export async function createChapter(
	userId: string,
	input: CreateChapterInput,
): Promise<ChapterSummary> {
	return (await getAdapter()).createChapter(userId, input)
}

export async function deleteChapter(
	userId: string,
	chapterId: string,
): Promise<boolean> {
	return (await getAdapter()).deleteChapter(userId, chapterId)
}

export async function renameChapter(
	userId: string,
	input: RenameChapterInput,
): Promise<string | null> {
	return (await getAdapter()).renameChapter(userId, input)
}

export async function getChapterWorkspace(
	userId: string,
	projectId: string,
	chapterId: string,
): Promise<ChapterWorkspaceData | null> {
	return (await getAdapter()).getChapterWorkspace(
		userId,
		projectId,
		chapterId,
	)
}

export async function saveChapterContent(
	userId: string,
	input: SaveChapterContentInput,
): Promise<Annotation[]> {
	return (await getAdapter()).saveChapterContent(userId, input)
}

export async function upsertAnnotation(
	userId: string,
	input: UpsertAnnotationInput,
): Promise<{ annotation: Annotation; lemmas: Lemma[] }> {
	return (await getAdapter()).upsertAnnotation(userId, input)
}

export async function deleteAnnotation(
	userId: string,
	annotationId: string,
): Promise<boolean> {
	return (await getAdapter()).deleteAnnotation(userId, annotationId)
}

export async function getProjectLexicon(
	userId: string,
	projectId: string,
): Promise<ProjectLexiconData | null> {
	return (await getAdapter()).getProjectLexicon(userId, projectId)
}
