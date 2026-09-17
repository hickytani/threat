#!/usr/bin/env bash
# ThreatSync OS — Local Security Posture Audit & CIS Compliance Script

set -euo pipefail

echo "[*] ThreatSync OS Host Security Audit Starting..."
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
HOSTNAME=$(hostname)

# Check SSH Root Login configuration
SSH_CONFIG="/etc/ssh/sshd_config"
PERMIT_ROOT="UNKNOWN"
if [[ -f "$SSH_CONFIG" ]]; then
  PERMIT_ROOT=$(grep -i "^PermitRootLogin" "$SSH_CONFIG" | awk '{print $2}' || echo "default-yes")
fi

# Check open listening ports
OPEN_PORTS=$(netstat -tuln 2>/dev/null | grep LISTEN | awk '{print $4}' | tr '\n' ',' || echo "none")

# Check firewall status
FIREWALL_STATUS="DISABLED"
if command -v ufw >/dev/null 2>&1; then
  FIREWALL_STATUS=$(ufw status | head -n 1 || echo "UNKNOWN")
elif command -v systemctl >/dev/null 2>&1; then
  FIREWALL_STATUS=$(systemctl is-active firewalld 2>/dev/null || echo "INACTIVE")
fi

echo "[+] Audit Summary for ${HOSTNAME}:"
echo "    - Timestamp: ${TIMESTAMP}"
echo "    - SSH PermitRootLogin: ${PERMIT_ROOT}"
echo "    - Open Ports: ${OPEN_PORTS}"
echo "    - Firewall Status: ${FIREWALL_STATUS}"

# Output JSON summary
cat <<EOF
{
  "auditTimestamp": "${TIMESTAMP}",
  "hostname": "${HOSTNAME}",
  "sshPermitRootLogin": "${PERMIT_ROOT}",
  "openPorts": "${OPEN_PORTS}",
  "firewallStatus": "${FIREWALL_STATUS}"
}
EOF
