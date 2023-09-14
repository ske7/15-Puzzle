import { type ErrResponse, type Response } from '../stores/const';
import { useBaseStore } from '../stores/base';

const baseUrl: string = import.meta.env.VITE_BASE_API_URL;

const api = async (endpoint: string, method: string, body?: BodyInit, token?: string): Promise<Response> => {
  const baseStore = useBaseStore();

  let error = null;
  let headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  if (token != null) {
    headers = {
      ...headers, Authorization: `Bearer ${token}`
    };
  }
  try {
    const response = await fetch(`${baseUrl}/${endpoint}`, {
      method,
      headers,
      body
    });
    baseStore.isNetworkError = false;
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) {
        baseStore.token = undefined;
        localStorage.removeItem('token');
        baseStore.userName = null;
      }
      const res = await response.json() as Promise<ErrResponse>;
      error = Error(`${(await res).error ?? response.statusText}`);
    }
    return await (response.json() as Promise<Response>);
  } catch (err) {
    if (String(err).toLowerCase().includes('networkerror')) {
      baseStore.isNetworkError = true;
    }
    if (error == null) {
      throw new Error(err as string);
    } else {
      throw error;
    }
  }
};

export const usePostFetchAPI = async (endpoint: string, body?: BodyInit,
  token?: string): Promise<Response> => {
  return await api(endpoint, 'POST', body, token);
};

export const useGetFetchAPI = async (endpoint: string, token?: string): Promise<Response> => {
  return await api(endpoint, 'GET', undefined, token);
};
