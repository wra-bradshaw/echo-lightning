import { z } from 'zod';
import { IdSchema } from '../shared/schema';

const PlayableMediaSchema = z
  .object({
    sourceIndex: z.union([z.number(), z.string()]).optional(),
    trackType: z.array(z.string()).optional(),
    uri: z.string().optional(),
  })
  .passthrough();
const PlayerDataSchema = z
  .object({
    mediaId: IdSchema.optional(),
    mediaName: z.string().optional(),
    captions: z.union([z.string(), z.array(z.unknown())]).optional(),
    lastPlayedToSeconds: z.number().optional(),
    playableAudioVideo: z
      .object({
        duration: z.string().optional(),
        mediaId: IdSchema.optional(),
        playableMedias: z.array(PlayableMediaSchema).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
const PlayerPropertiesSchema = z.union([PlayerDataSchema, z.object({ data: PlayerDataSchema }).passthrough()]);

export type PlayerPropertiesPayload = z.infer<typeof PlayerPropertiesSchema>;
export type PlayerData = z.infer<typeof PlayerDataSchema>;
export type PlayableMedia = z.infer<typeof PlayableMediaSchema>;

export function decodePlayerProperties(payload: unknown): PlayerPropertiesPayload {
  return PlayerPropertiesSchema.parse(payload);
}
