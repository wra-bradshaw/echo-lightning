import { describe, expect, it } from 'vitest';
import { decodeEnrollments, normalizeEnrollments } from './schema';

describe('enrollment schema', () => {
  it('normalizes live Echo sections with active term metadata', () => {
    const payload = decodeEnrollments({
      status: 'ok',
      data: [
        {
          userSections: [
            {
              sectionId: 'section-1',
              sectionName: 'COMP20007_2026_SM1',
              courseId: 'course-1',
              courseCode: 'COMP20007',
              courseName: 'Design of Algorithms',
              lessonCount: 25,
              termId: 'term-1',
            },
          ],
          termsById: {
            'term-1': { id: 'term-1', name: '2026_SM1', startDate: '2026-01-01', isActiveOrFuture: true },
          },
        },
      ],
    });

    expect(normalizeEnrollments(payload)).toEqual([
      {
        id: 'section-1',
        sectionId: 'section-1',
        courseId: 'course-1',
        code: 'COMP20007',
        title: 'Design of Algorithms',
        institution: 'COMP20007_2026_SM1',
        term: '2026_SM1',
        termStart: '2026-01-01',
        isActive: true,
        lessonCount: 25,
      },
    ]);
  });
});
