import { type ErrResponse, type Response } from '../stores/const';
import { useBaseStore } from '../stores/base';

const baseUrl: string = import.meta.env.VITE_BASE_API_URL;

const api = async (endpoint: string, method: string, body?: BodyInit, token?: string): Promise<Response> => {
  const baseStore = useBaseStore();

  let headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  if (token) {
    headers = {
      ...headers, Authorization: `Bearer ${token}`
    };
  }
  const response = await fetch(`${baseUrl}/${endpoint}`, {
    method,
    headers,
    body
  });
  baseStore.isNetworkError = false;
  if (!response.ok) {
    if (response.status === 401 || response.status === 404) {
      baseStore.token = null;
      localStorage.removeItem('token');
      baseStore.userName = null;
    }
    const res = await response.json() as Promise<ErrResponse>;
    throw new Error(`${(await res).error ?? response.statusText}`);
  }
  return await (response.json() as Promise<Response>);
};

export const usePostFetchAPI = (endpoint: string, body?: BodyInit, token?: string) => {
  return api(endpoint, 'POST', body, token);
};

export const useGetFetchAPI = (endpoint: string, token?: string) => {
  return api(endpoint, 'GET', undefined, token);
};
