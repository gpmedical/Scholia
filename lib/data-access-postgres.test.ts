import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { UpsertAnnotationInput } from '@/lib/domain'

let postgres: PGlite
let dataAccess: typeof import('@/lib/data-access')

beforeAll(async () => {
	postgres = new PGlite()
	const migration = await readFile(
		path.join(
			process.cwd(),
			'netlify',
			'database',
			'migrations',
			'20260815221500_create_scholia_schema.sql',
		),
		'utf8',
	)
	await postgres.exec(migration)

	const query = async (queryText: string, values: unknown[] = []) => {
		const result = await postgres.query<Record<string, unknown>>(
			queryText,
			values,
		)

		return {
			rows: result.rows,
			rowCount: result.affectedRows ?? result.rows.length,
		}
	}
	const client = {
		query,
		release() {},
	}

	vi.doMock('@netlify/database', () => ({
		getDatabase: () => ({
			pool: {
				query,
				connect: async () => client,
			},
		}),
	}))
	process.env.NETLIFY_DB_URL = 'postgresql://isolated-test.invalid/scholia'
	dataAccess = await import('@/lib/data-access')
})

afterAll(async () => {
	delete process.env.NETLIFY_DB_URL
	vi.doUnmock('@netlify/database')
	await postgres.close()
})

describe('Netlify Postgres data access', () => {
	it('runs the protected project and annotation workflow durably', async () => {
		const ownerId = 'user_postgres_owner'
		const otherUserId = 'user_postgres_other'
		const created = await dataAccess.createProject(ownerId, {
			name: 'Odyssey',
			description: 'Book IX seminar',
			language: 'GREEK',
		})

		expect(await dataAccess.getProjectsForUser(ownerId)).toHaveLength(1)
		expect(await dataAccess.getProjectsForUser(otherUserId)).toHaveLength(0)
		expect(
			await dataAccess.getProjectForUser(otherUserId, created.projectId),
		).toBeNull()
		await expect(
			dataAccess.createChapter(otherUserId, {
				projectId: created.projectId,
				title: 'Unauthorized chapter',
				originalText: '',
			}),
		).rejects.toThrow('Project not found')

		await dataAccess.saveChapterContent(ownerId, {
			chapterId: created.chapterId,
			originalText: 'ἄνδρα μοι ἔννεπε',
			translationText: 'Tell me of the man',
		})
		const annotationInput: UpsertAnnotationInput = {
			chapterId: created.chapterId,
			startOffset: 0,
			endOffset: 5,
			selectedText: 'ἄνδρα',
			partOfSpeech: 'NOUN',
			morphology: {
				case: 'Accusative',
				number: 'Singular',
			},
			comment: 'The poem announces its subject.',
			lemma: {
				type: 'new',
				headword: 'ἀνήρ',
				gloss: 'man',
				details: 'third declension',
			},
		}
		const saved = await dataAccess.upsertAnnotation(
			ownerId,
			annotationInput,
		)

		expect(saved.annotation.morphology.case).toBe('Accusative')
		expect(saved.lemmas[0]?.headword).toBe('ἀνήρ')

		const lexicon = await dataAccess.getProjectLexicon(
			ownerId,
			created.projectId,
		)
		expect(lexicon?.lemmas[0]?.occurrences[0]).toMatchObject({
			annotationId: saved.annotation.id,
			chapterId: created.chapterId,
			selectedText: 'ἄνδρα',
		})
		expect(
			await dataAccess.getProjectLexicon(otherUserId, created.projectId),
		).toBeNull()
		expect(
			await dataAccess.deleteAnnotation(otherUserId, saved.annotation.id),
		).toBe(false)
		expect(
			await dataAccess.deleteAnnotation(ownerId, saved.annotation.id),
		).toBe(true)
	})
})
