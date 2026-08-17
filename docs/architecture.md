# Scholia implementation plan

## Product identity

- Name: Scholia
- Positioning: a focused digital desk for close reading, translation, and
  grammatical annotation of Latin and Ancient Greek texts.
- Visual direction: warm parchment surfaces, charcoal ink, oxblood accents,
  muted brass details, and a restrained editorial layout.
- Mark: a compact sigma monogram inside a folio shape.

## Route architecture

```text
/
  Public landing page and Clerk sign-in/sign-up entry points
/sign-in/[[...sign-in]]
  Clerk sign-in UI
/sign-up/[[...sign-up]]
  Clerk sign-up UI
/dashboard
  Protected list of the current user's projects
/projects/[project-id]
  Protected project overview and chapter management
/projects/[project-id]/chapters/[chapter-id]
  Protected three-panel reading and annotation workspace
/projects/[project-id]/lexicon
  Protected project-wide lemma and occurrence index
```

Pages are Server Components. Interactive dialogs, forms, filters, and the
editor workspace are narrow Client Component islands. Every protected page
checks authentication itself because layouts are not a sufficient security
boundary during client navigation.

## Data model

```text
users (represented by Clerk user IDs)
  1 -> many projects

projects
  id, user_id, name, description, language, created_at, updated_at
  1 -> many chapters
  1 -> many lemmas

chapters
  id, project_id, title, position, original_text, translation_text,
  created_at, updated_at
  1 -> many annotations

lemmas
  id, project_id, headword, gloss, part_of_speech, details,
  created_at, updated_at
  1 -> many annotations

annotations
  id, chapter_id, lemma_id, start_offset, end_offset, selected_text,
  line_number, part_of_speech, morphology_json, comment, is_orphaned,
  created_at, updated_at
```

Database access is isolated in a `server-only` data access layer backed by
Netlify Database (Postgres). Queries are parameterized. The current Clerk user
ID is included in every project, chapter, lemma, and annotation lookup so
guessing an ID cannot expose or mutate another user's data. Only plain,
minimal DTOs cross the Server/Client boundary.

## Component architecture

```text
RootLayout
  ClerkProvider
    TooltipProvider
      Public or protected page

AppShell
  BrandMark
  primary navigation
  Clerk UserButton

DashboardPage
  ProjectCard[]
  CreateProjectDialog

ProjectPage
  ProjectHeader
  ChapterCard[]
  CreateChapterDialog

ChapterPage
  ProjectSidebar
    ChapterNavigation
    NewChapterDialog
    LexiconLink
  ChapterWorkspace
    WorkspaceToolbar
    SourceEditor
      LineNumbers
      selectable textarea
    TranslationEditor
    NotesPanel
      SelectionSummary
      AnnotationEditor
        GrammarFields
        LemmaPicker
        CommentField
      ExistingAnnotationCard[]

LexiconPage
  LexiconExplorer
    SearchAndFilters
    LemmaEntry[]
      OccurrenceRow[]
```

## Data flow

1. A protected page obtains the Clerk user ID on the server.
2. The page calls the server-only DAL, which applies ownership checks and
   returns a minimal DTO.
3. The page passes serializable initial data and explicitly passed Server
   Actions to its interactive client component.
4. The client performs optimistic UI updates where safe and invokes a Server
   Action for each mutation.
5. The Server Action validates untrusted input, obtains the Clerk user ID
   again, and delegates to the DAL.
6. The DAL checks ownership, writes the transaction, and returns a minimal
   result. The action revalidates the affected path when navigation-visible
   data changed.

## Detailed pseudocode

### Authentication

```text
ON every protected page request:
	authResult = await Clerk auth()
	IF no authenticated user:
		redirect to sign-in
	ELSE:
		query only resources owned by authResult.userId

ON every Server Action:
	authResult = await Clerk auth()
	IF no authenticated user:
		throw an unauthorized error
	validate all IDs, enums, lengths, and offsets
	perform an ownership-constrained mutation
```

### Create a project

```text
WHEN user submits the project dialog:
	trim name and description
	validate name is present and language is LATIN or GREEK
	insert project with current Clerk user ID
	revalidate dashboard
	redirect to the empty project page
```

### Create or import a chapter

```text
WHEN user chooses a .txt file:
	reject non-text files and files larger than the configured limit
	read the file as UTF-8 in the browser
	pre-fill the title from the file name
	show a short import preview

WHEN user submits:
	validate title and imported text length
	verify the project belongs to the current user
	append the chapter at the next position
	redirect to the new chapter workspace
```

### Edit and save chapter text

```text
ON source or translation change:
	update local editor state immediately
	set status to "Unsaved"
	reset a short debounce timer

WHEN debounce expires OR user presses Ctrl/Cmd+S OR Save:
	send both current text values to a protected Server Action
	set status to "Saving"
	IF the source changed:
		for every existing annotation:
			IF selected text still exists at its offsets:
				keep offsets
			ELSE find the nearest matching occurrence of selected text
			IF a nearest occurrence exists:
				update offsets and line number
			ELSE:
				mark annotation orphaned for review
	IF this is the latest save request:
		set status to "Saved" or show a retryable error
```

### Select and annotate source text

```text
ON textarea selection:
	read selectionStart and selectionEnd
	trim surrounding whitespace while preserving absolute offsets
	calculate the source line number from preceding newline characters
	find annotations whose ranges overlap the selection
	display matching notes in the bottom panel

WHEN selection is non-empty and user chooses "Add note":
	open a note editor bound to the exact source range
	choose part of speech
	show morphology fields appropriate to that part of speech
	choose an existing project lemma OR enter a new headword/gloss/details
	enter an optional free-text comment
	validate that the selected source still matches the stored range
	create the lemma if needed, then create the annotation transactionally
	show the saved note without losing the text selection context
```

### Morphology fields

```text
NOUN:
	case, number, gender, declension
VERB:
	person, number, tense, mood, voice, conjugation
PRONOUN:
	pronoun type, person, case, number, gender
ADJECTIVE:
	degree, case, number, gender
PARTICIPLE:
	tense, voice, case, number, gender
ADVERB:
	degree
PREPOSITION / CONJUNCTION / PARTICLE / INTERJECTION / OTHER:
	part of speech and optional descriptive details
```

### Lemma occurrence index

```text
QUERY all project lemmas owned by current user
LEFT JOIN annotations and chapters
GROUP by lemma
SORT lemmas alphabetically and occurrences by chapter position then line

ON search/filter:
	match normalized headword, gloss, details, and part of speech

ON occurrence click:
	navigate to its chapter with annotation ID in the query string
	initialize the workspace selection to the annotation range
	display the corresponding note in the bottom panel
```

## Error and edge-case handling

- Empty projects and empty chapters have designed actions, not placeholder
  text.
- Imported files must be plain text, UTF-8-readable, and within the size
  limit.
- Empty selections cannot be annotated; whitespace is trimmed before ranges
  are stored.
- Selection offsets and requested resource IDs are validated on the server.
- Source edits attempt to re-anchor annotations and visibly flag unmatched
  annotations rather than silently discarding scholarship.
- Duplicate lemma headwords are prevented within a project after Unicode and
  case normalization; users are directed to the existing lemma.
- Autosave failures retain local editor text and expose an explicit retry.
- All destructive actions require an AlertDialog confirmation.
- Responsive layouts stack the source, translation, and notes panels on small
  screens while preserving the three-region desktop workspace.

## Verification strategy

1. Run TypeScript and Next.js linting.
2. Apply the migration to an isolated database and exercise ownership, CRUD,
   annotation re-anchoring, and occurrence grouping.
3. Produce a clean production build.
4. Run the development server and exercise public, signed-out redirect,
   sign-up/sign-in, project creation, text import, editing, annotation,
   lemma-index navigation, responsive layout, and deletion flows in a real
   browser.
5. Fix all discovered console, runtime, accessibility, and visual defects,
   then repeat the affected checks.
