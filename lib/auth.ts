import 'server-only'

import { auth } from '@clerk/nextjs/server'

export async function requireUserId(): Promise<string> {
	const authData = await auth.protect()

	if (!authData.userId) {
		throw new Error('Authentication required')
	}

	return authData.userId
}
