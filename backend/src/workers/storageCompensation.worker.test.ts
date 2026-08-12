import { describe, expect, it, vi } from 'vitest';
import { StorageCompensationWorker } from './storageCompensation.worker';

const job = { id: 'job-1', carga_temporal_id: 'carga-1', storage_key: 'temporales/comparecientes/session-1/file.pdf', tipo_operacion: 'ELIMINAR_TEMPORAL', estatus: 'PENDIENTE', intentos: 0, ultimo_error: null, proxima_ejecucion_at: new Date(0), correlation_id: 'corr-1', created_at: new Date(0), updated_at: new Date(0) } as any;
const carga = { id: 'carga-1', alta_session_id: 'session-1', storage_key_temporal: job.storage_key, archived_at: new Date(), estado: 'DESCARTADO', altaSession: { estatus: 'CANCELADO' } };

function mockDb(overrides: Record<string, unknown> = {}) {
  return {
    storageCompensationJob: { findFirst: vi.fn().mockResolvedValue(job), updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue(job), update: vi.fn().mockResolvedValue({}) },
    cargaTemporalDocumento: { findUnique: vi.fn().mockResolvedValue(carga), count: vi.fn().mockResolvedValue(0), update: vi.fn().mockResolvedValue({}) },
    documento: { count: vi.fn().mockResolvedValue(0) }, ...overrides,
  } as any;
}

describe('StorageCompensationWorker', () => {
  it('elimina de forma idempotente solo una referencia temporal sin propietarios activos', async () => {
    const db = mockDb();
    const remove = vi.fn().mockResolvedValue(undefined);
    await new StorageCompensationWorker(db, remove, { pollMs: 1000, maxAttempts: 3, staleMs: 60_000 }).runOnce();
    expect(remove).toHaveBeenCalledWith(job.storage_key);
    expect(db.storageCompensationJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ estatus: 'COMPLETADO', intentos: 1 }) }));
  });

  it('no elimina si una referencia maestra utiliza el mismo storage key', async () => {
    const db = mockDb();
    db.documento.count.mockResolvedValue(1);
    const remove = vi.fn();
    await new StorageCompensationWorker(db, remove, { pollMs: 1000, maxAttempts: 3, staleMs: 60_000 }).runOnce();
    expect(remove).not.toHaveBeenCalled();
    expect(db.storageCompensationJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ estatus: 'FALLIDO' }) }));
  });

  it('reintenta con backoff y termina al alcanzar el máximo', async () => {
    const retryDb = mockDb();
    const remove = vi.fn().mockRejectedValue(new Error('storage temporalmente no disponible'));
    await new StorageCompensationWorker(retryDb, remove, { pollMs: 1000, maxAttempts: 2, staleMs: 60_000 }).runOnce();
    expect(retryDb.storageCompensationJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ estatus: 'PENDIENTE', intentos: 1, proxima_ejecucion_at: expect.any(Date) }) }));
    const terminal = { ...job, intentos: 1 };
    const terminalDb = mockDb();
    terminalDb.storageCompensationJob.findUnique.mockResolvedValue(terminal);
    await new StorageCompensationWorker(terminalDb, remove, { pollMs: 1000, maxAttempts: 2, staleMs: 60_000 }).runOnce();
    expect(terminalDb.storageCompensationJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ estatus: 'FALLIDO', intentos: 2 }) }));
  });

  it('no procesa dos veces el mismo job si pierde la reclamación optimista', async () => {
    const db = mockDb();
    db.storageCompensationJob.updateMany.mockResolvedValue({ count: 0 });
    const remove = vi.fn();
    expect(await new StorageCompensationWorker(db, remove, { pollMs: 1000, maxAttempts: 3, staleMs: 60_000 }).runOnce()).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });
});
