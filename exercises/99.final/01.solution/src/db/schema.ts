import { z } from 'zod'

// Helper to transform timestamps from SQLite's datetime format
const timestampSchema = z.preprocess((val) => {
	if (typeof val === 'string') {
		// SQLite datetime format: YYYY-MM-DD HH:MM:SS
		const date = new Date(val.replace(' ', 'T'))
		const timestamp = date.getTime() / 1000
		return isNaN(timestamp) ? null : timestamp
	}
	return val
}, z.number())

// Schema Validation
export const entrySchema = z.object({
	id: z.coerce.number(),
	title: z.string(),
	content: z.string(),
	mood: z.string().nullable(),
	location: z.string().nullable(),
	weather: z.string().nullable(),
	isPrivate: z.coerce.number(),
	isFavorite: z.coerce.number(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

export const newEntrySchema = z.object({
	title: z.string(),
	content: z.string(),
	mood: z.string().nullable().default(null),
	location: z.string().nullable().default(null),
	weather: z.string().nullable().default(null),
	isPrivate: z.number().default(1),
	isFavorite: z.number().default(0),
})

export const tagSchema = z.object({
	id: z.coerce.number(),
	name: z.string(),
	description: z.string().nullable(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

export const newTagSchema = z.object({
	name: z.string(),
	description: z.string().nullable().optional(),
})

export const entryTagSchema = z.object({
	id: z.coerce.number(),
	entryId: z.coerce.number(),
	tagId: z.coerce.number(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

export const newEntryTagSchema = z.object({
	entryId: z.number(),
	tagId: z.number(),
})

export type Entry = z.infer<typeof entrySchema>
export type NewEntry = z.infer<typeof newEntrySchema>
export type Tag = z.infer<typeof tagSchema>
export type NewTag = z.infer<typeof newTagSchema>
export type EntryTag = z.infer<typeof entryTagSchema>
export type NewEntryTag = z.infer<typeof newEntryTagSchema>
