export type CourseSummary = {
  id: string;
  title: string;
  institution?: string;
  sectionId: string;
  courseId?: string;
  code?: string;
  term?: string;
  termStart?: string;
  isActive?: boolean;
  lessonCount?: number;
};

export type SyllabusItem = {
  id: string;
  title: string;
  type?: string;
  sectionId?: string;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  media: readonly MediaSummary[];
};

type MediaSummary = {
  id: string;
  title?: string;
  available?: boolean;
  thumbnailUrl?: string;
  audioOnly?: boolean;
};

export type PlayerSource = {
  id: string;
  label: string;
  src: string;
  type?: string;
};

type CaptionTrack = {
  src: string;
  language?: string;
  label?: string;
  kind?: string;
};

export type PlayerProperties = {
  mediaId?: string;
  mediaName?: string;
  durationSeconds?: number;
  positionSeconds: number;
  sources: readonly PlayerSource[];
  captions: readonly CaptionTrack[];
};

export type TranscriptCue = {
  start: number;
  end: number;
  text: string;
};
