#!/usr/bin/env python3
"""
ThreatSync OS — Security Telemetry CLI & Log Shipper
Copyright (c) ThreatSync OS Team. All rights reserved.

Command-line tool for interacting with ThreatSync OS APIs, testing ingestion webhooks,
and shipping local security audit events.
"""

import sys
import os
import json
import argparse
import urllib.request
import urllib.parse
import urllib.error
import datetime

VERSION = "1.0.0"

def parse_args():
    parser = argparse.ArgumentParser(description="ThreatSync OS Security CLI & Telemetry Shipper")
    parser.add_argument("--url", default="http://localhost:3001/api/v1", help="ThreatSync API base URL")
    parser.add_argument("--integration-id", help="Target Webhook Integration ID")
    parser.add_argument("--secret", help="Integration Secret Token")
    parser.add_argument("--action", choices=["ping", "ship-event", "ship-log", "health"], default="ping", help="Action to perform")
    parser.add_argument("--event-name", default="CLI_SECURITY_AUDIT", help="Security Event Type")
    parser.add_argument("--severity", choices=["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"], default="MEDIUM", help="Severity level")
    parser.add_argument("--hostname", default=os.uname().nodename if hasattr(os, 'uname') else "localhost", help="Source hostname")
    parser.add_argument("--message", help="Security message detail")
    parser.add_argument("--log-file", help="Path to log file to parse and ship")

    return parser.parse_args()

def http_post(url, headers, payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read().decode('utf-8')
            return response.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            err_json = json.loads(body)
        except Exception:
            err_json = {"error": body}
        return e.code, err_json
    except urllib.error.URLError as e:
        return 500, {"error": str(e.reason)}

def http_get(url):
    req = urllib.request.Request(url, method='GET')
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            body = response.read().decode('utf-8')
            return response.status, json.loads(body) if body else {}
    except Exception as e:
        return 500, {"error": str(e)}

def do_ping(args):
    url = f"{args.url}/health/dependencies"
    status, res = http_get(url)
    print(f"[*] ThreatSync Health Status [{status}]:")
    print(json.dumps(res, indent=2))

def do_ship_event(args):
    if not args.integration_id:
        print("[!] Error: --integration-id is required to ship security events.")
        sys.exit(1)

    url = f"{args.url}/events/webhook/{args.integration_id}"
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Secret": args.secret or ""
    }

    payload = {
        "event_name": args.event_name,
        "host": args.hostname,
        "severity": args.severity,
        "message": args.message or f"CLI Telemetry event dispatched from {args.hostname}",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "client_ip": "127.0.0.1",
        "source": "ThreatSync-Python-CLI"
    }

    print(f"[*] Shipping event to {url}...")
    status, res = http_post(url, headers, payload)
    if status in (200, 201, 202):
        print(f"[+] Event successfully accepted by ThreatSync OS pipeline! Status: {status}")
        print(json.dumps(res, indent=2))
    else:
        print(f"[!] Ingestion failed with status {status}:")
        print(json.dumps(res, indent=2))

def do_ship_log(args):
    if not args.log_file or not os.path.exists(args.log_file):
        print(f"[!] Error: Log file {args.log_file} does not exist.")
        sys.exit(1)

    if not args.integration_id:
        print("[!] Error: --integration-id is required to ship logs.")
        sys.exit(1)

    print(f"[*] Reading log file: {args.log_file}...")
    count = 0
    with open(args.log_file, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            args.message = line
            do_ship_event(args)
            count += 1
            if count >= 10:
                print("[*] Shipped sample batch of 10 log entries.")
                break

def main():
    args = parse_args()
    print(f"=== ThreatSync OS CLI v{VERSION} ===")

    if args.action == "ping" or args.action == "health":
        do_ping(args)
    elif args.action == "ship-event":
        do_ship_event(args)
    elif args.action == "ship-log":
        do_ship_log(args)

if __name__ == "__main__":
    main()
