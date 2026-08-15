import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { UpsertAnnotationInput } from '@/lib/domain'

let temporaryDirectory = ''
let dataAccess: typeof import('@/lib/data-access')
let databaseModule: typeof import('@/lib/database')

beforeAll(async () => {
	temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'scholia-data-test-'))
	process.env.SCHOLIA_DATABASE_PATH = path.join(temporaryDirectory, 'test.db')
	dataAccess = await import('@/lib/data-access')
	databaseModule = await import('@/lib/database')
})

afterAll(() => {
	databaseModule.database.close()
	rmSync(temporaryDirectory, { recursive: true, force: true })
})

describe('user-scoped data access', () => {
	const firstUser = 'user_test_first'
	const secondUser = 'user_test_second'
	let projectId = ''
	let chapterId = ''
	let annotationId = ''

	it('creates a project and keeps it private to its owner', () => {
		const created = dataAccess.createProject(firstUser, {
			name: 'Aeneid',
			description: 'Book I seminar',
			language: 'LATIN',
		})

		projectId = created.projectId
		chapterId = created.chapterId

		expect(dataAccess.getProjectsForUser(firstUser)).toHaveLength(1)
		expect(dataAccess.getProjectsForUser(secondUser)).toHaveLength(0)
		expect(dataAccess.getProjectForUser(secondUser, projectId)).toBeNull()
	})

	it('rejects chapter creation by a different user', () => {
		expect(() => {
			dataAccess.createChapter(secondUser, {
				projectId,
				title: 'Stolen chapter',
				originalText: '',
			})
		}).toThrow('Project not found')
	})

	it('renames only projects and chapters owned by the user', () => {
		expect(
			dataAccess.renameProject(secondUser, {
				projectId,
				name: 'Stolen project',
			}),
		).toBe(false)
		expect(
			dataAccess.renameProject(firstUser, {
				projectId,
				name: 'Aeneid seminar',
			}),
		).toBe(true)
		expect(
			dataAccess.renameChapter(secondUser, {
				chapterId,
				title: 'Stolen chapter',
			}),
		).toBeNull()
		expect(
			dataAccess.renameChapter(firstUser, {
				chapterId,
				title: 'Book I',
			}),
		).toBe(projectId)

		const project = dataAccess.getProjectForUser(firstUser, projectId)

		expect(project?.name).toBe('Aeneid seminar')
		expect(project?.chapters[0]?.title).toBe('Book I')
	})

	it('stores source text, annotation grammar, and a new lemma', () => {
		dataAccess.saveChapterContent(firstUser, {
			chapterId,
			originalText: 'Arma virumque cano',
			translationText: 'I sing of arms and the man',
		})

		const input: UpsertAnnotationInput = {
			chapterId,
			startOffset: 14,
			endOffset: 18,
			selectedText: 'cano',
			partOfSpeech: 'VERB',
			morphology: {
				person: 'First',
				number: 'Singular',
				tense: 'Present',
				mood: 'Indicative',
				voice: 'Active',
			},
			comment: 'The programmatic opening of the poem.',
			lemma: {
				type: 'new',
				headword: 'cano',
				gloss: 'to sing',
				details: '3rd conjugation',
			},
		}
		const result = dataAccess.upsertAnnotation(firstUser, input)

		annotationId = result.annotation.id
		expect(result.annotation.lineNumber).toBe(1)
		expect(result.lemmas[0]?.headword).toBe('cano')
		expect(result.annotation.morphology.mood).toBe('Indicative')
	})

	it('groups the annotated form under its lemma occurrence', () => {
		const lexicon = dataAccess.getProjectLexicon(firstUser, projectId)

		expect(lexicon?.lemmas).toHaveLength(1)
		expect(lexicon?.lemmas[0]?.occurrences[0]).toMatchObject({
			annotationId,
			chapterId,
			selectedText: 'cano',
		})
		expect(dataAccess.getProjectLexicon(secondUser, projectId)).toBeNull()
	})

	it('reanchors an annotation after text is inserted before it', () => {
		const annotations = dataAccess.saveChapterContent(firstUser, {
			chapterId,
			originalText: 'Muse, Arma virumque cano',
			translationText: 'I sing of arms and the man',
		})

		expect(annotations[0]).toMatchObject({
			startOffset: 20,
			endOffset: 24,
			isOrphaned: false,
		})
	})

	it('preserves a removed annotation as an orphan for review', () => {
		const annotations = dataAccess.saveChapterContent(firstUser, {
			chapterId,
			originalText: 'Arma virumque',
			translationText: 'Arms and the man',
		})

		expect(annotations[0]).toMatchObject({
			startOffset: -1,
			endOffset: -1,
			lineNumber: null,
			isOrphaned: true,
		})
	})

	it('prevents another user from deleting an annotation', () => {
		expect(dataAccess.deleteAnnotation(secondUser, annotationId)).toBe(false)
		expect(dataAccess.deleteAnnotation(firstUser, annotationId)).toBe(true)
	})
})
