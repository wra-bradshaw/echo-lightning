import type { CourseSummary, PlayerProperties, SyllabusItem } from './models';

export interface EchoGateway {
  getCourses(options?: { signal?: AbortSignal }): Promise<readonly CourseSummary[]>;
  getSectionSyllabus(sectionId: string, options?: { signal?: AbortSignal }): Promise<readonly SyllabusItem[]>;
  getPlayerProperties(
    contextType: string,
    contextId: string,
    mediaId: string,
    options?: { signal?: AbortSignal },
  ): Promise<PlayerProperties>;
  savePlayerPosition(mediaId: string, seconds: number, options?: { keepalive?: boolean }): Promise<void>;
}
