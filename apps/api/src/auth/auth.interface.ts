import { UserRole } from 'shared-types';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
}

export interface ActiveMember {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  member?: ActiveMember;
}
