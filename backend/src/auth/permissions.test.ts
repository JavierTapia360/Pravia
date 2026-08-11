import { describe, expect, it } from 'vitest';
import { permissionsForRole, roleHasPermission, validatePasswordStrength } from './permissions';

describe('RBAC de PRAVIA', () => {
  it('reserva finanzas y administración de usuarios', () => {
    expect(roleHasPermission('DIRECCION', 'usuarios.manage')).toBe(true);
    expect(roleHasPermission('ADMINISTRACION', 'finanzas.validate')).toBe(true);
    expect(roleHasPermission('ABOGADO', 'finanzas.read')).toBe(false);
    expect(roleHasPermission('RECEPCION', 'finanzas.read')).toBe(false);
  });

  it('da a gestoría acceso operativo acotado', () => {
    expect(roleHasPermission('GESTORIA', 'expedientes.read')).toBe(true);
    expect(roleHasPermission('GESTORIA', 'expedientes.write')).toBe(false);
    expect(roleHasPermission('GESTORIA', 'documentos.write')).toBe(true);
  });

  it('mantiene Consulta en solo lectura', () => {
    expect(permissionsForRole('CONSULTA').some((item) => item.endsWith('.write') || item.endsWith('.manage'))).toBe(false);
  });
});

describe('contraseñas', () => {
  it('acepta una frase fuerte', () => {
    expect(validatePasswordStrength('Pravia-Segura-2026!')).toEqual([]);
  });

  it('explica todos los requisitos faltantes', () => {
    expect(validatePasswordStrength('corta')).toHaveLength(4);
  });
});
