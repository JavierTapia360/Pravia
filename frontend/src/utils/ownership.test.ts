import { describe, expect, it } from 'vitest';
import { canAssignOtherResponsible, defaultResponsibleId, resolveResponsibleSelection } from './ownership';

const users = [
  { id: 'ana', nombre: 'Ana' },
  { id: 'luis', nombre: 'Luis' },
  { id: 'pedro', nombre: 'Pedro' },
];

describe('identidad y responsable', () => {
  it('usa al usuario autenticado y nunca al primer usuario del catálogo', () => {
    expect(users[0].id).toBe('ana');
    expect(defaultResponsibleId('luis')).toBe('luis');
    expect(resolveResponsibleSelection({ authenticatedUserId: 'luis', role: 'ABOGADO', requestedResponsibleId: users[0].id })).toBe('luis');
  });

  it('permite que Dirección asigne explícitamente a un tercero sin cambiar el actor', () => {
    expect(canAssignOtherResponsible('DIRECCION')).toBe(true);
    expect(resolveResponsibleSelection({ authenticatedUserId: 'luis', role: 'DIRECCION', requestedResponsibleId: 'pedro' })).toBe('pedro');
    expect(defaultResponsibleId('luis')).toBe('luis');
  });

  it('mantiene al usuario autenticado como responsable predeterminado para administración', () => {
    expect(resolveResponsibleSelection({ authenticatedUserId: 'luis', role: 'ADMINISTRACION' })).toBe('luis');
  });
});
