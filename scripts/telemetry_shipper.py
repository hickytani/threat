#!/usr/bin/env python3
"""
ThreatSync OS — Security Telemetry Daemon Shipper
Monitors system log files (/var/log/auth.log, /var/log/syslog, auditd) in real time
and streams normalized security events into ThreatSync OS's ingestion pipeline.
"""

import os
import sys
import time
import json
import re
import urllib.request
import urllib.parse
import urllib.error

# Match SSH failure / sudo escalation / auth anomalies in syslog
AUTH_FAILURE_REGEX = re.compile(r'(Failed password|Invalid user|authentication failure|sudo:.*COMMAND)', re.IGNORECASE)

class TelemetryShipperDaemon:
    def __init__(self, api_url, integration_id, secret, log_path="/var/log/auth.log"):
        self.api_url = api_url.rstrip('/')
        self.integration_id = integration_id
        self.secret = secret
        self.log_path = log_path
        self.target_url = f"{self.api_url}/events/webhook/{self.integration_id}"

    def send_event(self, event_name, severity, message, raw_line):
        payload = {
            "event_name": event_name,
            "host": os.uname().nodename if hasattr(os, 'uname') else "localhost",
            "severity": severity,
            "message": message,
            "client_ip": "127.0.0.1",
            "raw_line": raw_line,
            "source": "ThreatSync-Daemon-Shipper"
        }

        data = json.dumps(payload).encode('utf-8')
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Secret": self.secret or ""
        }

        req = urllib.request.Request(self.target_url, data=data, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                print(f"[+] Shipped event '{event_name}' -> HTTP {resp.status}")
        except Exception as e:
            print(f"[!] Failed to ship event: {e}")

    def tail_and_ship(self):
        if not os.path.exists(self.log_path):
            print(f"[!] Log path {self.log_path} not found. Operating in tail simulation mode.")
            sample_lines = [
                "Sep 17 20:30:00 auth-node sshd[1234]: Failed password for root from 198.51.100.44 port 54321 ssh2",
                "Sep 17 20:31:00 auth-node sudo: alice : TTY=pts/0 ; PWD=/home/alice ; USER=root ; COMMAND=/bin/bash",
                "Sep 17 20:32:00 auth-node sshd[5678]: Invalid user admin from 203.0.113.88 port 43210 ssh2"
            ]
            for line in sample_lines:
                match = AUTH_FAILURE_REGEX.search(line)
                if match:
                    sev = "HIGH" if "Failed" in match.group(0) or "Invalid" in match.group(0) else "MEDIUM"
                    self.send_event("UNAUTHORIZED_AUTH_ATTEMPT", sev, line, line)
            return

        print(f"[*] Tailing {self.log_path}...")
        with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
            f.seek(0, os.SEEK_END)
            while True:
                line = f.readline()
                if not line:
                    time.sleep(1.0)
                    continue

                line = line.strip()
                match = AUTH_FAILURE_REGEX.search(line)
                if match:
                    sev = "HIGH" if "Failed" in match.group(0) or "Invalid" in match.group(0) else "MEDIUM"
                    self.send_event("AUTH_LOG_ANOMALY", sev, line, line)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 telemetry_shipper.py <API_URL> <INTEGRATION_ID> [SECRET] [LOG_PATH]")
        sys.exit(1)

    url = sys.argv[1]
    int_id = sys.argv[2]
    sec = sys.argv[3] if len(sys.argv) > 3 else ""
    lpath = sys.argv[4] if len(sys.argv) > 4 else "/var/log/auth.log"

    shipper = TelemetryShipperDaemon(url, int_id, sec, lpath)
    shipper.tail_and_ship()
