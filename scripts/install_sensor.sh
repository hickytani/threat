#!/usr/bin/env bash
# ThreatSync OS — Sensor Deployment & Node Initialization Script
# Copyright (c) ThreatSync OS Security Platform. All rights reserved.

set -euo pipefail

echo "================================================================="
echo "       THREATSYNC OS — SECURITY SENSOR INSTALLER                 "
echo "================================================================="

THREATSYNC_URL="${THREATSYNC_URL:-http://localhost:3001/api/v1}"
INTEGRATION_ID="${INTEGRATION_ID:-}"
SECRET_TOKEN="${SECRET_TOKEN:-}"

if [[ -z "$INTEGRATION_ID" ]]; then
  echo "[!] Error: INTEGRATION_ID environment variable must be set."
  echo "    Example: INTEGRATION_ID=int_123 SECRET_TOKEN=whsec_xyz ./install_sensor.sh"
  exit 1
fi

echo "[*] Checking OS distribution and environment..."
KERNEL_VERSION=$(uname -r)
HOSTNAME=$(hostname)

echo "[+] Node Hostname: ${HOSTNAME}"
echo "[+] Kernel Version: ${KERNEL_VERSION}"

echo "[*] Checking Linux security sysctl hardening flags..."
SYSCTL_FLAGS=(
  "net.ipv4.ip_forward"
  "kernel.randomize_va_space"
  "fs.protected_hardlinks"
  "fs.protected_symlinks"
)

for flag in "${SYSCTL_FLAGS[@]}"; do
  val=$(sysctl -n "$flag" 2>/dev/null || echo "N/A")
  echo "    - $flag = $val"
done

echo "[*] Testing connectivity to ThreatSync OS ingestion target..."
HEALTH_CHECK=$(curl -s "${THREATSYNC_URL}/health/dependencies" || echo "")

if [[ -n "$HEALTH_CHECK" ]]; then
  echo "[+] ThreatSync API Endpoint reachable: ${THREATSYNC_URL}"
else
  echo "[!] Warning: ThreatSync API Endpoint reachable check failed."
fi

echo "[*] Dispatching node registration heartbeat telemetry event..."
PAYLOAD=$(cat <<EOF
{
  "event_name": "SENSOR_NODE_REGISTERED",
  "host": "${HOSTNAME}",
  "severity": "INFORMATIONAL",
  "message": "ThreatSync OS node telemetry sensor installed on Linux kernel ${KERNEL_VERSION}",
  "client_ip": "127.0.0.1",
  "source": "ThreatSync-Bash-Sensor"
}
EOF
)

RESPONSE=$(curl -s -X POST "${THREATSYNC_URL}/events/webhook/${INTEGRATION_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: ${SECRET_TOKEN}" \
  -d "$PAYLOAD")

echo "[+] Registration Response:"
echo "$RESPONSE"

echo "================================================================="
echo "[+] ThreatSync Security Sensor successfully deployed on ${HOSTNAME}!"
echo "================================================================="
