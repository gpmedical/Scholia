import { ImageResponse } from 'next/og'

export const size = {
	width: 64,
	height: 64,
}

export const contentType = 'image/png'

export default function Icon() {
	return new ImageResponse(
		(
			<div
				style={{
					alignItems: 'center',
					background: '#70262f',
					border: '2px solid #8f4650',
					borderRadius: 14,
					color: '#fffaf0',
					display: 'flex',
					fontFamily: 'Georgia, serif',
					fontSize: 40,
					height: '100%',
					justifyContent: 'center',
					lineHeight: 1,
					paddingBottom: 4,
					width: '100%',
				}}
			>
				{'\u03a3'}
			</div>
		),
		{
			...size,
		},
	)
}
