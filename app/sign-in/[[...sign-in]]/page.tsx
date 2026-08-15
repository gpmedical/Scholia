import { SignIn } from '@clerk/nextjs'

import { AuthShell } from '@/components/auth-shell'

export default function SignInPage() {
	return (
		<AuthShell
			eyebrow='Welcome back'
			title='Return to your texts.'
			description={
				'Your projects, translations, and annotations are waiting ' +
				'exactly where you left them.'
			}
		>
			<SignIn routing='path' path='/sign-in' />
		</AuthShell>
	)
}
