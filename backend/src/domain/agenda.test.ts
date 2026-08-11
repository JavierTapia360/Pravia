import { describe, expect, it } from 'vitest';
import { normalizeAgendaType, normalizeReminders, parseAgendaRange } from './agenda';

describe('reglas de agenda', () => {
  it('acepta todos los tipos operativos de PRAVIA', () => {
    expect(normalizeAgendaType('notaria')).toBe('NOTARIA');
    expect(normalizeAgendaType('seguimiento')).toBe('SEGUIMIENTO');
  });

  it('rechaza tipos libres', () => {
    expect(() => normalizeAgendaType('reunión inventada')).toThrow();
  });

  it('impide rangos cronológicos inválidos', () => {
    expect(() => parseAgendaRange({ fechaInicio: '2026-08-12T12:00:00', fechaFin: '2026-08-12T11:00:00' })).toThrow();
  });

  it('normaliza y ordena recordatorios sin duplicados', () => {
    expect(normalizeReminders([60, 15, 60])).toEqual([15, 60]);
  });
});

