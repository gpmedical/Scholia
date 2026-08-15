# Project Overview

You are a senior web developer, expert in Next.JS and React. We are building a web-app targeted at scholars and students of classical languages and literature, such as Latin and Ancient Greek. The app will allow users to add their own text, translate it and annotate it as described below.





# Tech Stack

* Next.JS 16.3 with App Router
* Typescript
* TailwindCSS v4.3
* shadcn/ui for reusable UI components
* Clerk for authentication





# Freedom

You have the Freedom to choose other packages/APIs that you need, as long as they are totally free and you do not duplicate tasks.





# User Flow

* User logs in and accesses his "dashboard" with a list of his projects
* They can create a new project (choosing language, Latin or Greek) or open an existing one
* Once inside the project, the user can also create different files (i.e. chapters). Inside chapters, the page will have 3 main sections (see scheme below): on the left, the original text will be displayed. On the right, the translation, on the bottom the notes.

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

|			|			|

|			|			|

|			|			|

|			|			|

|			|			|

|\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

|						|

|						|

|						|

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

* In a new file, the user can upload a text file with the original Latin or Greek text that will be read by the app and added to the left panel (line numbering will be added, and the text will be completely editable).
* The right panel can be filled in by the user
* The user can add a note to each word or group of words in the original text (left panel). The notes will appear in the bottom panel when the corresponding word (or group of words) is selected.

  * Notes have 2 sections: Grammar, and Comment:

    * Grammar lets the user select "Noun", "Verb", "Pronoun", "Adjective" etc. and then "link" the word to existing base forms of the verb or noun, indicating person, gender, mode and tense (as appropriate).
    * Comment is free text.
* There should also be the possibility to view a list of all the base forms that the user has annotated (by project), and then a list of all occurrances. For example, all instances of a certain verb or noun in the current project.

  * Example: Cano - to sing (2nd Conjugation, regular)

&#x09;		Cecini - 1st person perfect indicative, Chapter I, line 12

&#x09;		Cano - 1st person present indicative, Chapter 3, line 45

&#x09;		Canere - Infinitive, Chapter 10, line 1





# Best Practices

Use React/Next.JS best practices

* Modular, reusable components
* Clean, flat, modern and responsive UI
* Keep main pages protected behind login
* Always treat environment variable values as sensitive and never expose them publicly





# Development Guidelines

## Development Philosophy

  * Write clean, maintainable, and scalable code
  * Follow SOLID principles
  * Prefer functional and declarative programming patterns over imperative
  * Emphasize type safety and static analysis
  * Practice component-driven development

## Code Implementation Guidelines

### Planning Phase

  * Begin with step-by-step planning
  * Write detailed pseudocode before implementation
  * Document component architecture and data flow
  * Consider edge cases and error scenarios

### Code Style Standards

  * Use tabs for indentation
  * Use single quotes for strings (except to avoid escaping)
  * Omit semicolons (unless required for disambiguation)
  * Eliminate unused variables
  * Add space after keywords
  * Add space before function declaration parentheses
  * Always use strict equality (===) instead of loose equality (==)
  * Space infix operators
  * Add space after commas
  * Keep else statements on the same line as closing curly braces
  * Use curly braces for multi-line if statements
  * Always handle error parameters in callbacks
  * Limit line length to 80 characters
  * Use trailing commas in multiline object/array literals

## Naming Conventions

### General Rules

  * PascalCase for: Components, Type definitions, Interfaces
  * kebab-case for: Directory names (e.g., components/auth-wizard), File names (e.g., user-profile.tsx)
  * camelCase for: Variables, Functions, Methods, Hooks, Properties, Props
  * UPPERCASE for: Environment variables, Constants, Global configurations

### Specific Naming Patterns

  * Prefix event handlers with 'handle': handleClick, handleSubmit
  * Prefix boolean variables with verbs: isLoading, hasError, canSubmit
  * Prefix custom hooks with 'use': useAuth, useForm
  * Use complete words over abbreviations except for:

    * err (error)
    * req (request)
    * res (response)
    * props (properties)
    * ref (reference)





# Creativity

You have the freedom to decide 1) The name of the app; 2) The color scheme/styling; 3) The logo. As long as all 3 elements look and sound professional and premium.

