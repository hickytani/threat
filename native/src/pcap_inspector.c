/*
 * ThreatSync OS — Native Network PCAP Packet Inspector
 * Copyright (c) ThreatSync OS Security Platform. All rights reserved.
 *
 * Implements high-performance Ethernet/IP/TCP packet header inspection
 * and flow tuple extraction for deep packet inspection (DPI) telemetry.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#pragma pack(push, 1)
struct ethernet_header {
    uint8_t  dest_mac[6];
    uint8_t  src_mac[6];
    uint16_t ethertype;
};

struct ip_header {
    uint8_t  ver_ihl;
    uint8_t  tos;
    uint16_t total_length;
    uint16_t id;
    uint16_t flags_fragment;
    uint8_t  ttl;
    uint8_t  protocol;
    uint16_t checksum;
    uint32_t src_ip;
    uint32_t dest_ip;
};

struct tcp_header {
    uint16_t src_port;
    uint16_t dest_port;
    uint32_t seq_num;
    uint32_t ack_num;
    uint8_t  data_offset_reserved;
    uint8_t  flags;
    uint16_t window;
    uint16_t checksum;
    uint16_t urgent_pointer;
};
#pragma pack(pop)

void parse_packet_tuple(const uint8_t *packet_data, size_t length) {
    if (length < (sizeof(struct ethernet_header) + sizeof(struct ip_header) + sizeof(struct tcp_header))) {
        printf("[!] Packet size %ztu too short for IP/TCP inspection.\n", length);
        return;
    }

    const struct ethernet_header *eth = (const struct ethernet_header *)packet_data;
    if (ntohs(eth->ethertype) != 0x0800) { // IPv4
        printf("[*] Non-IPv4 packet (EtherType: 0x%04x). Skipping.\n", ntohs(eth->ethertype));
        return;
    }

    const struct ip_header *ip = (const struct ip_header *)(packet_data + sizeof(struct ethernet_header));
    const struct tcp_header *tcp = (const struct tcp_header *)(packet_data + sizeof(struct ethernet_header) + sizeof(struct ip_header));

    uint8_t src_bytes[4];
    uint8_t dst_bytes[4];
    memcpy(src_bytes, &ip->src_ip, 4);
    memcpy(dst_bytes, &ip->dest_ip, 4);

    printf("[+] ThreatSync PCAP Inspector Flow Extracted:\n");
    printf("    Src IP: %d.%d.%d.%d:%d\n", src_bytes[0], src_bytes[1], src_bytes[2], src_bytes[3], ntohs(tcp->src_port));
    printf("    Dst IP: %d.%d.%d.%d:%d\n", dst_bytes[0], dst_bytes[1], dst_bytes[2], dst_bytes[3], ntohs(tcp->dest_port));
    printf("    Protocol: %d (TCP) | TTL: %d\n", ip->protocol, ip->ttl);
}

int main(void) {
    printf("=== ThreatSync OS Native PCAP Packet Inspector v1.0.0 ===\n");

    // Sample synthetic 64-byte raw packet frame for inspection verification
    uint8_t sample_packet[64] = {
        0x00, 0x11, 0x22, 0x33, 0x44, 0x55, // Dst MAC
        0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB, // Src MAC
        0x08, 0x00,                         // IPv4
        0x45, 0x00, 0x00, 0x28, 0x12, 0x34, 0x40, 0x00, 0x40, 0x06, 0x00, 0x00, // IP Header
        0xC0, 0xA8, 0x01, 0x64, // Src: 192.168.1.100
        0x0A, 0x00, 0x00, 0x01, // Dst: 10.0.0.1
        0x1F, 0x90, 0x00, 0x50, // Ports: 8080 -> 80
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x50, 0x02, 0x20, 0x00
    };

    parse_packet_tuple(sample_packet, sizeof(sample_packet));
    return 0;
}
