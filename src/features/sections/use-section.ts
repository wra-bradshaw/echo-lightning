import { useQuery } from '@tanstack/react-query';
import type { EchoGateway } from '../../domain';

export function useSectionSyllabus(gateway: EchoGateway, sectionId: string, enabled = Boolean(sectionId)) {
  return useQuery({
    queryKey: ['section', sectionId, 'syllabus'],
    queryFn: ({ signal }) => gateway.getSectionSyllabus(sectionId, { signal }),
    enabled,
  });
}
