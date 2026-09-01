import type { CourseSummary, PlayerProperties, SyllabusItem } from './models';

export interface CancellationSignal {
  readonly aborted: boolean;
  addEventListener(type: 'abort', listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: 'abort', listener: () => void): void;
}

export interface OriginalUiPort {
  useOriginal(url?: string): Promise<void>;
}

export interface EchoGateway {
  getCourses(options?: { signal?: CancellationSignal }): Promise<readonly CourseSummary[]>;
  getSectionSyllabus(sectionId: string, options?: { signal?: CancellationSignal }): Promise<readonly SyllabusItem[]>;
  getPlayerProperties(
    contextType: string,
    contextId: string,
    mediaId: string,
    options?: { signal?: CancellationSignal },
  ): Promise<PlayerProperties>;
}
