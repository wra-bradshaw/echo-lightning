import { z } from 'zod';

const SavePlayerPositionResponseSchema = z.object({ status: z.literal('ok') }).loose();

export function decodeSavePlayerPositionResponse(payload: unknown) {
  return SavePlayerPositionResponseSchema.parse(payload);
}
