import { describe, expect, it } from 'vitest';
import { mapProjectReport, mapProjectVersion } from './projectRepository.service';

describe('repositorio persistente de proyectos', () => {
  it('mapea una versión desde Documento y su vínculo activo', () => {
    expect(mapProjectVersion({
      id: 'doc-1', expediente_id: 'exp-1', nombre_original: 'Proyecto V2.docx', mime_type: 'application/docx',
      size_bytes: 2048, fecha_carga: new Date('2026-08-12T12:00:00Z'), observaciones: null,
      datos_extraidos: { proyecto: { version_numero: 2, es_version_final: true, nota_version: 'Final revisado' } },
      subido_por: { nombre: 'Ana', apellido: 'Pérez' }, expedienteVinculos: [{ estatus: 'ACTIVO' }],
    })).toMatchObject({ id: 'doc-1', version_numero: 2, es_vigente: true, es_version_final: true, cargado_por_nombre: 'Ana Pérez' });
  });

  it('mapea un reporte sin exponer su clave de storage', () => {
    const report = mapProjectReport({
      id: 'report-1', expediente_id: 'exp-1', nombre_original: 'Reporte.docx', storage_key: 'secret/key.docx',
      fecha_carga: new Date('2026-08-12T12:00:00Z'),
      datos_extraidos: { reporte_ia_proyecto: { proyecto_version_id: 'doc-1', proyecto_version_numero: 2, documentos_analizados_count: 4, observaciones: [] } },
    });
    expect(report).toMatchObject({ id: 'report-1', proyecto_version_id: 'doc-1', documentos_analizados_count: 4 });
    expect(report).not.toHaveProperty('storage_key');
  });
});
