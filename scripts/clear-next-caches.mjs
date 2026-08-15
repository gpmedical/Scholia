import { rm } from 'node:fs/promises'
import path from 'node:path'

const workspace = path.resolve(process.cwd())
const nextDirectory = path.join(workspace, '.next')
const cacheDirectories = [
	path.join(nextDirectory, 'cache'),
	path.join(nextDirectory, 'dev', 'cache'),
]

for (const cacheDirectory of cacheDirectories) {
	const relativePath = path.relative(nextDirectory, cacheDirectory)
	const isExpectedCache =
		relativePath === 'cache' || relativePath === path.join('dev', 'cache')

	if (!isExpectedCache || relativePath.startsWith('..')) {
		throw new Error(`Refusing to remove unexpected path: ${cacheDirectory}`)
	}

	await rm(cacheDirectory, { force: true, recursive: true })
}

console.log('Cleared generated Next.js compiler caches.')
