import { FieldMapperUtil } from './field-mapper.util.js';
import { BadRequestException } from '@nestjs/common';

describe('FieldMapperUtil', () => {
  it('extracts nested property value safely using dot notation', () => {
    const payload = {
      user: {
        identity: {
          name: 'alice@example.com',
        },
      },
      network: {
        src_ip: '192.168.1.100',
      },
    };

    expect(FieldMapperUtil.getNestedValue(payload, 'user.identity.name')).toBe('alice@example.com');
    expect(FieldMapperUtil.getNestedValue(payload, 'network.src_ip')).toBe('192.168.1.100');
    expect(FieldMapperUtil.getNestedValue(payload, 'nonexistent.key')).toBeUndefined();
  });

  it('rejects prototype pollution attempts in path string', () => {
    const payload = { a: { b: 1 } };
    expect(() => FieldMapperUtil.getNestedValue(payload, 'a.__proto__.polluted')).toThrow(BadRequestException);
    expect(() => FieldMapperUtil.getNestedValue(payload, 'constructor.prototype')).toThrow(BadRequestException);
  });

  it('rejects prototype pollution attempts in field map keys/values', () => {
    const maliciousMap = {
      eventType: '__proto__.polluted',
    };
    expect(() => FieldMapperUtil.validateFieldMap(maliciousMap)).toThrow(BadRequestException);
  });

  it('resolves custom mapped fields with fallback keys', () => {
    const payload = {
      alert_name: 'CRITICAL_DB_EXFILTRATION',
      client_ip: '10.0.0.5',
    };

    const fieldMap = {
      eventType: 'alert_name',
      sourceIp: 'client_ip',
    };

    const resolvedType = FieldMapperUtil.resolveValue(payload, fieldMap, 'eventType', ['type'], 'DEFAULT');
    const resolvedIp = FieldMapperUtil.resolveValue(payload, fieldMap, 'sourceIp', ['ip'], '0.0.0.0');

    expect(resolvedType).toBe('CRITICAL_DB_EXFILTRATION');
    expect(resolvedIp).toBe('10.0.0.5');
  });
});
