import { describe, expect, it } from 'vitest';
import { decodeSyllabus } from './schema';
import { normalizeSyllabus } from './mapper';

describe('syllabus schema', () => {
  it('normalizes nested lessons and media metadata', () => {
    const payload = decodeSyllabus({
      status: 'ok',
      data: [
        {
          type: 'SyllabusLessonType',
          lesson: {
            lesson: {
              id: 'lesson-1',
              sectionId: 'section-1',
              displayName: 'Week 1 lecture',
              timing: { start: '2026-03-03T15:05:00.000', end: '2026-03-03T16:00:00.000' },
            },
            medias: [
              {
                id: 'media-1',
                title: 'Week 1 lecture',
                isAvailable: true,
                thumbnailUri: 'https://example.com/poster.jpg',
                isAudioOnly: false,
              },
            ],
          },
        },
      ],
    });

    expect(normalizeSyllabus(payload)).toEqual([
      {
        id: 'lesson-1',
        title: 'Week 1 lecture',
        type: 'SyllabusLessonType',
        sectionId: 'section-1',
        startTime: '2026-03-03T15:05:00.000',
        endTime: '2026-03-03T16:00:00.000',
        durationSeconds: 3300,
        media: [
          {
            id: 'media-1',
            title: 'Week 1 lecture',
            available: true,
            thumbnailUrl: 'https://example.com/poster.jpg',
            audioOnly: false,
          },
        ],
      },
    ]);
  });
});
