'use client'

import { LoaderCircle, PencilLine } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
	PARTS_OF_SPEECH,
	getPartOfSpeechLabel,
	type ActionResult,
	type Lemma,
	type PartOfSpeech,
	type UpdateLemmaInput,
} from '@/lib/domain'

interface EditLemmaDialogProps {
	lemma: Lemma
	updateLemma: (input: UpdateLemmaInput) => Promise<ActionResult<null>>
}

export function EditLemmaDialog({
	lemma,
	updateLemma,
}: EditLemmaDialogProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [isPending, startTransition] = useTransition()
	const [headword, setHeadword] = useState(lemma.headword)
	const [gloss, setGloss] = useState(lemma.gloss)
	const [partOfSpeech, setPartOfSpeech] = useState(lemma.partOfSpeech)
	const [details, setDetails] = useState(lemma.details)
	const [error, setError] = useState('')
	const fieldIdPrefix = `edit-lemma-${lemma.id}`
	const isUnchanged =
		headword.trim() === lemma.headword &&
		gloss.trim() === lemma.gloss &&
		partOfSpeech === lemma.partOfSpeech &&
		details.trim() === lemma.details

	function handleOpenChange(nextIsOpen: boolean) {
		setIsOpen(nextIsOpen)
		setError('')

		if (nextIsOpen) {
			setHeadword(lemma.headword)
			setGloss(lemma.gloss)
			setPartOfSpeech(lemma.partOfSpeech)
			setDetails(lemma.details)
		}
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError('')

		startTransition(async () => {
			const result = await updateLemma({
				lemmaId: lemma.id,
				headword,
				gloss,
				partOfSpeech,
				details,
			})

			if (!result.success) {
				setError(result.error)
				return
			}

			setIsOpen(false)
			toast.success('Lemma updated')
		})
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant='outline' size='sm'>
					<PencilLine />
					Edit
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-lg'>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit lemma</DialogTitle>
						<DialogDescription>
							Changes will appear everywhere this lemma is used. Existing
							occurrences will remain linked.
						</DialogDescription>
					</DialogHeader>
					<div className='grid gap-5 py-6'>
						<div className='grid gap-4 sm:grid-cols-2'>
							<div className='grid gap-2'>
								<Label htmlFor={`${fieldIdPrefix}-headword`}>Headword</Label>
								<Input
									id={`${fieldIdPrefix}-headword`}
									value={headword}
									onChange={(event) => setHeadword(event.target.value)}
									maxLength={120}
									autoFocus
									required
								/>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor={`${fieldIdPrefix}-part-of-speech`}>
									Part of speech
								</Label>
								<Select
									value={partOfSpeech}
									onValueChange={(value) => {
										setPartOfSpeech(value as PartOfSpeech)
									}}
								>
									<SelectTrigger
										id={`${fieldIdPrefix}-part-of-speech`}
										className='w-full'
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PARTS_OF_SPEECH.map((item) => (
											<SelectItem key={item} value={item}>
												{getPartOfSpeechLabel(item)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className='grid gap-2'>
							<Label htmlFor={`${fieldIdPrefix}-gloss`}>Gloss</Label>
							<Input
								id={`${fieldIdPrefix}-gloss`}
								value={gloss}
								onChange={(event) => setGloss(event.target.value)}
								maxLength={240}
							/>
						</div>
						<div className='grid gap-2'>
							<Label htmlFor={`${fieldIdPrefix}-details`}>
								Dictionary details
							</Label>
							<Textarea
								id={`${fieldIdPrefix}-details`}
								value={details}
								onChange={(event) => setDetails(event.target.value)}
								maxLength={300}
								rows={3}
							/>
						</div>
						{error && (
							<p role='alert' className='text-sm text-destructive'>
								{error}
							</p>
						)}
					</div>
					<DialogFooter className='-mx-4 -mb-4'>
						<Button
							type='button'
							variant='outline'
							onClick={() => setIsOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type='submit'
							disabled={isPending || isUnchanged}
						>
							{isPending ? (
								<LoaderCircle className='animate-spin' />
							) : (
								<PencilLine />
							)}
							Save changes
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
