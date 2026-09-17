import { RulesService } from './rules.service.js';

describe('RulesService', () => {
  let service: RulesService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      detectionRule: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new RulesService(prismaMock);
  });

  it('evaluates EQUALS condition correctly', () => {
    const conditions = {
      eventType: { operator: 'EQUALS', value: 'PROCESS_EXECUTION' },
    };
    const sampleEvent = { eventType: 'PROCESS_EXECUTION' };
    expect(service.evaluateConditions(conditions, sampleEvent)).toBe(true);
  });

  it('evaluates CONTAINS condition correctly', () => {
    const conditions = {
      metadata: {
        commandLine: { operator: 'CONTAINS', value: '-enc' },
      },
    };
    const sampleEvent = {
      metadata: { commandLine: 'powershell.exe -enc aW52b2tl' },
    };
    expect(service.evaluateConditions(conditions, sampleEvent)).toBe(true);
  });

  it('returns false when condition fails', () => {
    const conditions = {
      metadata: {
        commandLine: { operator: 'CONTAINS', value: '-enc' },
      },
    };
    const sampleEvent = {
      metadata: { commandLine: 'powershell.exe -ExecutionPolicy Bypass' },
    };
    expect(service.evaluateConditions(conditions, sampleEvent)).toBe(false);
  });
});
