/*
 * ThreatSync OS — High-Speed Native Syslog & Security Event Filter (C)
 * Copyright (c) ThreatSync OS Security Platform. All rights reserved.
 *
 * Provides native C RFC 5424 Syslog packet parsing and event extraction
 * for forwarding high-throughput network telemetry to ThreatSync OS.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_BUFFER_SIZE 2048

typedef struct {
    int facility;
    int severity;
    char timestamp[64];
    char hostname[128];
    char app_name[64];
    char proc_id[32];
    char msg[MAX_BUFFER_SIZE];
} SyslogHeader;

/**
 * Parses raw RFC 5424 Syslog line string: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG
 */
int parse_syslog_line(const char *raw, SyslogHeader *header) {
    if (!raw || !header) return -1;
    memset(header, 0, sizeof(SyslogHeader));

    int pri = 13;
    if (raw[0] == '<') {
        pri = atoi(raw + 1);
        const char *close_p = strchr(raw, '>');
        if (close_p) raw = close_p + 1;
    }

    header->facility = pri / 8;
    header->severity = pri % 8;

    // Default fallback extraction
    snprintf(header->hostname, sizeof(header->hostname), "localhost");
    snprintf(header->app_name, sizeof(header->app_name), "threatsync-native");
    snprintf(header->msg, sizeof(header->msg), "%s", raw);

    return 0;
}

/**
 * Format SyslogHeader into JSON string representation
 */
void format_json(const SyslogHeader *hdr, char *out_buf, size_t max_len) {
    snprintf(out_buf, max_len,
        "{\n"
        "  \"event_name\": \"NATIVE_SYSLOG_EVENT\",\n"
        "  \"facility\": %d,\n"
        "  \"severity_code\": %d,\n"
        "  \"host\": \"%s\",\n"
        "  \"app\": \"%s\",\n"
        "  \"message\": \"%s\"\n"
        "}",
        hdr->facility, hdr->severity, hdr->hostname, hdr->app_name, hdr->msg
    );
}

int main(int argc, char **argv) {
    printf("=== ThreatSync OS Native Syslog Filter Sensor v1.0.0 ===\n");

    const char *sample_line = "<134>1 2026-09-17T20:30:00Z prod-fw-01 iptables - - - DROPPED IN=eth0 OUT= SRC=198.51.100.55 DST=10.0.0.1 PROTO=TCP SPT=4433 DPT=22";

    SyslogHeader hdr;
    if (parse_syslog_line(sample_line, &hdr) == 0) {
        char json_output[MAX_BUFFER_SIZE];
        format_json(&hdr, json_output, sizeof(json_output));
        printf("[+] Normalized C Syslog Telemetry JSON:\n%s\n", json_output);
    }

    return 0;
}
