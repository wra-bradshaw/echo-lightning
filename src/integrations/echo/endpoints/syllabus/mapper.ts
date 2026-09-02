import type { LiveSyllabusWire, MediaWire, SyllabusPayload, SyllabusWire } from './schema';

function records(payload: SyllabusPayload): SyllabusWire[] {
  if (Array.isArray(payload)) return payload;
  if ('data' in payload) {
    const data = payload.data as LiveSyllabusWire[];
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

export function normalizeSyllabus(payload: SyllabusPayload) {
  return records(payload).flatMap((record) => {
    const id = record.lessonId ?? record.id;
    if (!id) return [];
    const media = ((record as SyllabusWire & { medias?: MediaWire[] }).medias ?? []).flatMap((item) => {
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
    });
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
