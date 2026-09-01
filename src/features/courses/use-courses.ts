import { useQuery } from '@tanstack/react-query';
import type { EchoGateway } from '../../domain';

export function useCourses(gateway: EchoGateway, enabled = true) {
  return useQuery({ queryKey: ['courses'], queryFn: ({ signal }) => gateway.getCourses({ signal }), enabled });
}
