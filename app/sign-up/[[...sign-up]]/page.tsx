import { SignUp } from '@clerk/nextjs'

import { AuthShell } from '@/components/auth-shell'

export default function SignUpPage() {
	return (
		<AuthShell
			eyebrow='Begin your library'
			title='Give every word its due.'
			description={
				'Create a private workspace for close reading, translation, ' +
				'morphology, and commentary.'
			}
		>
			<SignUp routing='path' path='/sign-up' />
		</AuthShell>
	)
}
