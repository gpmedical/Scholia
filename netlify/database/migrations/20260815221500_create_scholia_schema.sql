CREATE TABLE projects (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	language TEXT NOT NULL CHECK (language IN ('LATIN', 'GREEK')),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE INDEX projects_user_id_idx
	ON projects (user_id, updated_at DESC);

CREATE TABLE chapters (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	title TEXT NOT NULL,
	position INTEGER NOT NULL,
	original_text TEXT NOT NULL DEFAULT '',
	translation_text TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	CONSTRAINT chapters_project_fk
		FOREIGN KEY (project_id)
		REFERENCES projects (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX chapters_position_idx
	ON chapters (project_id, position);

CREATE TABLE lemmas (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL,
	headword TEXT NOT NULL,
	headword_normalized TEXT NOT NULL,
	gloss TEXT NOT NULL DEFAULT '',
	part_of_speech TEXT NOT NULL,
	details TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	CONSTRAINT lemmas_project_fk
		FOREIGN KEY (project_id)
		REFERENCES projects (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX lemmas_headword_idx
	ON lemmas (project_id, headword_normalized);

CREATE TABLE annotations (
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
	is_orphaned BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	CONSTRAINT annotations_chapter_fk
		FOREIGN KEY (chapter_id)
		REFERENCES chapters (id) ON DELETE CASCADE,
	CONSTRAINT annotations_lemma_fk
		FOREIGN KEY (lemma_id)
		REFERENCES lemmas (id) ON DELETE SET NULL
);

CREATE INDEX annotations_chapter_idx
	ON annotations (chapter_id, start_offset);

CREATE INDEX annotations_lemma_idx
	ON annotations (lemma_id);
