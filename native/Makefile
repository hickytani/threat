# ThreatSync OS Native Sensor Makefile

CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2 -std=c99
SRC_DIR = src
BUILD_DIR = build
TARGET = $(BUILD_DIR)/threatsync_sensor

all: $(TARGET)

$(TARGET): $(SRC_DIR)/threatsync_sensor.c
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $< -o $@

test: $(TARGET)
	./$(TARGET)

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all test clean
