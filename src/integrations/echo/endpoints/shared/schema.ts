import { z } from 'zod';

export const IdSchema = z.union([z.string(), z.number()]).transform(String);
