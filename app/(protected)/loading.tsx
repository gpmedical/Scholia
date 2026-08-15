import { Skeleton } from '@/components/ui/skeleton'

export default function ProtectedLoading() {
	return (
		<main className='mx-auto w-full max-w-6xl px-4 py-12 sm:px-6'>
			<Skeleton className='h-4 w-28' />
			<Skeleton className='mt-5 h-10 w-72 max-w-full' />
			<Skeleton className='mt-3 h-5 w-96 max-w-full' />
			<div className='mt-10 grid gap-4 md:grid-cols-3'>
				<Skeleton className='h-36' />
				<Skeleton className='h-36' />
				<Skeleton className='h-36' />
			</div>
		</main>
	)
}
