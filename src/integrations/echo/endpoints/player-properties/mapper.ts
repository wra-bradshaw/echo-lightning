import type { PlayerData, PlayerPropertiesPayload, PlayableMedia } from './schema';

export function normalizePlayerProperties(payload: PlayerPropertiesPayload) {
  const data = ('data' in payload ? payload.data : payload) as PlayerData;
  const playable = data.playableAudioVideo?.playableMedias ?? [];
  const grouped = new Map<string, PlayableMedia[]>();
  for (const media of playable) {
    if (!media.uri) continue;
    const key = String(media.sourceIndex ?? grouped.size);
    grouped.set(key, [...(grouped.get(key) ?? []), media]);
  }
  const videoGroups = [...grouped.values()].filter((group) =>
    group.some((media) => media.trackType?.includes('Video')),
  );
  const sourceGroups = videoGroups.length ? videoGroups : [...grouped.values()];
  const sources = sourceGroups.flatMap((group, index) => {
    const source = [...group].sort(
      (left, right) =>
        Number(right.trackType?.includes('Audio') ?? false) - Number(left.trackType?.includes('Audio') ?? false),
    )[0];
    if (!source?.uri) return [];
    return [
      {
        id: `camera-${index + 1}`,
        label: videoGroups.length ? `Camera ${index + 1}` : `Audio ${index + 1}`,
        src: source.uri,
        type: source.uri.includes('.m3u8') ? 'application/vnd.apple.mpegurl' : undefined,
      },
    ];
  });
  const captions =
    typeof data.captions === 'string'
      ? [{ src: data.captions, kind: 'captions', label: 'English', language: 'en' }]
      : data.captions?.flatMap((value) => {
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
  return {
    mediaId: data.mediaId ?? data.playableAudioVideo?.mediaId,
    ...(data.mediaName ? { mediaName: data.mediaName } : {}),
    ...(data.playableAudioVideo?.duration
      ? { durationSeconds: parseIsoDuration(data.playableAudioVideo.duration) }
      : {}),
    positionSeconds: Math.max(0, data.lastPlayedToSeconds ?? 0),
    sources,
    captions: captions ?? [],
  };
}

function parseIsoDuration(value: string): number | undefined {
  const match = value.match(
    /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
  );
  if (!match) return undefined;
  return (
    Number(match[1] ?? 0) * 86_400 + Number(match[2] ?? 0) * 3_600 + Number(match[3] ?? 0) * 60 + Number(match[4] ?? 0)
  );
}
