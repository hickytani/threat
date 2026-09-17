import { BadRequestException } from '@nestjs/common';

export class FieldMapperUtil {
  private static MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB
  private static MAX_NESTING_DEPTH = 10;

  /**
   * Safely gets a nested property value from an object via dot-notation path (e.g. "user.identity.name").
   * Guards against prototype pollution and excessive nesting depth.
   */
  public static getNestedValue(obj: Record<string, any>, path: string, depth = 0): any {
    if (!obj || typeof obj !== 'object' || !path || typeof path !== 'string') {
      return undefined;
    }

    if (depth > this.MAX_NESTING_DEPTH) {
      throw new BadRequestException(`Payload nesting depth exceeded maximum limit of ${this.MAX_NESTING_DEPTH}.`);
    }

    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Prototype pollution defense
      const sanitizedPart = part.trim();
      if (
        sanitizedPart === '__proto__' ||
        sanitizedPart === 'constructor' ||
        sanitizedPart === 'prototype'
      ) {
        throw new BadRequestException(`Unsafe property key detected in path: ${sanitizedPart}`);
      }

      current = current[sanitizedPart];
    }

    return current;
  }

  /**
   * Validates custom field mapping definitions to prevent invalid paths or prototype pollution attempts.
   */
  public static validateFieldMap(fieldMap: Record<string, string>): void {
    if (!fieldMap || typeof fieldMap !== 'object') {
      return;
    }

    for (const [targetKey, path] of Object.entries(fieldMap)) {
      if (typeof path !== 'string') {
        throw new BadRequestException(`Invalid field mapping path for key ${targetKey}.`);
      }

      const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
      if (forbiddenKeys.some((fk) => path.includes(fk) || targetKey.includes(fk))) {
        throw new BadRequestException(`Prototype pollution attempt blocked in field mapping.`);
      }

      if (path.length > 256) {
        throw new BadRequestException(`Field mapping path exceeds maximum length limit of 256 characters.`);
      }
    }
  }

  /**
   * Validates that payload size is within allowed limit (1MB).
   */
  public static validatePayloadSize(payload: Record<string, any>): void {
    try {
      const jsonString = JSON.stringify(payload);
      if (Buffer.byteLength(jsonString, 'utf8') > this.MAX_PAYLOAD_BYTES) {
        throw new BadRequestException(`Payload size exceeds maximum allowed size of 1 MB.`);
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Invalid JSON payload.`);
    }
  }

  /**
   * Resolves a target key value by checking configured custom field mapping path first,
   * then fallbacks list.
   */
  public static resolveValue(
    payload: Record<string, any>,
    fieldMap: Record<string, string>,
    targetKey: string,
    fallbackKeys: string[],
    defaultValue?: any,
  ): any {
    const customPath = fieldMap?.[targetKey];
    if (customPath) {
      const val = this.getNestedValue(payload, customPath);
      if (val !== undefined && val !== null) return val;
    }

    for (const key of fallbackKeys) {
      const val = this.getNestedValue(payload, key);
      if (val !== undefined && val !== null) return val;
    }

    return defaultValue;
  }
}
