export const LANGUAGES = ['LATIN', 'GREEK'] as const

export type Language = (typeof LANGUAGES)[number]

export const PARTS_OF_SPEECH = [
	'NOUN',
	'VERB',
	'PRONOUN',
	'ADJECTIVE',
	'PARTICIPLE',
	'ADVERB',
	'PREPOSITION',
	'CONJUNCTION',
	'PARTICLE',
	'INTERJECTION',
	'OTHER',
] as const

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number]

export interface ProjectSummary {
	id: string
	name: string
	description: string
	language: Language
	chapterCount: number
	annotationCount: number
	updatedAt: string
}

export interface ChapterSummary {
	id: string
	title: string
	position: number
	annotationCount: number
	updatedAt: string
}

export interface ProjectDetail extends ProjectSummary {
	chapters: ChapterSummary[]
	lemmaCount: number
}

export interface Lemma {
	id: string
	projectId: string
	headword: string
	gloss: string
	partOfSpeech: PartOfSpeech
	details: string
}

export interface Annotation {
	id: string
	chapterId: string
	lemmaId: string | null
	startOffset: number
	endOffset: number
	selectedText: string
	lineNumber: number | null
	partOfSpeech: PartOfSpeech
	morphology: Record<string, string>
	comment: string
	isOrphaned: boolean
	createdAt: string
	updatedAt: string
}

export interface ChapterWorkspaceData {
	project: Pick<ProjectDetail, 'id' | 'name' | 'description' | 'language'>
	chapter: ChapterSummary & {
		originalText: string
		translationText: string
	}
	chapters: ChapterSummary[]
	lemmas: Lemma[]
	annotations: Annotation[]
}

export interface Occurrence {
	annotationId: string
	chapterId: string
	chapterTitle: string
	chapterPosition: number
	selectedText: string
	lineNumber: number | null
	morphology: Record<string, string>
	comment: string
	isOrphaned: boolean
}

export interface LemmaWithOccurrences extends Lemma {
	occurrences: Occurrence[]
}

export interface ProjectLexiconData {
	project: Pick<ProjectDetail, 'id' | 'name' | 'language'>
	lemmas: LemmaWithOccurrences[]
}

export interface SourceSelection {
	startOffset: number
	endOffset: number
	selectedText: string
	lineNumber: number
}

export interface CreateProjectInput {
	name: string
	description: string
	language: Language
}

export interface CreateProjectResult {
	projectId: string
	chapterId: string
}

export interface CreateChapterInput {
	projectId: string
	title: string
	originalText: string
}

export interface RenameProjectInput {
	projectId: string
	name: string
}

export interface RenameChapterInput {
	chapterId: string
	title: string
}

export interface SaveChapterContentInput {
	chapterId: string
	originalText: string
	translationText: string
}

export type LemmaChoice =
	| {
			type: 'existing'
			lemmaId: string
	  }
	| {
			type: 'new'
			headword: string
			gloss: string
			details: string
	  }

export interface UpsertAnnotationInput {
	annotationId?: string
	chapterId: string
	startOffset: number
	endOffset: number
	selectedText: string
	partOfSpeech: PartOfSpeech
	morphology: Record<string, string>
	comment: string
	lemma: LemmaChoice | null
}

export type ActionResult<T> =
	| {
			success: true
			data: T
	  }
	| {
			success: false
			error: string
	  }

export function getLanguageLabel(language: Language): string {
	return language === 'LATIN' ? 'Latin' : 'Ancient Greek'
}

export function getPartOfSpeechLabel(partOfSpeech: PartOfSpeech): string {
	return partOfSpeech
		.toLocaleLowerCase()
		.replace(/^./, (character) => character.toLocaleUpperCase())
}
