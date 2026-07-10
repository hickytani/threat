// ThreatSync OS Shared Types and Interfaces

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'SOC_MANAGER'
  | 'SECURITY_ANALYST'
  | 'COMPLIANCE_VIEWER'
  | 'EXECUTIVE_VIEWER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  size?: string;
  industry?: string;
  country?: string;
  timeZone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

// Asset Management
export type AssetType =
  | 'WORKSTATION'
  | 'SERVER'
  | 'VIRTUAL_MACHINE'
  | 'CLOUD_INSTANCE'
  | 'CONTAINER'
  | 'NETWORK_DEVICE'
  | 'DATABASE'
  | 'APPLICATION'
  | 'API'
  | 'USER_IDENTITY'
  | 'SERVICE_ACCOUNT'
  | 'STORAGE_BUCKET';

export type CriticalityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Asset {
  id: string;
  organizationId: string;
  hostname: string;
  displayName: string;
  type: AssetType;
  operatingSystem?: string;
  ipAddress: string;
  macAddress?: string;
  cloudProvider?: string;
  region?: string;
  owner?: string;
  department?: string;
  businessCriticality: CriticalityLevel;
  environment: string; // e.g. PROD, DEV, STAGING
  isInternetFacing: boolean;
  monitoringStatus: 'ACTIVE' | 'OFFLINE' | 'DISCOVERED';
  riskScore: number; // 0 - 100
  tags: string[];
  vulnerabilityCount: number;
  activeAlertCount: number;
  lastObserved: string;
  createdAt: string;
  updatedAt: string;
}

// Alert Management
export type AlertSeverity = 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus =
  | 'NEW'
  | 'INVESTIGATING'
  | 'ESCALATED'
  | 'CONTAINED'
  | 'RESOLVED'
  | 'FALSE_POSITIVE'
  | 'SUPPRESSED';

export type AlertCategory =
  | 'AUTHENTICATION_ANOMALY'
  | 'SUSPICIOUS_NETWORK_ACTIVITY'
  | 'MALWARE_DETECTION'
  | 'PRIVILEGE_ESCALATION'
  | 'DATA_EXFILTRATION'
  | 'VULNERABILITY_EXPLOITATION'
  | 'CLOUD_MISCONFIGURATION'
  | 'ENDPOINT_ANOMALY'
  | 'POLICY_VIOLATION'
  | 'IDENTITY_COMPROMISE'
  | 'THREAT_INTEL_MATCH';

export interface Alert {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  source: string; // e.g. CrowdStrike, AWS GuardDuty, Okta
  detectionRuleId?: string;
  assetId?: string;
  userIdentity?: string;
  ipAddress?: string;
  domain?: string;
  fileHash?: string;
  confidenceScore: number; // 0 - 100
  rawEvent: Record<string, any>;
  assignedAnalystId?: string;
  assignedAnalystName?: string;
  incidentId?: string;
  tags: string[];
  mitreTechniques: string[];
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

// Incident Management
export type IncidentStatus =
  | 'OPEN'
  | 'TRIAGED'
  | 'INVESTIGATING'
  | 'CONTAINMENT_IN_PROGRESS'
  | 'CONTAINED'
  | 'REMEDIATION_IN_PROGRESS'
  | 'MONITORING'
  | 'RESOLVED'
  | 'CLOSED';

export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Incident {
  id: string;
  organizationId: string;
  title: string;
  summary: string;
  severity: AlertSeverity;
  priority: IncidentPriority;
  status: IncidentStatus;
  incidentType: string;
  assignedAnalystId?: string;
  assignedAnalystName?: string;
  assignedTeam?: string;
  detectionTime: string;
  acknowledgedTime?: string;
  containmentTime?: string;
  resolutionTime?: string;
  slaDeadline?: string;
  rootCause?: string;
  impact?: string;
  resolution?: string;
  lessonsLearned?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentTask {
  id: string;
  incidentId: string;
  title: string;
  ownerId?: string;
  ownerName?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  dependencies?: string[];
  completionEvidence?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentComment {
  id: string;
  incidentId: string;
  authorId: string;
  authorName: string;
  content: string;
  isInternalOnly: boolean;
  createdAt: string;
}

export interface Evidence {
  id: string;
  incidentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  uploadedByName: string;
  fileUrl: string;
  status: 'SCANNING' | 'CLEAN' | 'MALICIOUS' | 'FAILED';
  createdAt: string;
}

// Threat Intelligence and IOCs
export type IocType =
  | 'IPV4'
  | 'IPV6'
  | 'DOMAIN'
  | 'URL'
  | 'MD5'
  | 'SHA1'
  | 'SHA256'
  | 'CVE';

export interface IOC {
  id: string;
  organizationId: string;
  value: string;
  type: IocType;
  reputationScore: number; // 0 - 100 (high = malicious)
  label: 'MALICIOUS' | 'SUSPICIOUS' | 'UNKNOWN' | 'BENIGN';
  country?: string;
  asn?: string;
  associatedDomains?: string[];
  associatedFiles?: string[];
  detectionCount: number;
  firstObserved: string;
  lastObserved: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOCEnrichment {
  id: string;
  iocId: string;
  sourceName: string; // e.g. VirusTotal, AbuseIPDB
  queryTime: string;
  confidence: number;
  rawResponse: Record<string, any>;
  cacheAge: number; // in seconds
}

// Vulnerabilities
export interface Vulnerability {
  id: string; // CVE ID e.g. CVE-2021-44228
  title: string;
  description: string;
  cvssScore: number;
  severity: AlertSeverity;
  publishedDate: string;
  modifiedDate: string;
  isKnownExploited: boolean;
  affectedProducts: string[];
  references: string[];
  remediation?: string;
  patchAvailable: boolean;
}

export interface AssetVulnerability {
  id: string;
  assetId: string;
  cveId: string;
  detectionMethod: string;
  status: 'OPEN' | 'REMEDIATED' | 'EXCEPTION' | 'FALSE_POSITIVE';
  exceptionStatus?: string;
  dueDate?: string;
  ownerId?: string;
  remediationNotes?: string;
  firstDetected: string;
  lastDetected: string;
  createdAt: string;
  updatedAt: string;
  vulnerability?: Vulnerability;
}

// Security Events (SIEM-like log store)
export interface SecurityEvent {
  id: string;
  organizationId: string;
  timestamp: string;
  eventType: string;
  source: string;
  assetId?: string;
  userIdentity?: string;
  sourceIp?: string;
  destinationIp?: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'UNKNOWN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metadata: Record<string, any>;
  rawJson: string;
}

// Audit Logging
export interface AuditLog {
  id: string;
  organizationId: string;
  actorId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  requestId: string;
  outcome: 'SUCCESS' | 'FAILURE';
}

// API Payloads
export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId: string;
    details?: any[];
  };
}
