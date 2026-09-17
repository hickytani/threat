/*
 * ThreatSync OS — Fast In-Memory Hash Table & IOC Lookup Utility (C)
 * Copyright (c) ThreatSync OS Security Platform. All rights reserved.
 *
 * Provides O(1) binary search and hash table lookup for IOC hash matching.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define TABLE_SIZE 1024

typedef struct HashNode {
    char key[65];
    char label[32];
    struct HashNode *next;
} HashNode;

typedef struct {
    HashNode *buckets[TABLE_SIZE];
} HashTable;

uint32_t hash_string(const char *str) {
    uint32_t hash = 5381;
    int c;
    while ((c = *str++)) {
        hash = ((hash << 5) + hash) + c;
    }
    return hash % TABLE_SIZE;
}

HashTable* create_table(void) {
    HashTable *table = (HashTable *)malloc(sizeof(HashTable));
    if (!table) return NULL;
    memset(table->buckets, 0, sizeof(table->buckets));
    return table;
}

void insert_ioc(HashTable *table, const char *key, const char *label) {
    if (!table || !key || !label) return;
    uint32_t idx = hash_string(key);

    HashNode *node = (HashNode *)malloc(sizeof(HashNode));
    snprintf(node->key, sizeof(node->key), "%s", key);
    snprintf(node->label, sizeof(node->label), "%s", label);
    node->next = table->buckets[idx];
    table->buckets[idx] = node;
}

const char* lookup_ioc(HashTable *table, const char *key) {
    if (!table || !key) return NULL;
    uint32_t idx = hash_string(key);
    HashNode *curr = table->buckets[idx];

    while (curr) {
        if (strcmp(curr->key, key) == 0) {
            return curr->label;
        }
        curr = curr->next;
    }
    return NULL;
}

void free_table(HashTable *table) {
    if (!table) return;
    for (int i = 0; i < TABLE_SIZE; i++) {
        HashNode *curr = table->buckets[i];
        while (curr) {
            HashNode *tmp = curr;
            curr = curr->next;
            free(tmp);
        }
    }
    free(table);
}

int main(void) {
    printf("=== ThreatSync OS Native In-Memory IOC Lookup Table v1.0.0 ===\n");

    HashTable *table = create_table();
    insert_ioc(table, "198.51.100.44", "MALICIOUS_C2_IP");
    insert_ioc(table, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "MALICIOUS_SHA256");

    const char *target = "198.51.100.44";
    const char *label = lookup_ioc(table, target);

    if (label) {
        printf("[+] High-Speed IOC Match Found for %s -> Label: %s\n", target, label);
    } else {
        printf("[-] No match found for %s\n", target);
    }

    free_table(table);
    return 0;
}
