import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CourseSummary } from '../domain';
import { createLightningRouter } from './router';
import { createLightningHistory } from '../platform/browser/navigation-history';
import { AppProviders, createLightningQueryClient } from './providers';
import { createLightningSettingsStore } from '../features/settings';

function renderRouter(path: string, courses: readonly CourseSummary[] = []) {
  window.history.replaceState(null, '', path);
  const history = createLightningHistory(window);
  const router = createLightningRouter({
    history,
    gateway: {
      getCourses: vi.fn().mockResolvedValue(courses),
      getSectionSyllabus: vi.fn(),
      getPlayerProperties: vi.fn(),
      savePlayerPosition: vi.fn(),
    },
    queryClient: createLightningQueryClient(),
    onUseOriginal: vi.fn(),
  });
  const root = document.createElement('div');
  const rendered = render(
    <AppProviders
      root={root}
      queryClient={router.options.context.queryClient}
      settingsStore={createLightningSettingsStore()}
    >
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, history, container: rendered.container };
}

describe('Lightning router', () => {
  it.each([
    ['/home', 'Your courses'],
    ['/course/course%201', 'Course course 1'],
    ['/sections/section%201', 'Course recordings'],
    ['/section/section%201/lesson/lesson%201', 'Lesson lesson 1'],
    ['/classroom/lesson%201', 'Lesson lesson 1'],
  ])('renders the supported Echo alias %s', async (path, heading) => {
    const { history, container } = renderRouter(path);
    await waitFor(() => expect(within(container).getByRole('heading', { name: heading })).toBeVisible());
    history.dispose();
  });

  it('renders the matching course name for a section', async () => {
    const { history, container } = renderRouter('/sections/section%201', [
      { id: 'course-1', sectionId: 'section 1', title: 'Design of Algorithms' },
    ]);

    await waitFor(() => expect(within(container).getByRole('heading', { name: 'Design of Algorithms' })).toBeVisible());
    history.dispose();
  });

  it('uses a neutral heading when no course matches the section', async () => {
    const { history, container } = renderRouter('/sections/missing-section', [
      { id: 'course-1', sectionId: 'section 1', title: 'Design of Algorithms' },
    ]);

    await waitFor(() => expect(within(container).getByRole('heading', { name: 'Course recordings' })).toBeVisible());
    expect(within(container).queryByRole('heading', { name: 'Section missing-section' })).not.toBeInTheDocument();
    history.dispose();
  });

  it('renders the unsupported experience for unknown Echo URLs', async () => {
    const { history } = renderRouter('/unsupported/path');
    await waitFor(() => expect(screen.getByText(/not supported yet/i)).toBeVisible());
    history.dispose();
  });

  it('writes canonical Echo paths for router navigation', async () => {
    const { router, history, container } = renderRouter('/courses');
    await waitFor(() => expect(within(container).getByRole('heading', { name: 'Your courses' })).toBeVisible());
    await router.navigate({ to: '/sections/$sectionId', params: { sectionId: 'section 2' } });
    await waitFor(() => expect(within(container).getByRole('heading', { name: 'Course recordings' })).toBeVisible());
    expect(window.location.pathname).toBe('/sections/section%202');
    history.dispose();
  });

  it('returns home when the Echo360 Lightning branding is clicked', async () => {
    const { history, container } = renderRouter('/sections/section%201');
    await waitFor(() => expect(within(container).getByRole('heading', { name: 'Course recordings' })).toBeVisible());

    await userEvent.click(within(container).getByRole('link', { name: 'Echo360 Lightning' }));

    await waitFor(() => expect(within(container).getByRole('heading', { name: 'Your courses' })).toBeVisible());
    expect(window.location.pathname).toBe('/courses');
    history.dispose();
  });
});
