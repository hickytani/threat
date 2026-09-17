export class CreateRuleDto {
  name!: string;
  description?: string;
  category?: string;
  severity?: string;
  isEnabled?: boolean;
  dataSource?: string;
  queryDefinition?: string;
  matchConditions?: Record<string, any>;
  suppressionPeriod?: number;
  tags?: string[];
  mitreTechnique?: string;
}

export class UpdateRuleDto {
  name?: string;
  description?: string;
  category?: string;
  severity?: string;
  isEnabled?: boolean;
  dataSource?: string;
  queryDefinition?: string;
  matchConditions?: Record<string, any>;
  suppressionPeriod?: number;
  tags?: string[];
  mitreTechnique?: string;
}
