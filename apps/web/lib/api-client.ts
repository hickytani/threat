import type {
  AuthSession,
  OrganizationMembership,
  IncidentInvestigationDetail,
  AlertInvestigationDetail,
  IocInvestigationDetail,
  AssetInvestigationDetail,
  PaginatedResponse,
  SecurityEvent,
  TimelineItem,
} from 'shared-types';

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
  if (session.tokens) {
    localStorage.setItem('threatsync-access-token', session.tokens.accessToken);
  }
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
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('threatsync-access-token') : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

// Investigation API Client Layer
function buildQueryString(params: Record<string, any> = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  }
  const str = query.toString();
  return str ? `?${str}` : '';
}

export async function getIncidents(params: Record<string, any> = {}) {
  return apiRequest<any[]>(`/incidents${buildQueryString(params)}`);
}

export async function getIncidentInvestigation(incidentId: string): Promise<IncidentInvestigationDetail> {
  return apiRequest<IncidentInvestigationDetail>(`/incidents/${incidentId}`);
}

export async function getIncidentTimeline(incidentId: string): Promise<TimelineItem[]> {
  return apiRequest<TimelineItem[]>(`/incidents/${incidentId}/timeline`);
}

export async function updateIncidentStatus(incidentId: string, status: string) {
  return apiRequest<any>(`/incidents/${incidentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function addIncidentComment(incidentId: string, content: string) {
  return apiRequest<any>(`/incidents/${incidentId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function getAlerts(params: Record<string, any> = {}) {
  return apiRequest<any[]>(`/alerts${buildQueryString(params)}`);
}

export async function getAlertInvestigation(alertId: string): Promise<AlertInvestigationDetail> {
  return apiRequest<AlertInvestigationDetail>(`/alerts/${alertId}`);
}

export async function searchEvents(params: Record<string, any> = {}): Promise<PaginatedResponse<SecurityEvent>> {
  return apiRequest<PaginatedResponse<SecurityEvent>>(`/events${buildQueryString(params)}`);
}

export async function getIocs(params: Record<string, any> = {}) {
  return apiRequest<any[]>(`/intelligence/iocs${buildQueryString(params)}`);
}

export async function getIocInvestigation(iocId: string): Promise<IocInvestigationDetail> {
  return apiRequest<IocInvestigationDetail>(`/intelligence/iocs/${iocId}`);
}

export async function getAssets(params: Record<string, any> = {}) {
  return apiRequest<any[]>(`/assets${buildQueryString(params)}`);
}

export async function getAssetInvestigation(assetId: string): Promise<AssetInvestigationDetail> {
  return apiRequest<AssetInvestigationDetail>(`/assets/${assetId}`);
}

export async function getAssetTimeline(assetId: string): Promise<TimelineItem[]> {
  return apiRequest<TimelineItem[]>(`/assets/${assetId}/timeline`);
}

export async function getVulnerabilities() {
  return apiRequest<any[]>('/vulnerabilities');
}

export async function getAuditLogs(params: Record<string, any> = {}) {
  return apiRequest<any[]>(`/audit${buildQueryString(params)}`);
}

export async function getSystemHealth() {
  return apiRequest<{
    status: string;
    dependencies?: Record<string, string>;
    timestamp: string;
  }>('/health/dependencies');
}

export async function getIngestionCredentials() {
  return apiRequest<any[]>('/organizations/current/ingestion-credentials');
}

export async function createIngestionCredential(name: string, expiresAt?: string) {
  return apiRequest<any>('/organizations/current/ingestion-credentials', {
    method: 'POST',
    body: JSON.stringify({ name, expiresAt }),
  });
}

export async function revokeIngestionCredential(id: string) {
  return apiRequest<any>(`/organizations/current/ingestion-credentials/${id}`, {
    method: 'DELETE',
  });
}

export async function getDashboardActivity(signal?: AbortSignal) {
  return apiRequest<any[]>('/dashboard/activity', { signal });
}

export async function getDashboardPosture() {
  return apiRequest<any>('/dashboard/posture');
}

export async function getDashboardIngestionMetrics() {
  return apiRequest<any>('/dashboard/ingestion');
}

export async function getAuthMe() {
  return apiRequest<any>('/auth/me');
}

// Rules API Client
export async function getRules(params: Record<string, any> = {}) {
  return apiRequest<any[]>(`/rules${buildQueryString(params)}`);
}

export async function createRule(data: any) {
  return apiRequest<any>('/rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRule(id: string, data: any) {
  return apiRequest<any>(`/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteRule(id: string) {
  return apiRequest<any>(`/rules/${id}`, {
    method: 'DELETE',
  });
}

export async function testRule(matchConditions: Record<string, any>, sampleEvent: Record<string, any>) {
  return apiRequest<any>('/rules/test', {
    method: 'POST',
    body: JSON.stringify({ matchConditions, sampleEvent }),
  });
}

// Integrations API Client
export async function getIntegrations(type?: string) {
  return apiRequest<any[]>(`/integrations${buildQueryString({ type })}`);
}

export async function getIntegrationDetails(id: string) {
  return apiRequest<any>(`/integrations/${id}`);
}

export async function getIntegrationMetrics(id: string) {
  return apiRequest<any>(`/integrations/${id}/metrics`);
}

export async function createIntegration(data: any) {
  return apiRequest<any>('/integrations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateIntegration(id: string, data: any) {
  return apiRequest<any>(`/integrations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function regenerateIntegrationSecret(id: string) {
  return apiRequest<any>(`/integrations/${id}/regenerate-secret`, {
    method: 'POST',
  });
}

export async function revokeIntegrationSecret(id: string) {
  return apiRequest<any>(`/integrations/${id}/revoke-secret`, {
    method: 'POST',
  });
}

export async function testIntegrationEvent(id: string, payload?: any) {
  return apiRequest<any>(`/integrations/${id}/test-event`, {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });
}

export async function deleteIntegration(id: string) {
  return apiRequest<any>(`/integrations/${id}`, {
    method: 'DELETE',
  });
}

// Extended Alert Workflow
export async function updateAlert(alertId: string, data: any) {
  return apiRequest<any>(`/alerts/${alertId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getRelatedAlerts(alertId: string) {
  return apiRequest<any[]>(`/alerts/${alertId}/related`);
}

export async function addAlertComment(alertId: string, content: string) {
  return apiRequest<any>(`/alerts/${alertId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// Notification Engine API Client
export async function getNotificationPolicies() {
  return apiRequest<any[]>('/notifications/policies');
}

export async function createNotificationPolicy(data: any) {
  return apiRequest<any>('/notifications/policies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateNotificationPolicy(id: string, data: any) {
  return apiRequest<any>(`/notifications/policies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteNotificationPolicy(id: string) {
  return apiRequest<any>(`/notifications/policies/${id}`, {
    method: 'DELETE',
  });
}

export async function getNotificationHistory(params: Record<string, any> = {}) {
  return apiRequest<any[]>(`/notifications/history${buildQueryString(params)}`);
}

export async function getOrgMembers() {
  return apiRequest<any[]>('/organizations/current/members');
}
