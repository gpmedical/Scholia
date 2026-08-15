import { AppHeader } from '@/components/app-header'
import { requireUserId } from '@/lib/auth'

export default async function ProtectedLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	await requireUserId()

	return (
		<div className='min-h-screen'>
			<AppHeader />
			{children}
		</div>
	)
}
