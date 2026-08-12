import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../src/config/prisma';
import { classifyLegacyProject, type LegacyProjectCandidate } from '../src/domain/legacyProjectMigration';
import { deleteFile, getStorageInfo, uploadFile } from '../src/services/supabase.service';

type LegacyState = { versiones?: any[]; reportes?: any[] };
type AuditRow = {
  candidate: LegacyProjectCandidate;
  local_path: string;
  classification: string;
  reason: string;
  sha256?: string;
  actual_size?: number;
  proposed_storage_key?: string;
  migrated_document_id?: string;
  legacy: any;
};

const argValue = (name: string) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
const apply = process.argv.includes('--apply');
const legacyRoot = path.resolve(argValue('legacy-root') || path.join(process.cwd(), 'uploads'));
const statePath = path.resolve(argValue('state') || path.join(legacyRoot, 'proyectos_db.json'));
const outputDir = argValue('output-dir') ? path.resolve(argValue('output-dir')!) : null;
const actorUserId = argValue('actor-user-id') || '';

const hashFile = (filePath: string) => {
  const buffer = fs.readFileSync(filePath);
  return { buffer, size: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') };
};

const projectCandidate = (item: any): LegacyProjectCandidate => ({
  source_id: String(item.id || ''), expediente_id: String(item.expediente_id || ''), kind: 'PROJECT_VERSION',
  file_name: String(item.archivo_file || ''), original_name: String(item.nombre_original || ''),
  version: Number(item.version_numero || 0) || undefined, expected_size: Number(item.size_bytes || 0) || undefined,
});

const reportCandidate = (item: any): LegacyProjectCandidate => ({
  source_id: `report:${String(item.expediente_id || '')}:${String(item.created_at || item.archivo_reporte_file || '')}`,
  expediente_id: String(item.expediente_id || ''), kind: 'AI_REPORT',
  file_name: String(item.archivo_reporte_file || ''), original_name: String(item.nombre_reporte || ''),
  version: Number(item.proyecto_version_numero || 0) || undefined,
});

const markdown = (report: any) => {
  const lines = ['# Migración legacy de proyectos', '', `Modo: **${report.mode}**`, `Generado: ${report.generated_at}`, '', '## Resumen', ''];
  for (const [classification, count] of Object.entries(report.summary)) lines.push(`- ${classification}: ${count}`);
  lines.push('', '## Registros', '', '| Tipo | Expediente | Origen | Clasificación | Razón |', '| --- | --- | --- | --- | --- |');
  for (const row of report.rows) lines.push(`| ${row.kind} | ${row.expediente_id} | ${row.source_id} | ${row.classification} | ${String(row.reason).replace(/\|/g, '\\|')} |`);
  return `${lines.join('\n')}\n`;
};

const csv = (rows: any[]) => {
  const fields = ['kind', 'expediente_id', 'source_id', 'file_name', 'classification', 'reason', 'sha256', 'actual_size', 'proposed_storage_key', 'migrated_document_id'];
  const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return `${fields.join(',')}\n${rows.map((row) => fields.map((field) => cell(row[field])).join(',')).join('\n')}\n`;
};

async function main() {
  if (!fs.existsSync(statePath)) throw new Error(`No existe el inventario legacy: ${statePath}`);
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as LegacyState;
  const candidates = [
    ...(state.versiones || []).map((legacy) => ({ candidate: projectCandidate(legacy), legacy, folder: 'proyectos' })),
    ...(state.reportes || []).map((legacy) => ({ candidate: reportCandidate(legacy), legacy, folder: 'reportes_ia' })),
  ];
  const expedienteIds = [...new Set(candidates.map((item) => item.candidate.expediente_id).filter(Boolean))];
  const [expedientes, existingDocuments] = await Promise.all([
    prisma.expediente.findMany({ where: { id: { in: expedienteIds } }, select: { id: true } }),
    prisma.documento.findMany({ where: { tipo: { in: ['PROYECTO_ESCRITURA', 'REPORTE_IA_PROYECTO'] } }, select: { id: true, expediente_id: true, tipo: true, datos_extraidos: true } }),
  ]);
  const existingExpedientes = new Set(expedientes.map((item) => item.id));
  const migratedBySource = new Map<string, string>();
  const versionsByExpediente = new Map<string, Set<number>>();
  for (const document of existingDocuments) {
    const root = document.datos_extraidos && typeof document.datos_extraidos === 'object' && !Array.isArray(document.datos_extraidos) ? document.datos_extraidos as any : {};
    const meta = document.tipo === 'PROYECTO_ESCRITURA' ? root.proyecto : root.reporte_ia_proyecto;
    if (meta?.legacy_source_id) migratedBySource.set(String(meta.legacy_source_id), document.id);
    if (document.tipo === 'PROYECTO_ESCRITURA' && document.expediente_id && Number(meta?.version_numero)) {
      const set = versionsByExpediente.get(document.expediente_id) || new Set<number>();
      set.add(Number(meta.version_numero)); versionsByExpediente.set(document.expediente_id, set);
    }
  }

  const rows: AuditRow[] = candidates.map(({ candidate, legacy, folder }) => {
    const localPath = path.join(legacyRoot, folder, candidate.file_name);
    let fileEvidence: { size?: number; sha256?: string } = {};
    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      const hashed = hashFile(localPath); fileEvidence = { size: hashed.size, sha256: hashed.sha256 };
    }
    const decision = classifyLegacyProject(candidate, {
      expediente_exists: existingExpedientes.has(candidate.expediente_id),
      file_exists: Boolean(fileEvidence.sha256), actual_size: fileEvidence.size, sha256: fileEvidence.sha256,
      already_migrated_document_id: migratedBySource.get(candidate.source_id),
      version_collision: candidate.kind === 'PROJECT_VERSION' && Boolean(candidate.version && versionsByExpediente.get(candidate.expediente_id)?.has(candidate.version)),
    });
    return { candidate, legacy, local_path: localPath, classification: decision.classification, reason: decision.reason, sha256: fileEvidence.sha256, actual_size: fileEvidence.size, proposed_storage_key: decision.proposed_storage_key };
  });

  if (apply) {
    if (process.env.LEGACY_PROJECT_MIGRATION_APPLY !== 'I_UNDERSTAND_THIS_WRITES_POSTGRES_AND_STORAGE') throw new Error('Falta la confirmación explícita LEGACY_PROJECT_MIGRATION_APPLY.');
    if (!actorUserId) throw new Error('El modo apply requiere --actor-user-id.');
    if (getStorageInfo().primary !== 'cloud') throw new Error('La migración solo escribe cuando el storage primario es cloud.');
    const actor = await prisma.user.findFirst({ where: { id: actorUserId, activo: true }, select: { id: true } });
    if (!actor) throw new Error('El actor de migración no existe o está inactivo.');
    for (const row of rows.filter((item) => item.classification === 'MIGRABLE')) {
      const { buffer } = hashFile(row.local_path);
      const storageKey = row.proposed_storage_key!;
      await uploadFile(buffer, storageKey, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      try {
        const document = await prisma.$transaction(async (tx) => {
          if (row.candidate.kind === 'PROJECT_VERSION' && row.legacy.es_vigente) {
            await tx.expedienteDocumento.updateMany({ where: { expediente_id: row.candidate.expediente_id, tipo_vinculo: 'PROYECTO_ESCRITURA', estatus: 'ACTIVO' }, data: { estatus: 'SUSTITUIDO', inactivado_at: new Date(), inactivado_por_id: actor.id, motivo_inactivacion: 'Migración controlada de proyecto legacy vigente' } });
          }
          const type = row.candidate.kind === 'PROJECT_VERSION' ? 'PROYECTO_ESCRITURA' : 'REPORTE_IA_PROYECTO';
          const metadata = row.candidate.kind === 'PROJECT_VERSION'
            ? { proyecto: { version_numero: row.candidate.version || 1, es_version_final: Boolean(row.legacy.es_version_final), nota_version: row.legacy.nota_version || null, legacy_source_id: row.candidate.source_id, legacy_sha256: row.sha256 } }
            : { reporte_ia_proyecto: { ...row.legacy, legacy_source_id: row.candidate.source_id, legacy_sha256: row.sha256, archivo_reporte_file: undefined } };
          const created = await tx.documento.create({ data: { nombre_original: row.candidate.original_name, nombre_interno: storageKey, storage_key: storageKey, tipo: type, categoria: 'PROYECTO', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size_bytes: buffer.length, subido_por_id: actor.id, expediente_id: row.candidate.expediente_id, estatus: 'VIGENTE', observaciones: `Migrado desde ${row.candidate.source_id}`, datos_extraidos: metadata as Prisma.InputJsonValue } });
          await tx.expedienteDocumento.create({ data: { expediente_id: row.candidate.expediente_id, documento_id: created.id, tipo_vinculo: type, creado_por_id: actor.id, estatus: row.candidate.kind === 'PROJECT_VERSION' && !row.legacy.es_vigente ? 'SUSTITUIDO' : 'ACTIVO', observaciones: `Migración legacy · SHA-256 ${row.sha256}` } });
          return created;
        });
        row.classification = 'YA_MIGRADO'; row.migrated_document_id = document.id; row.reason = 'Migrado a PostgreSQL y Storage con hash preservado.';
      } catch (error) {
        await deleteFile(storageKey).catch(() => undefined);
        throw error;
      }
    }
  }

  const publicRows = rows.map((row) => ({ ...row.candidate, classification: row.classification, reason: row.reason, sha256: row.sha256, actual_size: row.actual_size, proposed_storage_key: row.proposed_storage_key, migrated_document_id: row.migrated_document_id }));
  const summary = publicRows.reduce<Record<string, number>>((acc, row) => { acc[row.classification] = (acc[row.classification] || 0) + 1; return acc; }, {});
  const report = { mode: apply ? 'APPLY_EXPLICIT' : 'DRY_RUN_READ_ONLY', generated_at: new Date().toISOString(), source: statePath, summary, rows: publicRows };
  if (outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'legacy-projects.json'), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(outputDir, 'legacy-projects.md'), markdown(report));
    fs.writeFileSync(path.join(outputDir, 'legacy-projects.csv'), csv(publicRows));
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`No fue posible auditar/migrar proyectos legacy: ${error.message}\n`); process.exitCode = 1; }).finally(() => prisma.$disconnect());
