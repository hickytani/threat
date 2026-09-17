import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateRuleDto, UpdateRuleDto } from './rules.dto.js';

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    organizationId: string;
    isEnabled?: boolean;
    category?: string;
    severity?: string;
    search?: string;
  }) {
    const { organizationId, isEnabled, category, severity, search } = params;
    const where: any = { organizationId };

    if (isEnabled !== undefined) {
      where.isEnabled = isEnabled;
    }
    if (category) {
      where.category = category;
    }
    if (severity) {
      where.severity = severity;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.detectionRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const rule = await this.prisma.detectionRule.findFirst({
      where: { id, organizationId },
    });
    if (!rule) {
      throw new NotFoundException(`Detection rule with ID ${id} not found.`);
    }
    return rule;
  }

  async create(organizationId: string, data: CreateRuleDto, author?: string) {
    return this.prisma.detectionRule.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description || `Custom detection rule: ${data.name}`,
        category: data.category || 'CUSTOM_DETECTION',
        severity: data.severity || 'MEDIUM',
        isEnabled: data.isEnabled ?? true,
        dataSource: data.dataSource || 'SECURITY_EVENT',
        queryDefinition: data.queryDefinition || JSON.stringify(data.matchConditions || {}),
        matchConditions: (data.matchConditions || {}) as any,
        suppressionPeriod: data.suppressionPeriod || 0,
        tags: (data.tags || ['CustomRule']) as any,
        mitreTechnique: data.mitreTechnique || null,
        author: author || 'SOC Analyst',
      },
    });
  }

  async update(organizationId: string, id: string, data: UpdateRuleDto) {
    await this.findOne(organizationId, id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.dataSource !== undefined) updateData.dataSource = data.dataSource;
    if (data.queryDefinition !== undefined) updateData.queryDefinition = data.queryDefinition;
    if (data.matchConditions !== undefined) updateData.matchConditions = data.matchConditions;
    if (data.suppressionPeriod !== undefined) updateData.suppressionPeriod = data.suppressionPeriod;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.mitreTechnique !== undefined) updateData.mitreTechnique = data.mitreTechnique;

    return this.prisma.detectionRule.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.detectionRule.delete({
      where: { id },
    });
  }

  async testRule(organizationId: string, matchConditions: Record<string, any>, sampleEvent: Record<string, any>) {
    const matches = this.evaluateConditions(matchConditions, sampleEvent);
    return {
      matches,
      matchConditions,
      evaluatedFields: Object.keys(matchConditions),
      sampleEvent,
      timestamp: new Date().toISOString(),
    };
  }

  evaluateConditions(conditions: Record<string, any>, event: Record<string, any>): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return false;
    }

    for (const [key, expectedValue] of Object.entries(conditions)) {
      if (key === 'metadata' && typeof expectedValue === 'object' && expectedValue) {
        const eventMeta = event.metadata || {};
        for (const [mKey, mVal] of Object.entries(expectedValue as Record<string, any>)) {
          if (!this.compareValues(eventMeta[mKey], mVal)) {
            return false;
          }
        }
        continue;
      }

      const actualValue = event[key] ?? event.metadata?.[key];
      if (!this.compareValues(actualValue, expectedValue)) {
        return false;
      }
    }

    return true;
  }

  private compareValues(actual: any, expected: any): boolean {
    if (typeof expected === 'object' && expected !== null) {
      if (expected.operator && expected.value !== undefined) {
        const val = String(actual || '').toLowerCase();
        const exp = String(expected.value || '').toLowerCase();
        switch (String(expected.operator).toUpperCase()) {
          case 'EQUALS':
          case 'EQ':
            return val === exp;
          case 'CONTAINS':
          case 'LIKE':
            return val.includes(exp);
          case 'STARTS_WITH':
            return val.startsWith(exp);
          case 'GREATER_THAN':
          case 'GT':
            return Number(actual) > Number(expected.value);
          case 'LESS_THAN':
          case 'LT':
            return Number(actual) < Number(expected.value);
          case 'NOT_EQUALS':
          case 'NEQ':
            return val !== exp;
          default:
            return val === exp;
        }
      }
    }

    if (typeof actual === 'string' && typeof expected === 'string') {
      return actual.toLowerCase() === expected.toLowerCase();
    }

    return actual === expected;
  }
}
