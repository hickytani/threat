import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import bcrypt from 'bcryptjs';
import { AlertSeverity, IncidentStatus, AssetType, AssetCriticality, Environment } from '@prisma/client';

@Injectable()
export class SeederService {
  constructor(private prisma: PrismaService) {}

  async seedOrganization(organizationId: string) {
    // Check if we have already seeded this organization
    const assetCount = await this.prisma.asset.count({
      where: { organizationId },
    });

    if (assetCount > 0) {
      return { message: 'Organization already populated with data.' };
    }

    const passwordHash = await bcrypt.hash('ThreatSyncSecured2026!', 12);

    // 1. Seed 5 Team Members
    const analysts = [
      { email: 'sarah.analyst@threatsync.local', name: 'Sarah Connor', role: 'SECURITY_ANALYST' },
      { email: 'john.analyst@threatsync.local', name: 'John Doe', role: 'SECURITY_ANALYST' },
      { email: 'marcus.manager@threatsync.local', name: 'Marcus Aurelius', role: 'SOC_MANAGER' },
      { email: 'clara.compliance@threatsync.local', name: 'Clara Barton', role: 'COMPLIANCE_VIEWER' },
      { email: 'elena.executive@threatsync.local', name: 'Elena Rostova', role: 'EXECUTIVE_VIEWER' },
    ];

    const seededMembers = [];
    for (const analyst of analysts) {
      let user = await this.prisma.user.findUnique({
        where: { email: analyst.email },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: analyst.email,
            fullName: analyst.name,
            passwordHash,
          },
        });
      }

      const member = await this.prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
        update: { role: analyst.role as any },
        create: {
          organizationId,
          userId: user.id,
          role: analyst.role as any,
        },
        include: {
          user: true,
        },
      });
      seededMembers.push(member);
    }

    const analyst1 = seededMembers[0];

    // 2. Seed Vulnerability Catalog (Global)
    const vulnerabilities = [
      {
        id: 'CVE-2021-44228',
        title: 'Apache Log4j2 Remote Code Execution (Log4Shell)',
        description: 'Apache Log4j2 <=2.14.1 JNDI features used in configuration, log messages, and parameters do not protect against attacker-controlled LDAP and other JNDI endpoints.',
        cvssScore: 10.0,
        severity: AlertSeverity.CRITICAL,
        publishedDate: new Date('2021-12-10'),
        modifiedDate: new Date('2021-12-28'),
        isKnownExploited: true,
        affectedProducts: ['Apache Log4j2 2.0-beta9 to 2.14.1'] as any,
        references: ['https://nvd.nist.gov/vuln/detail/CVE-2021-44228'] as any,
        remediation: 'Upgrade Apache Log4j2 to 2.15.0 or higher, or set log4j2.formatMsgNoLookups=true.',
        patchAvailable: true,
      },
      {
        id: 'CVE-2023-3519',
        title: 'Citrix NetScaler ADC and Gateway Remote Code Execution',
        description: 'Unauthenticated remote code execution vulnerability on Citrix NetScaler ADC and Gateway config interface.',
        cvssScore: 9.8,
        severity: AlertSeverity.CRITICAL,
        publishedDate: new Date('2023-07-18'),
        modifiedDate: new Date('2023-08-05'),
        isKnownExploited: true,
        affectedProducts: ['Citrix NetScaler Gateway < 13.1-49.13'] as any,
        references: ['https://support.citrix.com/article/CTX561480'] as any,
        remediation: 'Install vendor-provided security firmware update immediately.',
        patchAvailable: true,
      },
      {
        id: 'CVE-2024-21626',
        title: 'runc Container Breakout Vulnerability',
        description: 'runc through 1.1.11 allows attackers to cause a container breakout and gain administrative host command execution.',
        cvssScore: 8.6,
        severity: AlertSeverity.HIGH,
        publishedDate: new Date('2024-01-31'),
        modifiedDate: new Date('2024-02-15'),
        isKnownExploited: false,
        affectedProducts: ['runc <= 1.1.11'] as any,
        references: ['https://github.com/opencontainers/runc/security/advisories/GHSA-xr7r-f8xq-vx54'] as any,
        remediation: 'Update runc tool to version 1.1.12 or later.',
        patchAvailable: true,
      },
    ];

    for (const vuln of vulnerabilities) {
      await this.prisma.vulnerability.upsert({
        where: { id: vuln.id },
        update: vuln,
        create: vuln,
      });
    }

    // 3. Seed 50 Assets
    const assetsData = [
      { hostname: 'dc-01.threatsync.local', displayName: 'Active Directory Domain Controller', type: AssetType.SERVER, ipAddress: '192.0.2.10', criticality: AssetCriticality.CRITICAL, env: Environment.PROD, isInternet: false },
      { hostname: 'db-prod-01', displayName: 'Production PostgreSQL Cluster', type: AssetType.DATABASE, ipAddress: '192.0.2.20', criticality: AssetCriticality.CRITICAL, env: Environment.PROD, isInternet: false },
      { hostname: 'web-gateway-01', displayName: 'Corporate Public Reverse Proxy', type: AssetType.API, ipAddress: '203.0.113.15', criticality: AssetCriticality.HIGH, env: Environment.PROD, isInternet: true },
      { hostname: 'user-auth-api', displayName: 'OAuth Identity API Microservice', type: AssetType.API, ipAddress: '192.0.2.35', criticality: AssetCriticality.HIGH, env: Environment.PROD, isInternet: false },
      { hostname: 'saas-salesforce-sync', displayName: 'Salesforce ETL Pipeline Worker', type: AssetType.APPLICATION, ipAddress: '192.0.2.80', criticality: AssetCriticality.MEDIUM, env: Environment.DEV, isInternet: true },
      { hostname: 'backup-vault-01', displayName: 'Offline Archive Storage Vault', type: AssetType.SERVER, ipAddress: '192.0.2.222', criticality: AssetCriticality.CRITICAL, env: Environment.PROD, isInternet: false },
      { hostname: 'k8s-node-01', displayName: 'Kubernetes Workload Node 01', type: AssetType.CLOUD_INSTANCE, ipAddress: '192.0.2.51', criticality: AssetCriticality.HIGH, env: Environment.PROD, isInternet: false },
      { hostname: 'k8s-node-02', displayName: 'Kubernetes Workload Node 02', type: AssetType.CLOUD_INSTANCE, ipAddress: '192.0.2.52', criticality: AssetCriticality.MEDIUM, env: Environment.PROD, isInternet: false },
      { hostname: 'user-win10-01', displayName: 'Developer Workstation', type: AssetType.WORKSTATION, ipAddress: '192.0.2.101', criticality: AssetCriticality.LOW, env: Environment.DEV, isInternet: false },
      { hostname: 'user-mac-02', displayName: 'HR Manager Laptop', type: AssetType.WORKSTATION, ipAddress: '192.0.2.102', criticality: AssetCriticality.LOW, env: Environment.PROD, isInternet: false },
      { hostname: 'user-win10-03', displayName: 'Finance Specialist Desktop', type: AssetType.WORKSTATION, ipAddress: '192.0.2.103', criticality: AssetCriticality.MEDIUM, env: Environment.PROD, isInternet: false },
      { hostname: 'okta-idp-threatsync', displayName: 'Okta Identity Provider Tenant', type: AssetType.APPLICATION, ipAddress: '203.0.113.88', criticality: AssetCriticality.CRITICAL, env: Environment.PROD, isInternet: true },
    ];

    const seededAssets = [];
    for (const item of assetsData) {
      const asset = await this.prisma.asset.create({
        data: {
          organizationId,
          hostname: item.hostname,
          displayName: item.displayName,
          type: item.type,
          ipAddress: item.ipAddress,
          businessCriticality: item.criticality,
          environment: item.env,
          isInternetFacing: item.isInternet,
          monitoringStatus: 'ACTIVE',
          riskScore: item.criticality === AssetCriticality.CRITICAL ? 82.5 : item.criticality === AssetCriticality.HIGH ? 64.0 : 35.0,
          tags: ['Seeded', item.env, item.type] as any,
        },
      });
      seededAssets.push(asset);
    }

    // Generate remaining 38 dummy assets to reach the 50 assets target
    for (let i = 13; i <= 50; i++) {
      const isWorkstation = i % 2 === 0;
      const type = isWorkstation ? AssetType.WORKSTATION : AssetType.CLOUD_INSTANCE;
      const criticality = isWorkstation ? AssetCriticality.LOW : AssetCriticality.MEDIUM;
      const hostname = `host-node-${i}.threatsync.local`;

      const asset = await this.prisma.asset.create({
        data: {
          organizationId,
          hostname,
          displayName: `Workload Asset Node ${i}`,
          type,
          ipAddress: `192.0.2.${100 + i}`,
          businessCriticality: criticality,
          environment: Environment.DEV,
          isInternetFacing: false,
          monitoringStatus: i % 15 === 0 ? 'OFFLINE' : 'ACTIVE',
          riskScore: Math.random() * 45,
          tags: ['AutoDiscover', 'DEV'] as any,
        },
      });
      seededAssets.push(asset);
    }

    // 4. Map Vulnerabilities to Assets
    await this.prisma.assetVulnerability.createMany({
      data: [
        {
          assetId: seededAssets[0].id, // dc-01
          cveId: 'CVE-2021-44228',
          detectionMethod: 'Qualys Scan Agent',
          status: 'OPEN',
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
          firstDetected: new Date('2026-06-01'),
        },
        {
          assetId: seededAssets[2].id, // web-gateway
          cveId: 'CVE-2023-3519',
          detectionMethod: 'Tenable Nessus Network Scanner',
          status: 'OPEN',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          firstDetected: new Date('2026-07-01'),
        },
        {
          assetId: seededAssets[6].id, // k8s-node-01
          cveId: 'CVE-2024-21626',
          detectionMethod: 'Prisma Cloud Defender',
          status: 'OPEN',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          firstDetected: new Date('2026-07-05'),
        },
      ],
    });

    // Increment vulnerability counts on target assets
    await this.prisma.asset.update({ where: { id: seededAssets[0].id }, data: { vulnerabilityCount: { increment: 1 } } });
    await this.prisma.asset.update({ where: { id: seededAssets[2].id }, data: { vulnerabilityCount: { increment: 1 } } });
    await this.prisma.asset.update({ where: { id: seededAssets[6].id }, data: { vulnerabilityCount: { increment: 1 } } });

    // 5. Seed 12 Incidents
    const incidentsData = [
      { title: 'Critical Active Directory Domain Administrator Privilege Escalation', severity: AlertSeverity.CRITICAL, priority: AlertSeverity.CRITICAL, status: IncidentStatus.INVESTIGATING, type: 'PRIVILEGE_ESCALATION', analystId: analyst1.id, analystName: analyst1.user?.fullName || 'Sarah Connor' },
      { title: 'Suspicious outbound command shell execution from SQL Database Cluster', severity: AlertSeverity.CRITICAL, priority: AlertSeverity.HIGH, status: IncidentStatus.OPEN, type: 'DATA_EXFILTRATION', analystId: undefined, analystName: undefined },
      { title: 'Citrix NetScaler Gateway RCE exploitation attempt detected', severity: AlertSeverity.HIGH, priority: AlertSeverity.HIGH, status: IncidentStatus.TRIAGED, type: 'VULNERABILITY_EXPLOITATION', analystId: analyst1.id, analystName: analyst1.user?.fullName || 'Sarah Connor' },
      { title: 'S3 Bucket policy public read permission manual modification override', severity: AlertSeverity.MEDIUM, priority: AlertSeverity.MEDIUM, status: IncidentStatus.CONTAINED, type: 'CLOUD_MISCONFIGURATION', analystId: analyst1.id, analystName: analyst1.user?.fullName || 'Sarah Connor' },
      { title: 'AWS CloudTrail root console initialization anomaly', severity: AlertSeverity.HIGH, priority: AlertSeverity.MEDIUM, status: IncidentStatus.OPEN, type: 'IDENTITY_COMPROMISE', analystId: undefined, analystName: undefined },
      { title: 'DNS beaconing matches known malware command and control telemetry', severity: AlertSeverity.MEDIUM, priority: AlertSeverity.MEDIUM, status: IncidentStatus.CLOSED, type: 'THREAT_INTEL_MATCH', analystId: analyst1.id, analystName: analyst1.user?.fullName || 'Sarah Connor' },
    ];

    const seededIncidents = [];
    for (const item of incidentsData) {
      const inc = await this.prisma.incident.create({
        data: {
          organizationId,
          title: item.title,
          summary: `Demo incident summary tracking details for ${item.title}.`,
          severity: item.severity,
          priority: item.priority,
          status: item.status,
          incidentType: item.type,
          assignedAnalystId: item.analystId,
          assignedAnalystName: item.analystName,
          detectionTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours SLA
          tags: ['Seeded', item.type] as any,
        },
      });
      seededIncidents.push(inc);
    }

    // Add remaining 6 incidents to satisfy the 12 incidents target
    for (let j = 7; j <= 12; j++) {
      const inc = await this.prisma.incident.create({
        data: {
          organizationId,
          title: `Simulated Security Incident #${j}`,
          summary: 'Simulated low-severity log auditing alerts combined for security monitoring testing.',
          severity: AlertSeverity.LOW,
          priority: AlertSeverity.LOW,
          status: IncidentStatus.RESOLVED,
          incidentType: 'POLICY_VIOLATION',
          assignedAnalystId: analyst1.id,
          assignedAnalystName: analyst1.user?.fullName,
          detectionTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          resolutionTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          tags: ['Simulated'] as any,
        },
      });
      seededIncidents.push(inc);
    }

    // 6. Seed 150 Alerts and map them to Incidents
    const alertsConfig = [
      { title: 'Failed administrator kerberos ticket request', category: 'AUTHENTICATION_ANOMALY', severity: AlertSeverity.HIGH, assetIdx: 0, incIdx: 0 },
      { title: 'Brute-force password attempts on domain user accounts', category: 'AUTHENTICATION_ANOMALY', severity: AlertSeverity.MEDIUM, assetIdx: 0, incIdx: 0 },
      { title: 'SQL Server process spawned cmd.exe command shell', category: 'ENDPOINT_ANOMALY', severity: AlertSeverity.CRITICAL, assetIdx: 1, incIdx: 1 },
      { title: 'Database outbound transfer spike to unknown destination', category: 'DATA_EXFILTRATION', severity: AlertSeverity.HIGH, assetIdx: 1, incIdx: 1 },
      { title: 'Web Gateway ingress request matches Citrix CVE exploit payload', category: 'VULNERABILITY_EXPLOITATION', severity: AlertSeverity.HIGH, assetIdx: 2, incIdx: 2 },
      { title: 'S3 Access Policy public read enabled manually via AWS CLI', category: 'CLOUD_MISCONFIGURATION', severity: AlertSeverity.MEDIUM, assetIdx: 3, incIdx: 3 },
      { title: 'AWS CloudTrail Root Session initialized outside corporate boundary', category: 'IDENTITY_COMPROMISE', severity: AlertSeverity.HIGH, assetIdx: 9, incIdx: 4 },
      { title: 'DNS Resolution of Cobalt Strike Beaconing hostname', category: 'THREAT_INTEL_MATCH', severity: AlertSeverity.MEDIUM, assetIdx: 2, incIdx: 5 },
    ];

    const seededAlerts = [];
    for (const [index, alertItem] of alertsConfig.entries()) {
      const asset = seededAssets[alertItem.assetIdx];
      const incident = seededIncidents[alertItem.incIdx];

      const alert = await this.prisma.alert.create({
        data: {
          organizationId,
          title: alertItem.title,
          description: `Simulated detection alert from defensive sensors tracking ${alertItem.title} activities.`,
          severity: alertItem.severity,
          status: 'INVESTIGATING',
          category: alertItem.category,
          source: alertItem.category === 'AUTHENTICATION_ANOMALY' ? 'Okta' : 'CrowdStrike',
          assetId: asset.id,
          ipAddress: asset.ipAddress,
          confidenceScore: 85.0,
          rawEvent: {
            eventId: `evt_${index}`,
            sensorName: 'SensorAgent',
            hostname: asset.hostname,
            ip: asset.ipAddress,
            matchedRules: [alertItem.title],
          } as any,
          incidentId: incident.id,
          assignedAnalystId: analyst1.id,
          assignedAnalystName: analyst1.user?.fullName,
          tags: ['ProductionSensor'] as any,
        },
      });
      seededAlerts.push(alert);
      
      // Increment active alert count on the asset
      await this.prisma.asset.update({
        where: { id: asset.id },
        data: { activeAlertCount: { increment: 1 } },
      });
    }

    // Generate up to 150 alerts in a loop to fulfill the 150 alerts requirement
    for (let k = seededAlerts.length + 1; k <= 150; k++) {
      const asset = seededAssets[k % seededAssets.length];
      const severity = k % 20 === 0 ? AlertSeverity.CRITICAL : k % 10 === 0 ? AlertSeverity.HIGH : k % 3 === 0 ? AlertSeverity.MEDIUM : AlertSeverity.LOW;
      
      await this.prisma.alert.create({
        data: {
          organizationId,
          title: `Autonomous Sensor Detection #${k}`,
          description: `Continuous scanning detected anomalous background behaviour #${k} on ${asset.hostname}.`,
          severity,
          status: 'RESOLVED',
          category: 'POLICY_VIOLATION',
          source: 'DefenderEndpoint',
          assetId: asset.id,
          ipAddress: asset.ipAddress,
          confidenceScore: 40.0 + Math.random() * 40,
          rawEvent: {
            eventId: `evt_auto_${k}`,
            payloadCheck: `Anomalous thread index ${k}`,
            ip: asset.ipAddress,
          } as any,
          tags: ['AutomatedAudit'] as any,
        },
      });
    }

    // 7. Seed 25 Intelligence IOCs
    const iocsData = [
      { value: '198.51.100.99', type: 'IPV4', score: 85, label: 'MALICIOUS', country: 'RU', notes: 'Known C2 server active in Cobalt Strike campaigns.' },
      { value: '203.0.113.111', type: 'IPV4', score: 65, label: 'SUSPICIOUS', country: 'CN', notes: 'Scanning activity targeting Citrix NetScaler gateways.' },
      { value: 'malware-command-control.net', type: 'DOMAIN', score: 95, label: 'MALICIOUS', notes: 'Domain referenced in ransomware distribution payloads.' },
      { value: 'd41d8cd98f00b204e9800998ecf8427e', type: 'MD5', score: 100, label: 'MALICIOUS', notes: 'Zero-byte empty file hash payload match.' },
    ];

    for (const [idx, item] of iocsData.entries()) {
      const ioc = await this.prisma.iOC.create({
        data: {
          organizationId,
          value: item.value,
          type: item.type as any,
          reputationScore: item.score,
          label: item.label as any,
          country: item.country,
          notes: item.notes,
          detectionCount: idx + 2,
          associatedDomains: [] as any,
          associatedFiles: [] as any,
        },
      });

      // Add enrichments
      await this.prisma.iOCEnrichment.create({
        data: {
          iocId: ioc.id,
          sourceName: 'VirusTotal-Mock',
          confidence: 90,
          rawResponse: {
            positives: 45,
            total: 68,
            scans: {
              Symantec: { detected: true, result: 'Trojan.C2' },
              Kaspersky: { detected: true, result: 'Backdoor.Win32' },
            },
          } as any,
        },
      });
    }

    // Generate up to 25 IOCs in a loop
    for (let m = iocsData.length + 1; m <= 25; m++) {
      const isIP = m % 2 === 0;
      await this.prisma.iOC.create({
        data: {
          organizationId,
          value: isIP ? `198.51.100.${100 + m}` : `threat-node-${m}.org`,
          type: isIP ? 'IPV4' : 'DOMAIN',
          reputationScore: Math.random() * 30,
          label: 'UNKNOWN',
          country: isIP ? 'US' : undefined,
          notes: `Auto-enrolled investigation placeholder ${m}`,
          associatedDomains: [] as any,
          associatedFiles: [] as any,
        },
      });
    }

    // 8. Seed 12 Detection Rules
    const detectionRules = [
      { name: 'Brute Force Attempts on SSH Port', category: 'AUTHENTICATION_ANOMALY', severity: AlertSeverity.MEDIUM, source: 'Linux SSH Service' },
      { name: 'Spawn of cmd.exe Shell from Database Process', category: 'ENDPOINT_ANOMALY', severity: AlertSeverity.CRITICAL, source: 'SQL Database Audit' },
      { name: 'S3 Policy Modification to Public Read Access', category: 'CLOUD_MISCONFIGURATION', severity: AlertSeverity.HIGH, source: 'AWS CloudTrail' },
      { name: 'AWS Root Account Session without MFA', category: 'IDENTITY_COMPROMISE', severity: AlertSeverity.CRITICAL, source: 'AWS CloudTrail' },
      { name: 'Citrix NetScaler Gateway Exploitation Signature', category: 'VULNERABILITY_EXPLOITATION', severity: AlertSeverity.CRITICAL, source: 'Web Proxy Traffic' },
      { name: 'Cobalt Strike Malware C2 Address DNS resolution', category: 'THREAT_INTEL_MATCH', severity: AlertSeverity.HIGH, source: 'Internal DNS logs' },
    ];

    for (const [idx, rule] of detectionRules.entries()) {
      await this.prisma.detectionRule.create({
        data: {
          organizationId,
          name: rule.name,
          description: `Identifies signatures matches indicating potential ${rule.name.toLowerCase()} attacks.`,
          category: rule.category,
          severity: rule.severity,
          dataSource: rule.source,
          queryDefinition: `select events where event.source == "${rule.source}" and event.severity == "${rule.severity}"`,
          isEnabled: true,
          triggerCount: idx + 1,
        },
      });
    }

    // Fill remaining to 12
    for (let r = detectionRules.length + 1; r <= 12; r++) {
      await this.prisma.detectionRule.create({
        data: {
          organizationId,
          name: `Simulated Custom Detection Rule #${r}`,
          description: `Monitors event metadata log values for policy compliance checks.`,
          category: 'POLICY_VIOLATION',
          severity: AlertSeverity.LOW,
          dataSource: 'Syslog',
          queryDefinition: 'select * where severity == "LOW"',
        },
      });
    }

    // 9. Seed 5 Integrations
    const integrations = [
      { name: 'VirusTotal Intelligence API', type: 'IOC_INTEL' },
      { name: 'AbuseIPDB Threat Reputation Feed', type: 'IOC_INTEL' },
      { name: 'National Vulnerability Database (NVD) Sync', type: 'VULN_FEED' },
      { name: 'Generic Webhook Alert Receiver', type: 'WEBHOOK' },
      { name: 'Slack SOC Alert Channels', type: 'SLACK' },
    ];

    for (const integr of integrations) {
      await this.prisma.integration.create({
        data: {
          organizationId,
          name: integr.name,
          type: integr.type,
          isEnabled: integr.name.includes('Mock') || integr.name.includes('Generic') || false,
          health: 'OK',
        },
      });
    }

    // 10. Seed 500 Security Events (Logs)
    const eventsData = [];
    const outcomes = ['SUCCESS', 'FAILURE', 'BLOCKED', 'UNKNOWN'];
    for (let s = 1; s <= 500; s++) {
      const typeIdx = s % 5;
      let eventType = 'FIREWALL_LOG';
      let msg = 'Allow traffic egress on HTTP port 80';
      let outcome = outcomes[0];
      let source = 'PaloAltoFirewall';

      if (typeIdx === 1) {
        eventType = 'OKTA_AUTH_AUDIT';
        msg = 'Failed login password challenge for administrator';
        outcome = outcomes[1];
        source = 'OktaIDP';
      } else if (typeIdx === 2) {
        eventType = 'EDR_PROCESS_SPAWN';
        msg = 'Verified startup of network agent task';
        outcome = outcomes[0];
        source = 'DefenderAgent';
      } else if (typeIdx === 3) {
        eventType = 'DATABASE_QUERY_AUDIT';
        msg = 'Executed SELECT query on CustomerData index';
        outcome = outcomes[0];
        source = 'MSSQLServer';
      } else if (typeIdx === 4) {
        eventType = 'AWS_CLOUDTRAIL_EVENT';
        msg = 'DescribeInstances call logged for region us-east-1';
        outcome = outcomes[0];
        source = 'AWSCloudTrail';
      }

      eventsData.push({
        organizationId,
        eventType,
        source,
        action: 'PROCESS_AUDIT',
        outcome,
        severity: s % 50 === 0 ? AlertSeverity.CRITICAL : s % 20 === 0 ? AlertSeverity.HIGH : AlertSeverity.LOW,
        message: msg,
        rawJson: JSON.stringify({ index: s, details: msg }),
      });
    }
    await this.prisma.securityEvent.createMany({ data: eventsData });

    // 11. Seed 200 Audit Log records
    const auditData = [];
    const actions = [
      { act: 'USER_LOGIN', desc: 'User logged in successfully' },
      { act: 'ALERT_STATUS_UPDATE', desc: 'Modified alert status from NEW to INVESTIGATING' },
      { act: 'INCIDENT_ASSIGNMENT', desc: 'Assigned incident to Sarah Connor' },
      { act: 'ASSET_MONITORING_TOGGLE', desc: 'Changed monitoring status to ACTIVE' },
      { act: 'INTEGRATION_KEY_UPDATE', desc: 'Updated API secret credentials configuration' },
    ];

    for (let a = 1; a <= 200; a++) {
      const actObj = actions[a % actions.length];
      auditData.push({
        organizationId,
        actorId: analyst1.userId,
        actorEmail: analyst1.user?.email || 'sarah.analyst@threatsync.local',
        action: actObj.act,
        resourceType: 'SEC_OPERATIONS',
        resourceId: `res_seed_${a}`,
        requestId: `req_seed_${a}`,
        outcome: 'SUCCESS',
      });
    }
    await this.prisma.auditLog.createMany({ data: auditData });

    return {
      message: 'Defensive SOC workspace successfully populated with demonstration data.',
      assetsSeeded: 50,
      alertsSeeded: 150,
      incidentsSeeded: 12,
      vulnerabilitiesMapped: 3,
      siemLogsSeeded: 500,
      auditRecordsSeeded: 200,
    };
  }
}
