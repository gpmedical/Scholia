import 'server-only'

import { randomUUID } from 'node:crypto'

import { getDatabase } from '@netlify/database'

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

interface QueryResult {
	rows: Record<string, unknown>[]
	rowCount: number | null
}

interface QueryExecutor {
	query(queryText: string, values?: unknown[]): Promise<QueryResult>
}

interface QueryClient extends QueryExecutor {
	release(): void
}

interface DatabasePool extends QueryExecutor {
	connect(): Promise<QueryClient>
}

interface ProjectRow {
	id: string
	name: string
	description: string
	language: Language
	chapter_count: string | number
	annotation_count: string | number
	lemma_count?: string | number
	updated_at: string
}

interface ChapterRow {
	id: string
	project_id?: string
	title: string
	position: number
	original_text?: string
	translation_text?: string
	annotation_count: string | number
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
	is_orphaned: boolean
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
	is_orphaned: boolean | null
}

interface OwnedChapterRow {
	id: string
	project_id: string
	original_text: string
	translation_text: string
}

let databasePool: DatabasePool | undefined

function getPool(): DatabasePool {
	databasePool ??= getDatabase().pool as unknown as DatabasePool

	return databasePool
}

async function queryRows<T>(
	queryText: string,
	values: unknown[] = [],
	executor: QueryExecutor = getPool(),
): Promise<T[]> {
	const result = await executor.query(queryText, values)

	return result.rows as unknown as T[]
}

async function withTransaction<T>(
	callback: (client: QueryClient) => Promise<T>,
): Promise<T> {
	const client = await getPool().connect()

	try {
		await client.query('BEGIN')
		const result = await callback(client)
		await client.query('COMMIT')

		return result
	} catch (err) {
		try {
			await client.query('ROLLBACK')
		} catch (rollbackError) {
			console.error('Database rollback failed', {
				type:
					rollbackError instanceof Error
						? rollbackError.name
						: typeof rollbackError,
			})
		}

		throw err
	} finally {
		client.release()
	}
}

function mapProject(row: ProjectRow): ProjectSummary {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		language: row.language,
		chapterCount: Number(row.chapter_count),
		annotationCount: Number(row.annotation_count),
		updatedAt: row.updated_at,
	}
}

function mapChapter(row: ChapterRow): ChapterSummary {
	return {
		id: row.id,
		title: row.title,
		position: row.position,
		annotationCount: Number(row.annotation_count),
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
		console.error('Could not parse annotation morphology', {
			type: err instanceof Error ? err.name : typeof err,
		})
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
		isOrphaned: row.is_orphaned,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function normalizeHeadword(headword: string): string {
	return headword.normalize('NFKC').trim().toLocaleLowerCase('und')
}

async function getOwnedChapter(
	userId: string,
	chapterId: string,
	executor: QueryExecutor = getPool(),
	lock = false,
): Promise<OwnedChapterRow | undefined> {
	const rows = await queryRows<OwnedChapterRow>(
		`
			SELECT
				c.id,
				c.project_id,
				c.original_text,
				c.translation_text
			FROM chapters c
			JOIN projects p ON p.id = c.project_id
			WHERE c.id = $1 AND p.user_id = $2
			${lock ? 'FOR UPDATE OF c, p' : ''}
		`,
		[chapterId, userId],
		executor,
	)

	return rows[0]
}

async function touchProject(
	projectId: string,
	updatedAt: string,
	executor: QueryExecutor,
): Promise<void> {
	await executor.query(
		'UPDATE projects SET updated_at = $1 WHERE id = $2',
		[updatedAt, projectId],
	)
}

export async function getProjectsForUser(
	userId: string,
): Promise<ProjectSummary[]> {
	const rows = await queryRows<ProjectRow>(
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
			WHERE p.user_id = $1
			GROUP BY p.id
			ORDER BY p.updated_at DESC
		`,
		[userId],
	)

	return rows.map(mapProject)
}

export async function createProject(
	userId: string,
	input: CreateProjectInput,
): Promise<CreateProjectResult> {
	const projectId = randomUUID()
	const timestamp = new Date().toISOString()

	await getPool().query(
		`
			INSERT INTO projects (
				id,
				user_id,
				name,
				description,
				language,
				created_at,
				updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
		`,
		[
			projectId,
			userId,
			input.name,
			input.description,
			input.language,
			timestamp,
			timestamp,
		],
	)

	return { projectId }
}

export async function getProjectForUser(
	userId: string,
	projectId: string,
): Promise<ProjectDetail | null> {
	const projectRows = await queryRows<ProjectRow>(
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
			WHERE p.id = $1 AND p.user_id = $2
			GROUP BY p.id
		`,
		[projectId, userId],
	)
	const project = projectRows[0]

	if (!project) {
		return null
	}

	const chapters = await queryRows<ChapterRow>(
		`
			SELECT
				c.id,
				c.title,
				c.position,
				c.updated_at,
				COUNT(a.id) AS annotation_count
			FROM chapters c
			LEFT JOIN annotations a ON a.chapter_id = c.id
			WHERE c.project_id = $1
			GROUP BY c.id
			ORDER BY c.position ASC
		`,
		[projectId],
	)

	return {
		...mapProject(project),
		lemmaCount: Number(project.lemma_count ?? 0),
		chapters: chapters.map(mapChapter),
	}
}

export async function deleteProject(
	userId: string,
	projectId: string,
): Promise<boolean> {
	const result = await getPool().query(
		'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
		[projectId, userId],
	)

	return result.rows.length === 1
}

export async function renameProject(
	userId: string,
	input: RenameProjectInput,
): Promise<boolean> {
	const timestamp = new Date().toISOString()
	const result = await getPool().query(
		`
			UPDATE projects
			SET name = $1, updated_at = $2
			WHERE id = $3 AND user_id = $4
			RETURNING id
		`,
		[input.name, timestamp, input.projectId, userId],
	)

	return result.rows.length === 1
}

export async function createChapter(
	userId: string,
	input: CreateChapterInput,
): Promise<ChapterSummary> {
	return withTransaction(async (client) => {
		const projectRows = await queryRows<{ id: string }>(
			`
				SELECT id
				FROM projects
				WHERE id = $1 AND user_id = $2
				FOR UPDATE
			`,
			[input.projectId, userId],
			client,
		)

		if (!projectRows[0]) {
			throw new Error('Project not found')
		}

		const positionRows = await queryRows<{ position: number }>(
			`
				SELECT COALESCE(MAX(position), 0) + 1 AS position
				FROM chapters
				WHERE project_id = $1
			`,
			[input.projectId],
			client,
		)
		const position = Number(positionRows[0]?.position ?? 1)
		const chapterId = randomUUID()
		const timestamp = new Date().toISOString()

		await client.query(
			`
				INSERT INTO chapters (
					id,
					project_id,
					title,
					position,
					original_text,
					created_at,
					updated_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7)
			`,
			[
				chapterId,
				input.projectId,
				input.title,
				position,
				input.originalText,
				timestamp,
				timestamp,
			],
		)
		await touchProject(input.projectId, timestamp, client)

		return {
			id: chapterId,
			title: input.title,
			position,
			annotationCount: 0,
			updatedAt: timestamp,
		}
	})
}

export async function deleteChapter(
	userId: string,
	chapterId: string,
): Promise<boolean> {
	return withTransaction(async (client) => {
		const chapter = await getOwnedChapter(userId, chapterId, client, true)

		if (!chapter) {
			return false
		}

		const timestamp = new Date().toISOString()
		await client.query('DELETE FROM chapters WHERE id = $1', [chapterId])
		await touchProject(chapter.project_id, timestamp, client)

		return true
	})
}

export async function renameChapter(
	userId: string,
	input: RenameChapterInput,
): Promise<string | null> {
	return withTransaction(async (client) => {
		const chapter = await getOwnedChapter(
			userId,
			input.chapterId,
			client,
			true,
		)

		if (!chapter) {
			return null
		}

		const timestamp = new Date().toISOString()
		await client.query(
			`
				UPDATE chapters
				SET title = $1, updated_at = $2
				WHERE id = $3
			`,
			[input.title, timestamp, input.chapterId],
		)
		await touchProject(chapter.project_id, timestamp, client)

		return chapter.project_id
	})
}

export async function getChapterWorkspace(
	userId: string,
	projectId: string,
	chapterId: string,
): Promise<ChapterWorkspaceData | null> {
	const project = await getProjectForUser(userId, projectId)

	if (!project) {
		return null
	}

	const chapterRows = await queryRows<ChapterRow>(
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
			WHERE c.id = $1 AND c.project_id = $2
			GROUP BY c.id
		`,
		[chapterId, projectId],
	)
	const chapter = chapterRows[0]

	if (!chapter) {
		return null
	}

	const [lemmas, annotations] = await Promise.all([
		queryRows<LemmaRow>(
			`
				SELECT
					id,
					project_id,
					headword,
					gloss,
					part_of_speech,
					details
				FROM lemmas
				WHERE project_id = $1
				ORDER BY headword_normalized ASC
			`,
			[projectId],
		),
		queryRows<AnnotationRow>(
			`
				SELECT *
				FROM annotations
				WHERE chapter_id = $1
				ORDER BY is_orphaned ASC, start_offset ASC, created_at ASC
			`,
			[chapterId],
		),
	])

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

export async function saveChapterContent(
	userId: string,
	input: SaveChapterContentInput,
): Promise<Annotation[]> {
	return withTransaction(async (client) => {
		const chapter = await getOwnedChapter(
			userId,
			input.chapterId,
			client,
			true,
		)

		if (!chapter) {
			throw new Error('Chapter not found')
		}

		const timestamp = new Date().toISOString()
		const annotationRows = await queryRows<AnnotationRow>(
			'SELECT * FROM annotations WHERE chapter_id = $1 FOR UPDATE',
			[input.chapterId],
			client,
		)

		if (chapter.original_text !== input.originalText) {
			for (const annotation of annotationRows) {
				const range = reanchorTextRange(
					input.originalText,
					annotation.selected_text,
					annotation.start_offset,
					annotation.end_offset,
				)

				await client.query(
					`
						UPDATE annotations
						SET
							start_offset = $1,
							end_offset = $2,
							line_number = $3,
							is_orphaned = $4,
							updated_at = $5
						WHERE id = $6
					`,
					[
						range.startOffset,
						range.endOffset,
						range.lineNumber,
						range.isOrphaned,
						timestamp,
						annotation.id,
					],
				)
			}
		}

		await client.query(
			`
				UPDATE chapters
				SET
					original_text = $1,
					translation_text = $2,
					updated_at = $3
				WHERE id = $4
			`,
			[
				input.originalText,
				input.translationText,
				timestamp,
				input.chapterId,
			],
		)
		await touchProject(chapter.project_id, timestamp, client)

		const rows = await queryRows<AnnotationRow>(
			`
				SELECT *
				FROM annotations
				WHERE chapter_id = $1
				ORDER BY is_orphaned ASC, start_offset ASC, created_at ASC
			`,
			[input.chapterId],
			client,
		)

		return rows.map(mapAnnotation)
	})
}

async function resolveLemmaId(
	executor: QueryExecutor,
	projectId: string,
	input: UpsertAnnotationInput,
	timestamp: string,
): Promise<string | null> {
	if (!input.lemma) {
		return null
	}

	if (input.lemma.type === 'existing') {
		const rows = await queryRows<{ id: string }>(
			'SELECT id FROM lemmas WHERE id = $1 AND project_id = $2',
			[input.lemma.lemmaId, projectId],
			executor,
		)

		if (!rows[0]) {
			throw new Error('Base form not found')
		}

		return rows[0].id
	}

	const normalizedHeadword = normalizeHeadword(input.lemma.headword)
	const lemmaId = randomUUID()
	const insertedRows = await queryRows<{ id: string }>(
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
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (project_id, headword_normalized) DO NOTHING
			RETURNING id
		`,
		[
			lemmaId,
			projectId,
			input.lemma.headword,
			normalizedHeadword,
			input.lemma.gloss,
			input.partOfSpeech,
			input.lemma.details,
			timestamp,
			timestamp,
		],
		executor,
	)

	if (insertedRows[0]) {
		return insertedRows[0].id
	}

	const existingRows = await queryRows<{ id: string }>(
		`
			SELECT id
			FROM lemmas
			WHERE project_id = $1 AND headword_normalized = $2
		`,
		[projectId, normalizedHeadword],
		executor,
	)
	const existingLemma = existingRows[0]

	if (!existingLemma) {
		throw new Error('Base form could not be saved')
	}

	return existingLemma.id
}

export async function upsertAnnotation(
	userId: string,
	input: UpsertAnnotationInput,
): Promise<{ annotation: Annotation; lemmas: Lemma[] }> {
	return withTransaction(async (client) => {
		const chapter = await getOwnedChapter(
			userId,
			input.chapterId,
			client,
			true,
		)

		if (!chapter) {
			throw new Error('Chapter not found')
		}

		if (
			chapter.original_text.slice(input.startOffset, input.endOffset) !==
			input.selectedText
		) {
			throw new Error('The source text changed. Select the passage again.')
		}

		if (input.annotationId) {
			const existingRows = await queryRows<{ id: string }>(
				`
					SELECT a.id
					FROM annotations a
					JOIN chapters c ON c.id = a.chapter_id
					JOIN projects p ON p.id = c.project_id
					WHERE a.id = $1 AND a.chapter_id = $2 AND p.user_id = $3
					FOR UPDATE OF a
				`,
				[input.annotationId, input.chapterId, userId],
				client,
			)

			if (!existingRows[0]) {
				throw new Error('Annotation not found')
			}
		}

		const annotationId = input.annotationId ?? randomUUID()
		const timestamp = new Date().toISOString()
		const lineNumber = getLineNumber(chapter.original_text, input.startOffset)
		const lemmaId = await resolveLemmaId(
			client,
			chapter.project_id,
			input,
			timestamp,
		)
		const morphologyJson = JSON.stringify(input.morphology)

		if (input.annotationId) {
			await client.query(
				`
					UPDATE annotations
					SET
						lemma_id = $1,
						start_offset = $2,
						end_offset = $3,
						selected_text = $4,
						line_number = $5,
						part_of_speech = $6,
						morphology_json = $7,
						comment = $8,
						is_orphaned = FALSE,
						updated_at = $9
					WHERE id = $10
				`,
				[
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
				],
			)
		} else {
			await client.query(
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
					) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				`,
				[
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
				],
			)
		}

		await client.query(
			'UPDATE chapters SET updated_at = $1 WHERE id = $2',
			[timestamp, input.chapterId],
		)
		await touchProject(chapter.project_id, timestamp, client)

		const annotationRows = await queryRows<AnnotationRow>(
			'SELECT * FROM annotations WHERE id = $1',
			[annotationId],
			client,
		)
		const lemmaRows = await queryRows<LemmaRow>(
			`
					SELECT
						id,
						project_id,
						headword,
						gloss,
						part_of_speech,
						details
					FROM lemmas
					WHERE project_id = $1
					ORDER BY headword_normalized ASC
			`,
			[chapter.project_id],
			client,
		)
		const annotation = annotationRows[0]

		if (!annotation) {
			throw new Error('Annotation could not be saved')
		}

		return {
			annotation: mapAnnotation(annotation),
			lemmas: lemmaRows.map(mapLemma),
		}
	})
}

export async function deleteAnnotation(
	userId: string,
	annotationId: string,
): Promise<boolean> {
	return withTransaction(async (client) => {
		const rows = await queryRows<{
			id: string
			chapter_id: string
			project_id: string
		}>(
			`
				SELECT a.id, c.id AS chapter_id, p.id AS project_id
				FROM annotations a
				JOIN chapters c ON c.id = a.chapter_id
				JOIN projects p ON p.id = c.project_id
				WHERE a.id = $1 AND p.user_id = $2
				FOR UPDATE OF a, c, p
			`,
			[annotationId, userId],
			client,
		)
		const annotation = rows[0]

		if (!annotation) {
			return false
		}

		const timestamp = new Date().toISOString()
		await client.query('DELETE FROM annotations WHERE id = $1', [annotationId])
		await client.query(
			'UPDATE chapters SET updated_at = $1 WHERE id = $2',
			[timestamp, annotation.chapter_id],
		)
		await touchProject(annotation.project_id, timestamp, client)

		return true
	})
}

export async function getProjectLexicon(
	userId: string,
	projectId: string,
): Promise<ProjectLexiconData | null> {
	const project = await getProjectForUser(userId, projectId)

	if (!project) {
		return null
	}

	const rows = await queryRows<OccurrenceRow>(
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
			WHERE l.project_id = $1
			ORDER BY
				l.headword_normalized ASC,
				c.position ASC,
				a.line_number ASC
		`,
		[projectId],
	)
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
				isOrphaned: row.is_orphaned === true,
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
