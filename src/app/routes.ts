import type { EchoGateway } from '../domain';
import type { QueryClient } from '@tanstack/react-query';
import type { LightningSettingsStore } from '../features/settings/store';

export type LightningRouterContext = {
  gateway: EchoGateway;
  queryClient: QueryClient;
  onUseOriginal: (url?: string) => void;
  settingsStore?: LightningSettingsStore;
};

export const coursesRoutePath = '/courses' as const;
export const courseDetailsRoutePath = '/courses/$courseId' as const;
export const sectionRoutePath = '/section/$sectionId/home' as const;
export const classroomRoutePath = '/lesson/$lessonId/classroom' as const;
