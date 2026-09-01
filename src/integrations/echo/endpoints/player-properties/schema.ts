import { z } from 'zod';

const IdSchema = z.union([z.string(), z.number()]).transform(String);
const PlayerPropertiesSchema = z
  .object({
    mediaId: IdSchema.optional(),
    sources: z.array(z.unknown()).optional(),
    captions: z.array(z.unknown()).optional(),
  })
  .passthrough();

export function decodePlayerProperties(payload: unknown) {
  return PlayerPropertiesSchema.parse(payload);
}

export function normalizePlayerProperties(payload: z.infer<typeof PlayerPropertiesSchema>) {
  const sources = payload.sources?.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const src = (value as { src?: unknown }).src;
    if (typeof src !== 'string') return [];
    const type = (value as { type?: unknown }).type;
    return [{ src, ...(typeof type === 'string' ? { type } : {}) }];
  });
  const captions = payload.captions?.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const src = (value as { src?: unknown }).src;
    if (typeof src !== 'string') return [];
    const track = value as { language?: unknown; label?: unknown; kind?: unknown };
    return [
      {
        src,
        ...(typeof track.language === 'string' ? { language: track.language } : {}),
        ...(typeof track.label === 'string' ? { label: track.label } : {}),
        ...(typeof track.kind === 'string' ? { kind: track.kind } : {}),
      },
    ];
  });
  return { mediaId: payload.mediaId, sources: sources ?? [], captions: captions ?? [] };
}
