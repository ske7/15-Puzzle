import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBaseStore } from '../../stores/base';
import { getErrorMessage, ServerError, useGetFetchAPI, usePatchFetchAPI, usePostFetchAPI } from '../useFetchAPI';

function okResponse(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    json: () => Promise.resolve(body),
  };
}

function errResponse(status: number, body: unknown = { status: 'error', error: 'boom' }) {
  return {
    ok: false,
    status,
    statusText: 'Bad Request',
    json: () => Promise.resolve(body),
  };
}

describe('useFetchAPI', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('useGetFetchAPI issues a plain GET with only the standard headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 0 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await useGetFetchAPI('ping');
    expect(result).toEqual({ status: 'ok', game_id: 0 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/ping');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Accept: 'application/json' });
    expect(init.body).toBeUndefined();
  });

  it('adds an Authorization header when a token is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 0 }));
    vi.stubGlobal('fetch', fetchMock);
    await useGetFetchAPI('secure', 'my-token');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token');
  });

  it('usePostFetchAPI sends the body, method, and a signing header when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await usePostFetchAPI('game', '{"a":1}', 'tok', 'signed-key');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    const headers = init.headers as Record<string, string>;
    expect(headers['Request-xkh']).toBe('signed-key');
    expect(headers['ts']).toBeDefined();
  });

  it('usePatchFetchAPI sends a PATCH request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'ok', game_id: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await usePatchFetchAPI('game', '{"a":1}', 'tok');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PATCH');
  });

  it('clears the stored token and username on a 401 response', async () => {
    localStorage.setItem('token', 'stale');
    const store = useBaseStore();
    store.token = 'stale';
    store.userName = 'someone';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errResponse(401)));
    await expect(useGetFetchAPI('secure', 'stale')).rejects.toThrow('boom');
    expect(store.token).toBeUndefined();
    expect(store.userName).toBeUndefined();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('clears the stored token and username on a 404 response', async () => {
    const store = useBaseStore();
    store.token = 'stale';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errResponse(404)));
    await expect(useGetFetchAPI('missing', 'stale')).rejects.toThrow();
    expect(store.token).toBeUndefined();
  });

  it('does not clear the token on other error statuses', async () => {
    const store = useBaseStore();
    store.token = 'still-valid';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errResponse(500)));
    await expect(useGetFetchAPI('broken', 'still-valid')).rejects.toThrow('boom');
    expect(store.token).toBe('still-valid');
  });

  it('marks an error the server answered with as a ServerError, unlike a failed connection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errResponse(400, { status: 'error', error: 'Wrong public_id' })));
    await expect(useGetFetchAPI('user_scramble?public_id=k1bz8cogliwgy', 'tok')).rejects.toThrow(ServerError);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(useGetFetchAPI('user_scramble?public_id=k1bz8cogliwgy', 'tok')).rejects.not.toThrow(ServerError);
  });

  it('falls back to statusText when the error body has no error field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errResponse(500, { status: 'error' })));
    await expect(useGetFetchAPI('broken')).rejects.toThrow('Bad Request');
  });

  it('flags a network error and rethrows when fetch itself rejects with one', async () => {
    const store = useBaseStore();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('NetworkError when attempting to fetch resource')));
    await expect(useGetFetchAPI('unreachable')).rejects.toThrow();
    expect(store.isNetworkError).toBe(true);
  });

  it('does not flag a network error for an unrelated rejection', async () => {
    const store = useBaseStore();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('something else broke')));
    await expect(useGetFetchAPI('broken')).rejects.toThrow('something else broke');
    expect(store.isNetworkError).toBe(false);
  });

  it('wraps a non-Error rejection (e.g. fetch rejecting with a plain string) in a real Error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('plain string rejection'));
    await expect(useGetFetchAPI('broken')).rejects.toThrow('plain string rejection');
  });

  describe('getErrorMessage', () => {
    it('returns the message of a real Error', () => {
      expect(getErrorMessage(new Error('boom'))).toBe('boom');
    });

    it('stringifies a non-Error value', () => {
      expect(getErrorMessage('plain string')).toBe('plain string');
      expect(getErrorMessage(404)).toBe('404');
    });
  });
});
