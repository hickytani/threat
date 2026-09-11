import type { AuthSession, OrganizationMembership } from 'shared-types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export class ApiClientError extends Error {
  status: number;
  details?: unknown;
  requestId?: string;

  constructor(message: string, status: number, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

export function persistSession(session: AuthSession) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('threatsync-session', JSON.stringify(session));
  localStorage.setItem('user', JSON.stringify(session.user));
  localStorage.setItem('memberships', JSON.stringify(session.memberships));
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedSession = localStorage.getItem('threatsync-session');
  if (storedSession) {
    try {
      return JSON.parse(storedSession) as AuthSession;
    } catch {
      localStorage.removeItem('threatsync-session');
    }
  }

  const user = localStorage.getItem('user');
  const memberships = localStorage.getItem('memberships');

  if (!user || !memberships) {
    return null;
  }

  try {
    return {
      user: JSON.parse(user),
      memberships: JSON.parse(memberships),
    } as AuthSession;
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('memberships');
    return null;
  }
}

export function getActiveMembership(): OrganizationMembership | null {
  const session = getStoredSession();
  return session?.memberships?.[0] ?? null;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as any).message)
        : 'Request failed';

    const requestId =
      typeof data === 'object' && data && 'requestId' in data
        ? String((data as any).requestId)
        : undefined;

    throw new ApiClientError(message, response.status, data, requestId);
  }

  return data as T;
}
