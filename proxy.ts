import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware({
	contentSecurityPolicy: {
		strict: true,
		directives: {
			'base-uri': ['self'],
			'frame-ancestors': ['none'],
			'object-src': ['none'],
		},
	},
})

export const config = {
	matcher: [
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		'/(api|trpc)(.*)',
		'/__clerk/(.*)',
	],
}
