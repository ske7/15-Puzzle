import { type ErrResponse, type Response, type UserRecord, type UserStats } from '@/types';
import { useBaseStore } from '../stores/base';

const baseUrl: string = import.meta.env.VITE_BASE_API_URL;

export class ServerError extends Error {}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const api = async <TStats = UserStats, TRecord = UserRecord>(endpoint: string, method: string, body?: BodyInit,
  token?: string, keyH?: string): Promise<Response<TStats, TRecord>> => {
  const baseStore = useBaseStore();

  let error;
  let headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  if (token != null) {
    headers = {
      ...headers, Authorization: `Bearer ${token}`
    };
  }
  if (keyH != null) {
    headers = {
      ...headers,
      'Request-xkh': keyH,
      ts: Date.now().toString()
    };
  }
  try {
    const response = await fetch(`${baseUrl}/${endpoint}`, {
      method,
      headers,
      body
    });
    baseStore.isNetworkError = false;
    baseStore.lastError = '';
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) {
        baseStore.token = undefined;
        localStorage.removeItem('token');
        baseStore.userName = undefined;
      }
      const res = await response.json() as Promise<ErrResponse>;
      error = new ServerError((await res).error ?? response.statusText);
      throw error;
    }
    return await (response.json() as Promise<Response<TStats, TRecord>>);
  } catch (err) {
    if (String(err).toLowerCase().includes('networkerror')) {
      baseStore.isNetworkError = true;
    }
    if (error == null) {
      throw err instanceof Error ? err : new Error(String(err), { cause: err });
    } else {
      throw error;
    }
  }
};

export const usePostFetchAPI = async <TStats = UserStats>(endpoint: string, body?: BodyInit,
  token?: string, keyH?: string): Promise<Response<TStats>> => {
  return await api<TStats>(endpoint, 'POST', body, token, keyH);
};

export const useGetFetchAPI = async <TStats = UserStats, TRecord = UserRecord>(
  endpoint: string, token?: string): Promise<Response<TStats, TRecord>> => {
  return await api<TStats, TRecord>(endpoint, 'GET', undefined, token);
};

export const usePatchFetchAPI = async <TStats = UserStats>(endpoint: string, body?: BodyInit,
  token?: string, keyH?: string): Promise<Response<TStats>> => {
  return await api<TStats>(endpoint, 'PATCH', body, token, keyH);
};
