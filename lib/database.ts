import 'server-only'

import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const globalDatabase = globalThis as typeof globalThis & {
	scholiaDatabase?: Database.Database
}

function getDatabasePath(): string {
	const configuredPath = process.env.SCHOLIA_DATABASE_PATH

	if (configuredPath) {
		return configuredPath
	}

	const dataDirectory = path.join(process.cwd(), 'data')
	mkdirSync(dataDirectory, { recursive: true })

	return path.join(dataDirectory, 'scholia.db')
}

function initializeDatabase(database: Database.Database): void {
	database.pragma('foreign_keys = ON')
	database.pragma('journal_mode = WAL')

	database.exec(`
		CREATE TABLE IF NOT EXISTS projects (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			language TEXT NOT NULL CHECK (language IN ('LATIN', 'GREEK')),
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);

		CREATE INDEX IF NOT EXISTS projects_user_id_idx
		ON projects (user_id, updated_at DESC);

		CREATE TABLE IF NOT EXISTS chapters (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			title TEXT NOT NULL,
			position INTEGER NOT NULL,
			original_text TEXT NOT NULL DEFAULT '',
			translation_text TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			FOREIGN KEY (project_id)
				REFERENCES projects (id) ON DELETE CASCADE
		);

		CREATE UNIQUE INDEX IF NOT EXISTS chapters_position_idx
		ON chapters (project_id, position);

		CREATE TABLE IF NOT EXISTS lemmas (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			headword TEXT NOT NULL,
			headword_normalized TEXT NOT NULL,
			gloss TEXT NOT NULL DEFAULT '',
			part_of_speech TEXT NOT NULL,
			details TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			FOREIGN KEY (project_id)
				REFERENCES projects (id) ON DELETE CASCADE
		);

		CREATE UNIQUE INDEX IF NOT EXISTS lemmas_headword_idx
		ON lemmas (project_id, headword_normalized);

		CREATE TABLE IF NOT EXISTS annotations (
			id TEXT PRIMARY KEY,
			chapter_id TEXT NOT NULL,
			lemma_id TEXT,
			start_offset INTEGER NOT NULL,
			end_offset INTEGER NOT NULL,
			selected_text TEXT NOT NULL,
			line_number INTEGER,
			part_of_speech TEXT NOT NULL,
			morphology_json TEXT NOT NULL DEFAULT '{}',
			comment TEXT NOT NULL DEFAULT '',
			is_orphaned INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			FOREIGN KEY (chapter_id)
				REFERENCES chapters (id) ON DELETE CASCADE,
			FOREIGN KEY (lemma_id)
				REFERENCES lemmas (id) ON DELETE SET NULL
		);

		CREATE INDEX IF NOT EXISTS annotations_chapter_idx
		ON annotations (chapter_id, start_offset);

		CREATE INDEX IF NOT EXISTS annotations_lemma_idx
		ON annotations (lemma_id);
	`)
}

function createDatabase(): Database.Database {
	const database = new Database(getDatabasePath())
	initializeDatabase(database)

	return database
}

export const database = globalDatabase.scholiaDatabase ?? createDatabase()

if (process.env.NODE_ENV !== 'production') {
	globalDatabase.scholiaDatabase = database
}
