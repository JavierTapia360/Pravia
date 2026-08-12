import type { AppRole } from '../services/auth.service';

const TEAM_ASSIGNMENT_ROLES: AppRole[] = ['DIRECCION', 'ADMINISTRACION'];

export function canAssignOtherResponsible(role: AppRole | null | undefined) {
  return Boolean(role && TEAM_ASSIGNMENT_ROLES.includes(role));
}

export function defaultResponsibleId(authenticatedUserId: string | null | undefined) {
  return authenticatedUserId || '';
}

export function resolveResponsibleSelection(input: {
  authenticatedUserId: string | null | undefined;
  role: AppRole | null | undefined;
  requestedResponsibleId?: string | null;
}) {
  const actorId = defaultResponsibleId(input.authenticatedUserId);
  if (!actorId) return '';
  if (!canAssignOtherResponsible(input.role)) return actorId;
  return input.requestedResponsibleId || actorId;
}
