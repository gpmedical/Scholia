import 'server-only'

import { randomUUID } from 'node:crypto'

import { database } from '@/lib/database'
import type {
	Annotation,
	ChapterSummary,
	ChapterWorkspaceData,
	CreateChapterInput,
	CreateProjectInput,
	CreateProjectResult,
	Language,
	Lemma,
	LemmaWithOccurrences,
	PartOfSpeech,
	ProjectDetail,
	ProjectLexiconData,
	ProjectSummary,
	RenameChapterInput,
	RenameProjectInput,
	SaveChapterContentInput,
	UpsertAnnotationInput,
} from '@/lib/domain'
import { getLineNumber, reanchorTextRange } from '@/lib/text-selection'

interface ProjectRow {
	id: string
	name: string
	description: string
	language: Language
	chapter_count: number
	annotation_count: number
	lemma_count?: number
	updated_at: string
}

interface ChapterRow {
	id: string
	project_id?: string
	title: string
	position: number
	original_text?: string
	translation_text?: string
	annotation_count: number
	updated_at: string
}

interface LemmaRow {
	id: string
	project_id: string
	headword: string
	gloss: string
	part_of_speech: PartOfSpeech
	details: string
}

interface AnnotationRow {
	id: string
	chapter_id: string
	lemma_id: string | null
	start_offset: number
	end_offset: number
	selected_text: string
	line_number: number | null
	part_of_speech: PartOfSpeech
	morphology_json: string
	comment: string
	is_orphaned: number
	created_at: string
	updated_at: string
}

interface OccurrenceRow extends LemmaRow {
	annotation_id: string | null
	chapter_id: string | null
	chapter_title: string | null
	chapter_position: number | null
	selected_text: string | null
	line_number: number | null
	morphology_json: string | null
	comment: string | null
	is_orphaned: number | null
}

interface OwnedChapterRow {
	id: string
	project_id: string
	original_text: string
	translation_text: string
}

function mapProject(row: ProjectRow): ProjectSummary {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		language: row.language,
		chapterCount: row.chapter_count,
		annotationCount: row.annotation_count,
		updatedAt: row.updated_at,
	}
}

function mapChapter(row: ChapterRow): ChapterSummary {
	return {
		id: row.id,
		title: row.title,
		position: row.position,
		annotationCount: row.annotation_count,
		updatedAt: row.updated_at,
	}
}

function mapLemma(row: LemmaRow): Lemma {
	return {
		id: row.id,
		projectId: row.project_id,
		headword: row.headword,
		gloss: row.gloss,
		partOfSpeech: row.part_of_speech,
		details: row.details,
	}
}

function parseMorphology(value: string): Record<string, string> {
	try {
		const parsedValue: unknown = JSON.parse(value)

		if (
			parsedValue &&
			typeof parsedValue === 'object' &&
			!Array.isArray(parsedValue)
		) {
			return parsedValue as Record<string, string>
		}
	} catch (err) {
		console.error('Could not parse annotation morphology', err)
	}

	return {}
}

function mapAnnotation(row: AnnotationRow): Annotation {
	return {
		id: row.id,
		chapterId: row.chapter_id,
		lemmaId: row.lemma_id,
		startOffset: row.start_offset,
		endOffset: row.end_offset,
		selectedText: row.selected_text,
		lineNumber: row.line_number,
		partOfSpeech: row.part_of_speech,
		morphology: parseMorphology(row.morphology_json),
		comment: row.comment,
		isOrphaned: row.is_orphaned === 1,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function normalizeHeadword(headword: string): string {
	return headword.normalize('NFKC').trim().toLocaleLowerCase('und')
}

function getOwnedChapter(
	userId: string,
	chapterId: string,
): OwnedChapterRow | undefined {
	return database
		.prepare(
			`
			SELECT
				c.id,
				c.project_id,
				c.original_text,
				c.translation_text
			FROM chapters c
			JOIN projects p ON p.id = c.project_id
			WHERE c.id = ? AND p.user_id = ?
		`,
		)
		.get(chapterId, userId) as OwnedChapterRow | undefined
}

function touchProject(projectId: string, updatedAt: string): void {
	database
		.prepare('UPDATE projects SET updated_at = ? WHERE id = ?')
		.run(updatedAt, projectId)
}

export function getProjectsForUser(userId: string): ProjectSummary[] {
	const rows = database
		.prepare(
			`
			SELECT
				p.id,
				p.name,
				p.description,
				p.language,
				p.updated_at,
				COUNT(DISTINCT c.id) AS chapter_count,
				COUNT(DISTINCT a.id) AS annotation_count
			FROM projects p
			LEFT JOIN chapters c ON c.project_id = p.id
			LEFT JOIN annotations a ON a.chapter_id = c.id
			WHERE p.user_id = ?
			GROUP BY p.id
			ORDER BY p.updated_at DESC
		`,
		)
		.all(userId) as ProjectRow[]

	return rows.map(mapProject)
}

export function createProject(
	userId: string,
	input: CreateProjectInput,
): CreateProjectResult {
	const projectId = randomUUID()
	const chapterId = randomUUID()
	const timestamp = new Date().toISOString()

	database.transaction(() => {
		database
			.prepare(
				`
				INSERT INTO projects (
					id,
					user_id,
					name,
					description,
					language,
					created_at,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?)
			`,
			)
			.run(
				projectId,
				userId,
				input.name,
				input.description,
				input.language,
				timestamp,
				timestamp,
			)

		database
			.prepare(
				`
				INSERT INTO chapters (
					id,
					project_id,
					title,
					position,
					created_at,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?)
			`,
			)
			.run(chapterId, projectId, 'Chapter I', 1, timestamp, timestamp)
	})()

	return { projectId, chapterId }
}

export function getProjectForUser(
	userId: string,
	projectId: string,
): ProjectDetail | null {
	const project = database
		.prepare(
			`
			SELECT
				p.id,
				p.name,
				p.description,
				p.language,
				p.updated_at,
				COUNT(DISTINCT c.id) AS chapter_count,
				COUNT(DISTINCT a.id) AS annotation_count,
				COUNT(DISTINCT l.id) AS lemma_count
			FROM projects p
			LEFT JOIN chapters c ON c.project_id = p.id
			LEFT JOIN annotations a ON a.chapter_id = c.id
			LEFT JOIN lemmas l ON l.project_id = p.id
			WHERE p.id = ? AND p.user_id = ?
			GROUP BY p.id
		`,
		)
		.get(projectId, userId) as ProjectRow | undefined

	if (!project) {
		return null
	}

	const chapters = database
		.prepare(
			`
			SELECT
				c.id,
				c.title,
				c.position,
				c.updated_at,
				COUNT(a.id) AS annotation_count
			FROM chapters c
			LEFT JOIN annotations a ON a.chapter_id = c.id
			WHERE c.project_id = ?
			GROUP BY c.id
			ORDER BY c.position ASC
		`,
		)
		.all(projectId) as ChapterRow[]

	return {
		...mapProject(project),
		lemmaCount: project.lemma_count ?? 0,
		chapters: chapters.map(mapChapter),
	}
}

export function deleteProject(userId: string, projectId: string): boolean {
	const result = database
		.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')
		.run(projectId, userId)

	return result.changes === 1
}

export function renameProject(
	userId: string,
	input: RenameProjectInput,
): boolean {
	const timestamp = new Date().toISOString()
	const result = database
		.prepare(
			`
			UPDATE projects
			SET name = ?, updated_at = ?
			WHERE id = ? AND user_id = ?
		`,
		)
		.run(input.name, timestamp, input.projectId, userId)

	return result.changes === 1
}

export function createChapter(
	userId: string,
	input: CreateChapterInput,
): ChapterSummary {
	const project = database
		.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
		.get(input.projectId, userId) as { id: string } | undefined

	if (!project) {
		throw new Error('Project not found')
	}

	const nextPosition = database
		.prepare(
			`
			SELECT COALESCE(MAX(position), 0) + 1 AS position
			FROM chapters
			WHERE project_id = ?
		`,
		)
		.get(input.projectId) as { position: number }
	const chapterId = randomUUID()
	const timestamp = new Date().toISOString()

	database.transaction(() => {
		database
			.prepare(
				`
				INSERT INTO chapters (
					id,
					project_id,
					title,
					position,
					original_text,
					created_at,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?)
			`,
			)
			.run(
				chapterId,
				input.projectId,
				input.title,
				nextPosition.position,
				input.originalText,
				timestamp,
				timestamp,
			)
		touchProject(input.projectId, timestamp)
	})()

	return {
		id: chapterId,
		title: input.title,
		position: nextPosition.position,
		annotationCount: 0,
		updatedAt: timestamp,
	}
}

export function deleteChapter(userId: string, chapterId: string): boolean {
	const chapter = getOwnedChapter(userId, chapterId)

	if (!chapter) {
		return false
	}

	const timestamp = new Date().toISOString()

	database.transaction(() => {
		database.prepare('DELETE FROM chapters WHERE id = ?').run(chapterId)
		touchProject(chapter.project_id, timestamp)
	})()

	return true
}

export function renameChapter(
	userId: string,
	input: RenameChapterInput,
): string | null {
	const chapter = getOwnedChapter(userId, input.chapterId)

	if (!chapter) {
		return null
	}

	const timestamp = new Date().toISOString()

	database.transaction(() => {
		database
			.prepare(
				`
				UPDATE chapters
				SET title = ?, updated_at = ?
				WHERE id = ?
			`,
			)
			.run(input.title, timestamp, input.chapterId)
		touchProject(chapter.project_id, timestamp)
	})()

	return chapter.project_id
}

export function getChapterWorkspace(
	userId: string,
	projectId: string,
	chapterId: string,
): ChapterWorkspaceData | null {
	const project = getProjectForUser(userId, projectId)

	if (!project) {
		return null
	}

	const chapter = database
		.prepare(
			`
			SELECT
				c.id,
				c.title,
				c.position,
				c.original_text,
				c.translation_text,
				c.updated_at,
				COUNT(a.id) AS annotation_count
			FROM chapters c
			LEFT JOIN annotations a ON a.chapter_id = c.id
			WHERE c.id = ? AND c.project_id = ?
			GROUP BY c.id
		`,
		)
		.get(chapterId, projectId) as ChapterRow | undefined

	if (!chapter) {
		return null
	}

	const lemmas = database
		.prepare(
			`
			SELECT
				id,
				project_id,
				headword,
				gloss,
				part_of_speech,
				details
			FROM lemmas
			WHERE project_id = ?
			ORDER BY headword_normalized ASC
		`,
		)
		.all(projectId) as LemmaRow[]

	const annotations = database
		.prepare(
			`
			SELECT *
			FROM annotations
			WHERE chapter_id = ?
			ORDER BY is_orphaned ASC, start_offset ASC, created_at ASC
		`,
		)
		.all(chapterId) as AnnotationRow[]

	return {
		project: {
			id: project.id,
			name: project.name,
			description: project.description,
			language: project.language,
		},
		chapter: {
			...mapChapter(chapter),
			originalText: chapter.original_text ?? '',
			translationText: chapter.translation_text ?? '',
		},
		chapters: project.chapters,
		lemmas: lemmas.map(mapLemma),
		annotations: annotations.map(mapAnnotation),
	}
}

export function saveChapterContent(
	userId: string,
	input: SaveChapterContentInput,
): Annotation[] {
	const chapter = getOwnedChapter(userId, input.chapterId)

	if (!chapter) {
		throw new Error('Chapter not found')
	}

	const timestamp = new Date().toISOString()
	const annotationRows = database
		.prepare('SELECT * FROM annotations WHERE chapter_id = ?')
		.all(input.chapterId) as AnnotationRow[]

	database.transaction(() => {
		if (chapter.original_text !== input.originalText) {
			const updateAnnotation = database.prepare(`
				UPDATE annotations
				SET
					start_offset = ?,
					end_offset = ?,
					line_number = ?,
					is_orphaned = ?,
					updated_at = ?
				WHERE id = ?
			`)

			for (const annotation of annotationRows) {
				const range = reanchorTextRange(
					input.originalText,
					annotation.selected_text,
					annotation.start_offset,
					annotation.end_offset,
				)

				updateAnnotation.run(
					range.startOffset,
					range.endOffset,
					range.lineNumber,
					range.isOrphaned ? 1 : 0,
					timestamp,
					annotation.id,
				)
			}
		}

		database
			.prepare(
				`
				UPDATE chapters
				SET
					original_text = ?,
					translation_text = ?,
					updated_at = ?
				WHERE id = ?
			`,
			)
			.run(
				input.originalText,
				input.translationText,
				timestamp,
				input.chapterId,
			)
		touchProject(chapter.project_id, timestamp)
	})()

	const rows = database
		.prepare(
			`
			SELECT *
			FROM annotations
			WHERE chapter_id = ?
			ORDER BY is_orphaned ASC, start_offset ASC, created_at ASC
		`,
		)
		.all(input.chapterId) as AnnotationRow[]

	return rows.map(mapAnnotation)
}

function resolveLemmaId(
	projectId: string,
	input: UpsertAnnotationInput,
	timestamp: string,
): string | null {
	if (!input.lemma) {
		return null
	}

	if (input.lemma.type === 'existing') {
		const lemma = database
			.prepare(
				`
				SELECT id
				FROM lemmas
				WHERE id = ? AND project_id = ?
			`,
			)
			.get(input.lemma.lemmaId, projectId) as { id: string } | undefined

		if (!lemma) {
			throw new Error('Base form not found')
		}

		return lemma.id
	}

	const normalizedHeadword = normalizeHeadword(input.lemma.headword)
	const existingLemma = database
		.prepare(
			`
			SELECT id
			FROM lemmas
			WHERE project_id = ? AND headword_normalized = ?
		`,
		)
		.get(projectId, normalizedHeadword) as { id: string } | undefined

	if (existingLemma) {
		return existingLemma.id
	}

	const lemmaId = randomUUID()

	database
		.prepare(
			`
			INSERT INTO lemmas (
				id,
				project_id,
				headword,
				headword_normalized,
				gloss,
				part_of_speech,
				details,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		)
		.run(
			lemmaId,
			projectId,
			input.lemma.headword,
			normalizedHeadword,
			input.lemma.gloss,
			input.partOfSpeech,
			input.lemma.details,
			timestamp,
			timestamp,
		)

	return lemmaId
}

export function upsertAnnotation(
	userId: string,
	input: UpsertAnnotationInput,
): { annotation: Annotation; lemmas: Lemma[] } {
	const chapter = getOwnedChapter(userId, input.chapterId)

	if (!chapter) {
		throw new Error('Chapter not found')
	}

	if (
		chapter.original_text.slice(input.startOffset, input.endOffset) !==
		input.selectedText
	) {
		throw new Error('The source text changed. Select the passage again.')
	}

	const annotationId = input.annotationId ?? randomUUID()
	const timestamp = new Date().toISOString()
	const lineNumber = getLineNumber(chapter.original_text, input.startOffset)

	database.transaction(() => {
		if (input.annotationId) {
			const existingAnnotation = database
				.prepare(
					`
					SELECT a.id
					FROM annotations a
					JOIN chapters c ON c.id = a.chapter_id
					JOIN projects p ON p.id = c.project_id
					WHERE a.id = ? AND a.chapter_id = ? AND p.user_id = ?
				`,
				)
				.get(input.annotationId, input.chapterId, userId) as
				{ id: string } | undefined

			if (!existingAnnotation) {
				throw new Error('Annotation not found')
			}
		}

		const lemmaId = resolveLemmaId(chapter.project_id, input, timestamp)
		const morphologyJson = JSON.stringify(input.morphology)

		if (input.annotationId) {
			database
				.prepare(
					`
					UPDATE annotations
					SET
						lemma_id = ?,
						start_offset = ?,
						end_offset = ?,
						selected_text = ?,
						line_number = ?,
						part_of_speech = ?,
						morphology_json = ?,
						comment = ?,
						is_orphaned = 0,
						updated_at = ?
					WHERE id = ?
				`,
				)
				.run(
					lemmaId,
					input.startOffset,
					input.endOffset,
					input.selectedText,
					lineNumber,
					input.partOfSpeech,
					morphologyJson,
					input.comment,
					timestamp,
					annotationId,
				)
		} else {
			database
				.prepare(
					`
					INSERT INTO annotations (
						id,
						chapter_id,
						lemma_id,
						start_offset,
						end_offset,
						selected_text,
						line_number,
						part_of_speech,
						morphology_json,
						comment,
						created_at,
						updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				)
				.run(
					annotationId,
					input.chapterId,
					lemmaId,
					input.startOffset,
					input.endOffset,
					input.selectedText,
					lineNumber,
					input.partOfSpeech,
					morphologyJson,
					input.comment,
					timestamp,
					timestamp,
				)
		}

		database
			.prepare('UPDATE chapters SET updated_at = ? WHERE id = ?')
			.run(timestamp, input.chapterId)
		touchProject(chapter.project_id, timestamp)
	})()

	const annotationRow = database
		.prepare('SELECT * FROM annotations WHERE id = ?')
		.get(annotationId) as AnnotationRow
	const lemmaRows = database
		.prepare(
			`
			SELECT
				id,
				project_id,
				headword,
				gloss,
				part_of_speech,
				details
			FROM lemmas
			WHERE project_id = ?
			ORDER BY headword_normalized ASC
		`,
		)
		.all(chapter.project_id) as LemmaRow[]

	return {
		annotation: mapAnnotation(annotationRow),
		lemmas: lemmaRows.map(mapLemma),
	}
}

export function deleteAnnotation(
	userId: string,
	annotationId: string,
): boolean {
	const annotation = database
		.prepare(
			`
			SELECT a.id, c.id AS chapter_id, p.id AS project_id
			FROM annotations a
			JOIN chapters c ON c.id = a.chapter_id
			JOIN projects p ON p.id = c.project_id
			WHERE a.id = ? AND p.user_id = ?
		`,
		)
		.get(annotationId, userId) as
		{ id: string; chapter_id: string; project_id: string } | undefined

	if (!annotation) {
		return false
	}

	const timestamp = new Date().toISOString()

	database.transaction(() => {
		database.prepare('DELETE FROM annotations WHERE id = ?').run(annotationId)
		database
			.prepare('UPDATE chapters SET updated_at = ? WHERE id = ?')
			.run(timestamp, annotation.chapter_id)
		touchProject(annotation.project_id, timestamp)
	})()

	return true
}

export function getProjectLexicon(
	userId: string,
	projectId: string,
): ProjectLexiconData | null {
	const project = getProjectForUser(userId, projectId)

	if (!project) {
		return null
	}

	const rows = database
		.prepare(
			`
			SELECT
				l.id,
				l.project_id,
				l.headword,
				l.gloss,
				l.part_of_speech,
				l.details,
				a.id AS annotation_id,
				a.chapter_id,
				c.title AS chapter_title,
				c.position AS chapter_position,
				a.selected_text,
				a.line_number,
				a.morphology_json,
				a.comment,
				a.is_orphaned
			FROM lemmas l
			LEFT JOIN annotations a ON a.lemma_id = l.id
			LEFT JOIN chapters c ON c.id = a.chapter_id
			WHERE l.project_id = ?
			ORDER BY
				l.headword_normalized ASC,
				c.position ASC,
				a.line_number ASC
		`,
		)
		.all(projectId) as OccurrenceRow[]
	const lemmaMap = new Map<string, LemmaWithOccurrences>()

	for (const row of rows) {
		let lemma = lemmaMap.get(row.id)

		if (!lemma) {
			lemma = {
				...mapLemma(row),
				occurrences: [],
			}
			lemmaMap.set(row.id, lemma)
		}

		if (
			row.annotation_id &&
			row.chapter_id &&
			row.chapter_title &&
			row.chapter_position !== null &&
			row.selected_text
		) {
			lemma.occurrences.push({
				annotationId: row.annotation_id,
				chapterId: row.chapter_id,
				chapterTitle: row.chapter_title,
				chapterPosition: row.chapter_position,
				selectedText: row.selected_text,
				lineNumber: row.line_number,
				morphology: parseMorphology(row.morphology_json ?? '{}'),
				comment: row.comment ?? '',
				isOrphaned: row.is_orphaned === 1,
			})
		}
	}

	return {
		project: {
			id: project.id,
			name: project.name,
			language: project.language,
		},
		lemmas: Array.from(lemmaMap.values()),
	}
}
