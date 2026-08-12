export type LegacyProjectClassification =
  | 'YA_MIGRADO'
  | 'MIGRABLE'
  | 'ARCHIVO_LOCAL_NO_DISPONIBLE'
  | 'REFERENCIA_INCONSISTENTE'
  | 'REQUIERE_REVISION';

export interface LegacyProjectCandidate {
  source_id: string;
  expediente_id: string;
  kind: 'PROJECT_VERSION' | 'AI_REPORT';
  file_name: string;
  original_name: string;
  version?: number;
  expected_size?: number;
}

export interface LegacyProjectEvidence {
  expediente_exists: boolean;
  file_exists: boolean;
  actual_size?: number;
  sha256?: string;
  already_migrated_document_id?: string;
  version_collision?: boolean;
}

export interface LegacyProjectDecision {
  classification: LegacyProjectClassification;
  reason: string;
  proposed_storage_key?: string;
}

const unsafeReference = (value: string) => !value.trim()
  || value.includes('..')
  || value.includes('/')
  || value.includes('\\')
  || value.startsWith('.');

export function classifyLegacyProject(candidate: LegacyProjectCandidate, evidence: LegacyProjectEvidence): LegacyProjectDecision {
  if (evidence.already_migrated_document_id) {
    return { classification: 'YA_MIGRADO', reason: `La referencia ya corresponde al documento ${evidence.already_migrated_document_id}.` };
  }
  if (!candidate.source_id.trim() || !candidate.expediente_id.trim() || unsafeReference(candidate.file_name) || !candidate.original_name.trim()) {
    return { classification: 'REFERENCIA_INCONSISTENTE', reason: 'La referencia contiene identificadores o una ruta local inválida.' };
  }
  if (!evidence.expediente_exists) {
    return { classification: 'REFERENCIA_INCONSISTENTE', reason: 'El expediente referido no existe en PostgreSQL.' };
  }
  if (!evidence.file_exists) {
    return { classification: 'ARCHIVO_LOCAL_NO_DISPONIBLE', reason: 'Se preservó la metadata, pero el binario local no está disponible; no se generará un sustituto.' };
  }
  if (!evidence.sha256 || !evidence.actual_size) {
    return { classification: 'REQUIERE_REVISION', reason: 'El archivo existe, pero no fue posible obtener hash y tamaño verificables.' };
  }
  if (candidate.expected_size && candidate.expected_size !== evidence.actual_size) {
    return { classification: 'REQUIERE_REVISION', reason: `El tamaño registrado (${candidate.expected_size}) no coincide con el archivo (${evidence.actual_size}).` };
  }
  if (candidate.kind === 'PROJECT_VERSION' && evidence.version_collision) {
    return { classification: 'REQUIERE_REVISION', reason: 'La versión numérica colisiona con una versión persistente que no tiene el mismo origen legacy.' };
  }
  const safeName = candidate.file_name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return {
    classification: 'MIGRABLE',
    reason: 'Expediente, metadata, tamaño y hash permiten preparar una carga persistente trazable.',
    proposed_storage_key: `legacy-migrations/expedientes/${candidate.expediente_id}/${evidence.sha256.slice(0, 16)}_${safeName}`,
  };
}
