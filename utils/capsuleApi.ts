/**
 * API utility for capsuleworkpods.com
 * Uses session cookies for authentication (credentials: 'include')
 */

const BASE_URL = 'https://capsuleworkpods.com';

async function capsuleFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`[CapsuleAPI] ${options.method ?? 'GET'} ${endpoint}`);

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const json = JSON.parse(text);
      errorMessage = json.error ?? json.message ?? errorMessage;
    } catch {
      errorMessage = text.slice(0, 200) || errorMessage;
    }
    console.error(`[CapsuleAPI] Error ${response.status} on ${endpoint}:`, errorMessage);
    throw new Error(errorMessage);
  }

  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error('[CapsuleAPI] Failed to parse JSON response');
    throw new Error('Invalid JSON response from server');
  }
}

export function capsuleGet<T = unknown>(endpoint: string): Promise<T> {
  return capsuleFetch<T>(endpoint, { method: 'GET' });
}

export function capsulePost<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
  return capsuleFetch<T>(endpoint, {
    method: 'POST',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export function capsulePut<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
  return capsuleFetch<T>(endpoint, {
    method: 'PUT',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export function capsuleDelete<T = unknown>(endpoint: string): Promise<T> {
  return capsuleFetch<T>(endpoint, { method: 'DELETE' });
}
