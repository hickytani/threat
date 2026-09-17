#!/usr/bin/env python3
"""
ThreatSync OS — Sigma Rule Converter Utility (Python)
Copyright (c) ThreatSync OS Security Platform. All rights reserved.

Converts open-source Sigma security detection rules into ThreatSync OS
canonical DetectionRule JSON payloads for database import and real-time evaluation.
"""

import sys
import os
import json
import yaml
import argparse

class SigmaRuleConverter:
    SEVERITY_MAP = {
        "critical": "CRITICAL",
        "high": "HIGH",
        "medium": "MEDIUM",
        "low": "LOW",
        "informational": "INFORMATIONAL",
        "info": "INFORMATIONAL"
    }

    CATEGORY_MAP = {
        "process_creation": "ENDPOINT_ANOMALY",
        "network_connection": "SUSPICIOUS_NETWORK_ACTIVITY",
        "authentication": "AUTHENTICATION_ANOMALY",
        "file_change": "ENDPOINT_ANOMALY",
        "dns": "SUSPICIOUS_NETWORK_ACTIVITY"
    }

    def convert_yaml_to_threatsync(self, yaml_content):
        try:
            rule_data = yaml.safe_load(yaml_content)
        except Exception as e:
            return None, f"Failed to parse YAML: {e}"

        title = rule_data.get("title", "Untitled Sigma Rule")
        description = rule_data.get("description", "Converted from Sigma rule format")
        level = rule_data.get("level", "medium").lower()
        severity = self.SEVERITY_MAP.get(level, "MEDIUM")

        logsource = rule_data.get("logsource", {})
        category_raw = logsource.get("category", logsource.get("product", "general"))
        category = self.CATEGORY_MAP.get(category_raw, "ENDPOINT_ANOMALY")

        detection = rule_data.get("detection", {})
        selection = detection.get("selection", {})

        match_conditions = {}
        if isinstance(selection, dict):
            for key, val in selection.items():
                sanitized_key = key.replace('.', '_')
                match_conditions[sanitized_key] = val

        tags = rule_data.get("tags", [])
        mitre_technique = None
        for tag in tags:
            if tag.startswith("attack.t"):
                mitre_technique = tag.replace("attack.", "").upper()

        threatsync_rule = {
            "name": title,
            "description": description,
            "category": category,
            "severity": severity,
            "isEnabled": True,
            "dataSource": logsource.get("product", "syslog"),
            "queryDefinition": json.dumps(detection),
            "matchConditions": match_conditions,
            "suppressionPeriod": 300,
            "tags": tags,
            "mitreTechnique": mitre_technique,
            "author": rule_data.get("author", "Sigma Security Community")
        }

        return threatsync_rule, None

def main():
    parser = argparse.ArgumentParser(description="Convert Sigma YAML detection rules into ThreatSync OS JSON format")
    parser.add_argument("--file", help="Input Sigma YAML rule file")
    parser.add_argument("--out", help="Output ThreatSync JSON file")

    args = parser.parse_args()

    if not args.file:
        print("[*] ThreatSync Sigma Converter Engine v1.0")
        sample_sigma = """
title: Suspicious PowerShell Encoded Command Execution
description: Detects execution of powershell with encoded command flags often used in attacks.
level: high
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
        CommandLine: '*-EncodedCommand*'
    condition: selection
tags:
    - attack.t1059.001
"""
        converter = SigmaRuleConverter()
        rule, err = converter.convert_yaml_to_threatsync(sample_sigma)
        print("[+] Sample Converted ThreatSync Rule JSON:")
        print(json.dumps(rule, indent=2))
        return

    if not os.path.exists(args.file):
        print(f"[!] Error: File {args.file} not found.")
        sys.exit(1)

    with open(args.file, 'r', encoding='utf-8') as f:
        content = f.read()

    converter = SigmaRuleConverter()
    rule, err = converter.convert_yaml_to_threatsync(content)
    if err:
        print(f"[!] Conversion failed: {err}")
        sys.exit(1)

    output_json = json.dumps(rule, indent=2)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(output_json)
        print(f"[+] Converted rule saved to {args.out}")
    else:
        print(output_json)

if __name__ == "__main__":
    main()
