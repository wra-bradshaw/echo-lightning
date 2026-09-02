import { z } from 'zod';
import { IdSchema } from '../shared/schema';

const SyllabusItemSchema = z
  .object({
    id: IdSchema.optional(),
    lessonId: IdSchema.optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
  })
  .loose();
const MediaSchema = z
  .object({
    id: IdSchema.optional(),
    title: z.string().optional(),
    isAvailable: z.boolean().optional(),
    thumbnailUri: z.string().optional(),
    isAudioOnly: z.boolean().optional(),
  })
  .loose();
const LessonMetadataSchema = z
  .object({
    id: IdSchema.optional(),
    sectionId: IdSchema.optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    timing: z.object({ start: z.string().optional(), end: z.string().optional() }).optional(),
  })
  .loose();
const LiveSyllabusItemSchema = z
  .object({
    type: z.string().optional(),
    lesson: z.object({ lesson: LessonMetadataSchema, medias: z.array(MediaSchema).optional() }).loose(),
  })
  .loose();
const SyllabusSchema = z.union([
  z.array(SyllabusItemSchema),
  z.object({ items: z.array(SyllabusItemSchema).optional(), lessons: z.array(SyllabusItemSchema).optional() }).loose(),
  z.object({ data: z.array(LiveSyllabusItemSchema) }).loose(),
]);

export type SyllabusPayload = z.infer<typeof SyllabusSchema>;
export type SyllabusWire = z.infer<typeof SyllabusItemSchema>;
export type MediaWire = z.infer<typeof MediaSchema>;
export type LiveSyllabusWire = z.infer<typeof LiveSyllabusItemSchema>;

export function decodeSyllabus(payload: unknown): SyllabusPayload {
  return SyllabusSchema.parse(payload);
}
