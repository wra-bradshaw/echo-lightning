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
const MediaSchema = z
  .object({
    id: IdSchema.optional(),
    title: z.string().optional(),
    isAvailable: z.boolean().optional(),
    thumbnailUri: z.string().optional(),
    isAudioOnly: z.boolean().optional(),
  })
  .passthrough();
const LessonMetadataSchema = z
  .object({
    id: IdSchema.optional(),
    sectionId: IdSchema.optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    timing: z.object({ start: z.string().optional(), end: z.string().optional() }).optional(),
  })
  .passthrough();
const LiveSyllabusItemSchema = z
  .object({
    type: z.string().optional(),
    lesson: z.object({ lesson: LessonMetadataSchema, medias: z.array(MediaSchema).optional() }).passthrough(),
  })
  .passthrough();
const SyllabusSchema = z.union([
  z.array(SyllabusItemSchema),
  z
    .object({ items: z.array(SyllabusItemSchema).optional(), lessons: z.array(SyllabusItemSchema).optional() })
    .passthrough(),
  z.object({ data: z.array(LiveSyllabusItemSchema) }).passthrough(),
]);

type SyllabusWire = z.infer<typeof SyllabusItemSchema>;

function records(payload: z.infer<typeof SyllabusSchema>): SyllabusWire[] {
  if (Array.isArray(payload)) return payload;
  if ('data' in payload) {
    const data = payload.data as z.infer<typeof LiveSyllabusItemSchema>[];
    return data.map((record) => {
      const lesson = record.lesson.lesson;
      return {
        id: lesson.id,
        lessonId: lesson.id,
        title: lesson.displayName ?? lesson.name,
        type: record.type,
        sectionId: lesson.sectionId,
        startTime: lesson.timing?.start,
        endTime: lesson.timing?.end,
        medias: record.lesson.medias ?? [],
      } as SyllabusWire;
    });
  }
  return [...(payload.items ?? []), ...(payload.lessons ?? [])];
}

export function decodeSyllabus(payload: unknown) {
  return SyllabusSchema.parse(payload);
}

export function normalizeSyllabus(payload: z.infer<typeof SyllabusSchema>) {
  return records(payload).flatMap((record) => {
    const id = record.lessonId ?? record.id;
    if (!id) return [];
    const media = ((record as SyllabusWire & { medias?: z.infer<typeof MediaSchema>[] }).medias ?? []).flatMap(
      (item) => {
        if (!item.id) return [];
        return [
          {
            id: item.id,
            ...(item.title ? { title: item.title } : {}),
            ...(item.isAvailable !== undefined ? { available: item.isAvailable } : {}),
            ...(item.thumbnailUri ? { thumbnailUrl: item.thumbnailUri } : {}),
            ...(item.isAudioOnly !== undefined ? { audioOnly: item.isAudioOnly } : {}),
          },
        ];
      },
    );
    const startTime = (record as SyllabusWire & { startTime?: string }).startTime;
    const endTime = (record as SyllabusWire & { endTime?: string }).endTime;
    const start = startTime ? Date.parse(startTime) : Number.NaN;
    const end = endTime ? Date.parse(endTime) : Number.NaN;
    const durationSeconds =
      Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, (end - start) / 1000) : undefined;
    return [
      {
        id,
        title: record.title ?? record.name ?? '',
        ...(record.type ? { type: record.type } : {}),
        ...((record as SyllabusWire & { sectionId?: string }).sectionId
          ? { sectionId: (record as SyllabusWire & { sectionId: string }).sectionId }
          : {}),
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
        ...(durationSeconds !== undefined ? { durationSeconds } : {}),
        media,
      },
    ];
  });
}
