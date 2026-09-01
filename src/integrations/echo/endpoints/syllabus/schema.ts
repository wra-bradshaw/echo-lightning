import { z } from 'zod';

const IdSchema = z.union([z.string(), z.number()]).transform(String);
const SyllabusItemSchema = z
  .object({
    id: IdSchema.optional(),
    lessonId: IdSchema.optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();
const SyllabusSchema = z.union([
  z.array(SyllabusItemSchema),
  z
    .object({ items: z.array(SyllabusItemSchema).optional(), lessons: z.array(SyllabusItemSchema).optional() })
    .passthrough(),
]);

type SyllabusWire = z.infer<typeof SyllabusItemSchema>;

function records(payload: z.infer<typeof SyllabusSchema>): SyllabusWire[] {
  if (Array.isArray(payload)) return payload;
  return [...(payload.items ?? []), ...(payload.lessons ?? [])];
}

export function decodeSyllabus(payload: unknown) {
  return SyllabusSchema.parse(payload);
}

export function normalizeSyllabus(payload: z.infer<typeof SyllabusSchema>) {
  return records(payload).flatMap((record) => {
    const id = record.lessonId ?? record.id;
    if (!id) return [];
    return [{ id, title: record.title ?? record.name ?? '', type: record.type }];
  });
}
