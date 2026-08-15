import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	poweredByHeader: false,
	experimental: {
		// Avoid persisting environment-derived compiler state in CI build caches.
		turbopackFileSystemCacheForBuild: false,
	},
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=31536000',
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'X-Frame-Options',
						value: 'DENY',
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin',
					},
					{
						key: 'Permissions-Policy',
						value:
							'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
					},
				],
			},
		]
	},
}

export default nextConfig
