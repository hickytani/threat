# ThreatSync OS Native Security Tools Makefile

CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2 -std=c99
SRC_DIR = src
BUILD_DIR = build

TARGETS = $(BUILD_DIR)/threatsync_sensor $(BUILD_DIR)/pcap_inspector $(BUILD_DIR)/hash_lookup

all: $(TARGETS)

$(BUILD_DIR)/threatsync_sensor: $(SRC_DIR)/threatsync_sensor.c
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $< -o $@

$(BUILD_DIR)/pcap_inspector: $(SRC_DIR)/pcap_inspector.c
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $< -o $@

$(BUILD_DIR)/hash_lookup: $(SRC_DIR)/hash_lookup.c
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $< -o $@

test: $(TARGETS)
	./$(BUILD_DIR)/threatsync_sensor
	./$(BUILD_DIR)/pcap_inspector
	./$(BUILD_DIR)/hash_lookup

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all test clean
