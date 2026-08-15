import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
	resolve: {
		alias: {
			'@': projectRoot,
			'server-only': path.join(projectRoot, 'test-support', 'server-only.ts'),
		},
	},
	test: {
		environment: 'node',
		fileParallelism: false,
	},
})
