'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireUserId } from '@/lib/auth'
import {
	createChapter,
	createProject,
	deleteAnnotation,
	deleteChapter,
	deleteProject,
	renameChapter,
	renameProject,
	saveChapterContent,
	updateLemma,
	upsertAnnotation,
} from '@/lib/data-access'
import {
	LANGUAGES,
	PARTS_OF_SPEECH,
	type ActionResult,
	type Annotation,
	type ChapterSummary,
	type CreateChapterInput,
	type CreateProjectInput,
	type CreateProjectResult,
	type Lemma,
	type RenameChapterInput,
	type RenameProjectInput,
	type SaveChapterContentInput,
	type UpdateLemmaInput,
	type UpsertAnnotationInput,
} from '@/lib/domain'

const identifierSchema = z.string().uuid()

const createProjectSchema = z.object({
	name: z.string().trim().min(1).max(100),
	description: z.string().trim().max(500),
	language: z.enum(LANGUAGES),
})

const createChapterSchema = z.object({
	projectId: identifierSchema,
	title: z.string().trim().min(1).max(120),
	originalText: z.string().max(1_000_000),
})

const renameProjectSchema = z.object({
	projectId: identifierSchema,
	name: z.string().trim().min(1).max(100),
})

const renameChapterSchema = z.object({
	chapterId: identifierSchema,
	title: z.string().trim().min(1).max(120),
})

const saveChapterContentSchema = z.object({
	chapterId: identifierSchema,
	originalText: z.string().max(1_000_000),
	translationText: z.string().max(1_000_000),
})

const updateLemmaSchema = z.object({
	lemmaId: identifierSchema,
	headword: z.string().trim().min(1).max(120),
	gloss: z.string().trim().max(240),
	partOfSpeech: z.enum(PARTS_OF_SPEECH),
	details: z.string().trim().max(300),
})

const lemmaChoiceSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('existing'),
		lemmaId: identifierSchema,
	}),
	z.object({
		type: z.literal('new'),
		headword: z.string().trim().min(1).max(120),
		gloss: z.string().trim().max(240),
		details: z.string().trim().max(300),
	}),
])

const upsertAnnotationSchema = z
	.object({
		annotationId: identifierSchema.optional(),
		chapterId: identifierSchema,
		startOffset: z.number().int().min(0),
		endOffset: z.number().int().positive(),
		selectedText: z.string().min(1).max(10_000),
		partOfSpeech: z.enum(PARTS_OF_SPEECH),
		morphology: z
			.record(z.string().max(50), z.string().max(100))
			.refine((value) => Object.keys(value).length <= 50, {
				message: 'Too many morphology fields.',
			}),
		comment: z.string().trim().max(10_000),
		lemma: lemmaChoiceSchema.nullable(),
	})
	.refine((input) => input.endOffset > input.startOffset, {
		message: 'The annotation range is invalid',
	})

const SAFE_ACTION_ERRORS = new Set([
	'Annotation not found',
	'A base form with this headword already exists',
	'Base form not found',
	'Chapter not found',
	'Project not found',
	'The source text changed. Select the passage again.',
])

function getActionError(err: unknown): string {
	console.error('Server action failed', {
		type: err instanceof Error ? err.name : typeof err,
	})

	if (err instanceof z.ZodError) {
		return err.issues[0]?.message ?? 'Check the submitted fields.'
	}

	if (err instanceof Error && SAFE_ACTION_ERRORS.has(err.message)) {
		return err.message
	}

	return 'Something went wrong. Please try again.'
}

export async function createProjectAction(
	input: CreateProjectInput,
): Promise<ActionResult<CreateProjectResult>> {
	try {
		const userId = await requireUserId()
		const validatedInput = createProjectSchema.parse(input)
		const project = await createProject(userId, validatedInput)

		revalidatePath('/dashboard')

		return { success: true, data: project }
	} catch (err) {
		return { success: false, error: getActionError(err) }
	}
}

export async function deleteProjectAction(
	projectId: string,
): Promise<ActionResult<null>> {
	try {
		const userId = await requireUserId()
		const validatedProjectId = identifierSchema.parse(projectId)
		const isDeleted = await deleteProject(userId, validatedProjectId)

		if (!isDeleted) {
			throw new Error('Project not found')
		}

		revalidatePath('/dashboard')

		return { success: true, data: null }
	} catch (err) {
		return { success: false, error: getActionError(err) }
	}
}

export async function renameProjectAction(
	input: RenameProjectInput,
): Promise<ActionResult<null>> {
	try {
		const userId = await requireUserId()
		const validatedInput = renameProjectSchema.parse(input)
		const isRenamed = await renameProject(userId, validatedInput)

		if (!isRenamed) {
			throw new Error('Project not found')
		}

		revalidatePath('/dashboard')
		revalidatePath(`/projects/${validatedInput.projectId}`)

		return { success: true, data: null }
	} catch (err) {
		return { success: false, error: getActionError(err) }
	}
}

export async function createChapterAction(
	input: CreateChapterInput,
): Promise<ActionResult<ChapterSummary>> {
	try {
		const userId = await requireUserId()
		const validatedInput = createChapterSchema.parse(input)
		const chapter = await createChapter(userId, validatedInput)

		revalidatePath(`/projects/${validatedInput.projectId}`)

		return { success: true, data: chapter }
	} catch (err) {
		return { success: false, error: getActionError(err) }
	}
}

export async function deleteChapterAction(
	chapterId: string,
	projectId: string,
): Promise<ActionResult<null>> {
	try {
		const userId = await requireUserId()
		const validatedChapterId = identifierSchema.parse(chapterId)
		const validatedProjectId = identifierSchema.parse(projectId)
		const isDeleted = await deleteChapter(userId, validatedChapterId)

		if (!isDeleted) {
			throw new Error('Chapter not found')
		}

		revalidatePath(`/projects/${validatedProjectId}`)

		return { success: true, data: null }
	} catch (err) {
		return { success: false, error: getActionError(err) }
	}
}

export async function renameChapterAction(
	input: RenameChapterInput,
): Promise<ActionResult<null>> {
	try {
		const userId = await requireUserId()
		const validatedInput = renameChapterSchema.parse(input)
		const projectId = await renameChapter(userId, validatedInput)

		if (!projectId) {
			throw new Error('Chapter not found')
		}

		revalidatePath(`/projects/${projectId}`)
		revalidatePath(
			`/projects/${projectId}/chapters/${validatedInput.chapterId}`,
		)

		return { success: true, data: null }
	} catch (err) {
		return { success: false, error: getActionError(err) }
	}
}

export async function saveChapterContentAction(
	input: SaveChapterContentInput,
): Promise<ActionResult<Annotation[]>> {
	try {
		const userId = await requireUserId()
		const validatedInput = saveChapterContentSchema.parse(input)
		const annotations = await saveChapterContent(userId, validatedInput)

		return { success: true, data: annotations }
	} catch (err) {
		return { success: false, error: getActionError(err) }
	}
}

export async function updateLemmaAction(
	input: UpdateLemmaInput,
): Promise<ActionResult<null>> {
	try {
		const userId = await requireUserId()
		const validatedInput = updateLemmaSchema.parse(input)
		const projectId = await updateLemma(userId, validatedInput)

		if (!projectId) {
			throw new Error('Base form not found')
		}

		revalidatePath('/dashboard')
		revalidatePath(`/projects/${projectId}/lexicon`)

		return { success: true, data: null }
	} catch (err) {
		return { success: false, error: getActionError(err) }
	}
}

export async function upsertAnnotationAction(
	input: UpsertAnnotationInput,
): Promise<
	ActionResult<{
		annotation: Annotation
		lemmas: Lemma[]
	}>
> {
	try {
		const userId = await requireUserId()
		const validatedInput = upsertAnnotationSchema.parse(input)
		const result = await upsertAnnotation(userId, validatedInput)

		return { success: true, data: result }
	} catch (err) {
		return { success: false, error: getActionError(err) }
	}
}

export async function deleteAnnotationAction(
	annotationId: string,
	projectId: string,
): Promise<ActionResult<null>> {
	try {
		const userId = await requireUserId()
		const validatedAnnotationId = identifierSchema.parse(annotationId)
		const validatedProjectId = identifierSchema.parse(projectId)
		const isDeleted = await deleteAnnotation(userId, validatedAnnotationId)

		if (!isDeleted) {
			throw new Error('Annotation not found')
		}

		revalidatePath(`/projects/${validatedProjectId}/lexicon`)

		return { success: true, data: null }
	} catch (err) {
		return { success: false, error: getActionError(err) }
	}
}
