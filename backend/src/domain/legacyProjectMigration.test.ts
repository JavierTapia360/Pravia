import { describe, expect, it } from 'vitest';
import { classifyLegacyProject, type LegacyProjectCandidate } from './legacyProjectMigration';

const candidate: LegacyProjectCandidate = {
  source_id: 'ver_1', expediente_id: 'exp-1', kind: 'PROJECT_VERSION', file_name: 'proyecto.docx',
  original_name: 'Proyecto V1.docx', version: 1, expected_size: 120,
};

describe('clasificador de proyectos legacy', () => {
  it('reconoce una referencia ya migrada', () => {
    expect(classifyLegacyProject(candidate, { expediente_exists: true, file_exists: false, already_migrated_document_id: 'doc-1' }).classification).toBe('YA_MIGRADO');
  });
  it('no inventa binarios cuando el archivo local no existe', () => {
    expect(classifyLegacyProject(candidate, { expediente_exists: true, file_exists: false }).classification).toBe('ARCHIVO_LOCAL_NO_DISPONIBLE');
  });
  it('rechaza rutas inconsistentes', () => {
    expect(classifyLegacyProject({ ...candidate, file_name: '../secret.docx' }, { expediente_exists: true, file_exists: true, actual_size: 120, sha256: 'a'.repeat(64) }).classification).toBe('REFERENCIA_INCONSISTENTE');
  });
  it('manda a revisión colisiones y tamaños distintos', () => {
    expect(classifyLegacyProject(candidate, { expediente_exists: true, file_exists: true, actual_size: 121, sha256: 'a'.repeat(64) }).classification).toBe('REQUIERE_REVISION');
    expect(classifyLegacyProject(candidate, { expediente_exists: true, file_exists: true, actual_size: 120, sha256: 'a'.repeat(64), version_collision: true }).classification).toBe('REQUIERE_REVISION');
  });
  it('prepara una clave de storage basada en hash para un registro migrable', () => {
    expect(classifyLegacyProject(candidate, { expediente_exists: true, file_exists: true, actual_size: 120, sha256: 'b'.repeat(64) })).toMatchObject({
      classification: 'MIGRABLE', proposed_storage_key: expect.stringContaining('/bbbbbbbbbbbbbbbb_proyecto.docx'),
    });
  });
});
