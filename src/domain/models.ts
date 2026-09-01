export type CourseSummary = {
  id: string;
  title: string;
  institution?: string;
};

export type SectionSummary = {
  id: string;
  title: string;
  courseId?: string;
};

export type ClassroomSummary = {
  lessonId: string;
  title: string;
  sectionId?: string;
};

export type SyllabusItem = {
  id: string;
  title: string;
  type?: string;
};

export type PlayerSource = {
  src: string;
  type?: string;
};

export type CaptionTrack = {
  src: string;
  language?: string;
  label?: string;
  kind?: string;
};

export type PlayerProperties = {
  mediaId?: string;
  sources: readonly PlayerSource[];
  captions: readonly CaptionTrack[];
};

export type TranscriptCue = {
  start: number;
  end: number;
  text: string;
};
