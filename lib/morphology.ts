import type { PartOfSpeech } from '@/lib/domain'

export interface MorphologyField {
	key: string
	label: string
	placeholder: string
	options: string[]
}

const COMMON_NUMBER = ['Singular', 'Plural']
const COMMON_GENDER = ['Masculine', 'Feminine', 'Neuter', 'Common']
const COMMON_CASE = [
	'Nominative',
	'Genitive',
	'Dative',
	'Accusative',
	'Ablative',
	'Vocative',
	'Locative',
]

const fields: Record<PartOfSpeech, MorphologyField[]> = {
	NOUN: [
		field('case', 'Case', COMMON_CASE),
		field('number', 'Number', COMMON_NUMBER),
		field('gender', 'Gender', COMMON_GENDER),
		field('declension', 'Declension', [
			'First',
			'Second',
			'Third',
			'Fourth',
			'Fifth',
			'Irregular',
		]),
	],
	VERB: [
		field('person', 'Person', ['First', 'Second', 'Third']),
		field('number', 'Number', COMMON_NUMBER),
		field('tense', 'Tense', [
			'Present',
			'Imperfect',
			'Future',
			'Perfect',
			'Pluperfect',
			'Future perfect',
			'Aorist',
		]),
		field('mood', 'Mood', [
			'Indicative',
			'Subjunctive',
			'Imperative',
			'Infinitive',
			'Optative',
		]),
		field('voice', 'Voice', ['Active', 'Middle', 'Passive']),
		field('conjugation', 'Conjugation', [
			'First',
			'Second',
			'Third',
			'Third -io',
			'Fourth',
			'Irregular',
		]),
	],
	PRONOUN: [
		field('type', 'Pronoun type', [
			'Personal',
			'Demonstrative',
			'Relative',
			'Interrogative',
			'Indefinite',
			'Reflexive',
			'Possessive',
		]),
		field('person', 'Person', ['First', 'Second', 'Third']),
		field('case', 'Case', COMMON_CASE),
		field('number', 'Number', COMMON_NUMBER),
		field('gender', 'Gender', COMMON_GENDER),
	],
	ADJECTIVE: [
		field('degree', 'Degree', ['Positive', 'Comparative', 'Superlative']),
		field('case', 'Case', COMMON_CASE),
		field('number', 'Number', COMMON_NUMBER),
		field('gender', 'Gender', COMMON_GENDER),
	],
	PARTICIPLE: [
		field('tense', 'Tense', ['Present', 'Future', 'Perfect', 'Aorist']),
		field('voice', 'Voice', ['Active', 'Middle', 'Passive']),
		field('case', 'Case', COMMON_CASE),
		field('number', 'Number', COMMON_NUMBER),
		field('gender', 'Gender', COMMON_GENDER),
	],
	ADVERB: [
		field('degree', 'Degree', ['Positive', 'Comparative', 'Superlative']),
	],
	PREPOSITION: [],
	CONJUNCTION: [],
	PARTICLE: [],
	INTERJECTION: [],
	OTHER: [],
}

function field(key: string, label: string, options: string[]): MorphologyField {
	return {
		key,
		label,
		placeholder: `Select ${label.toLocaleLowerCase()}`,
		options,
	}
}

export function getMorphologyFields(
	partOfSpeech: PartOfSpeech,
): MorphologyField[] {
	return fields[partOfSpeech]
}

export function formatMorphology(morphology: Record<string, string>): string {
	return Object.values(morphology).filter(Boolean).join(', ')
}
