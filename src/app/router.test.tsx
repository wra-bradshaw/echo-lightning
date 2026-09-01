import { RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createLightningRouter } from './router';
import { createLightningHistory } from '../platform/browser/navigation-history';
import { AppProviders, createLightningQueryClient } from './providers';
import { createLightningSettingsStore } from '../features/settings';

function renderRouter(path: string) {
  window.history.replaceState(null, '', path);
  const history = createLightningHistory(window);
  const router = createLightningRouter({
    history,
    gateway: {
      getCourses: vi.fn(),
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
    ['/sections/section%201', 'Section section 1'],
    ['/section/section%201/lesson/lesson%201', 'Lesson lesson 1'],
    ['/classroom/lesson%201', 'Lesson lesson 1'],
  ])('renders the supported Echo alias %s', async (path, heading) => {
    const { history } = renderRouter(path);
    await waitFor(() => expect(screen.getByRole('heading', { name: heading })).toBeVisible());
    history.dispose();
  });

  it('renders the unsupported experience for unknown Echo URLs', async () => {
    const { history } = renderRouter('/unsupported/path');
    await waitFor(() => expect(screen.getByText(/not supported yet/i)).toBeVisible());
    history.dispose();
  });

  it('writes canonical Echo paths for router navigation', async () => {
    const { router, history } = renderRouter('/courses');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Your courses' })).toBeVisible());
    await router.navigate({ to: '/sections/$sectionId', params: { sectionId: 'section 2' } });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Section section 2' })).toBeVisible());
    expect(window.location.pathname).toBe('/sections/section%202');
    history.dispose();
  });

  it('returns home when the Echo360 Lightning branding is clicked', async () => {
    const { history, container } = renderRouter('/sections/section%201');
    await waitFor(() => expect(within(container).getByRole('heading', { name: 'Section section 1' })).toBeVisible());

    await userEvent.click(within(container).getByRole('link', { name: 'Echo360 Lightning' }));

    await waitFor(() => expect(within(container).getByRole('heading', { name: 'Your courses' })).toBeVisible());
    expect(window.location.pathname).toBe('/courses');
    history.dispose();
  });
});
