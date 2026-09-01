export const PAGE_FETCH_REQUEST_EVENT = 'echo-lightning:page-fetch-request';
export const PAGE_FETCH_RESPONSE_EVENT = 'echo-lightning:page-fetch-response';

export type PageFetchRequest = {
  id: string;
  url: string;
  method: string;
  headers: Array<[string, string]>;
  body?: string;
};

export type PageFetchResponse = {
  id: string;
  status: number;
  headers: Array<[string, string]>;
  body: string;
  error?: string;
};
