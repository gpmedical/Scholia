import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

import './globals.css'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: {
		default: 'Scholia — Classical text, closely read',
		template: '%s · Scholia',
	},
	description: 'Create, translate, and annotate Latin and Ancient Greek texts.',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='en' className={`${geistSans.variable} ${geistMono.variable}`}>
			<body className='min-h-screen antialiased'>
				<ClerkProvider
					dynamic
					appearance={{
						cssLayerName: 'clerk',
					}}
				>
					<TooltipProvider>{children}</TooltipProvider>
					<Toaster richColors position='bottom-right' />
				</ClerkProvider>
			</body>
		</html>
	)
}
