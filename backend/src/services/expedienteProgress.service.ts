import { Prisma, PrismaClient } from '@prisma/client';

export interface CalculatedProgress {
  documental: number;
  operativo: number;
  financiero: number;
  general: number;
}

const defaultPrisma = new PrismaClient();

export async function calculateExpedienteProgress(expedienteId: string, tx?: Prisma.TransactionClient | PrismaClient) {
  const client = tx || defaultPrisma;
  return ExpedienteProgressService.calcularAvances(client, expedienteId);
}

export class ExpedienteProgressService {
  /**
   * Calcula los avances del expediente dentro de una transacción activa o cliente Prisma
   */
  public static async calcularAvances(
    tx: Prisma.TransactionClient | PrismaClient,
    expedienteId: string
  ): Promise<CalculatedProgress> {
    const expediente = await tx.expediente.findUnique({
      where: { id: expedienteId },
      include: {
        cotizacion: true,
        flujoVersion: true,
        etapas: true,
        requisitos_docs: true,
        movimientosFinancieros: {
          where: { estatus: 'VALIDADO' }
        }
      }
    });

    if (!expediente) {
      return { documental: 0, operativo: 0, financiero: 0, general: 0 };
    }

    // 1. Avance Documental %
    const reqsObligatorios = expediente.requisitos_docs.filter(r => r.obligatorio);
    let avanceDoc = 0;
    if (reqsObligatorios.length > 0) {
      const validados = reqsObligatorios.filter(r => r.estatus === 'VALIDADO' || r.estatus === 'OMITIDO_JUSTIFICADO').length;
      avanceDoc = Math.round((validados / reqsObligatorios.length) * 100);
    } else {
      avanceDoc = 100;
    }

    // 2. Avance Operativo %
    let avanceOp = 0;
    const etapasCompletadas = expediente.etapas.filter(e => e.completada).length;
    const totalEtapas = Math.max(expediente.etapas.length, 1);
    avanceOp = Math.round((etapasCompletadas / totalEtapas) * 100);

    // 3. Avance Financiero %
    // Fórmula: min(100, max(0, (Ingresos Válidos Cobrados - Devoluciones / Total Exigible Cliente) * 100))
    let avanceFin = 0;
    const totalExigible = Number(expediente.cotizacion?.total_cliente || expediente.valor_operacion || 0);

    if (totalExigible > 0) {
      const ingresosCobrados = expediente.movimientosFinancieros
        .filter(m => m.naturaleza === 'INGRESO' && m.tipo_movimiento !== 'EGRESO_NOTARIA' && m.tipo_movimiento !== 'EGRESO_TERCEROS')
        .reduce((sum, m) => sum + Number(m.monto), 0);

      const devoluciones = expediente.movimientosFinancieros
        .filter(m => m.tipo_movimiento === 'DEVOLUCION')
        .reduce((sum, m) => sum + Number(m.monto), 0);

      const netoIngreso = Math.max(0, ingresosCobrados - devoluciones);
      avanceFin = Math.min(100, Math.round((netoIngreso / totalExigible) * 100));
    } else {
      avanceFin = 100;
    }

    // 4. Avance General Ponderado %
    const ponderaciones = (expediente.flujoVersion?.ponderaciones_json as any) || {
      operativo: 0.40,
      documental: 0.40,
      financiero: 0.20
    };

    const pesoOp = Number(ponderaciones.operativo || 0.40);
    const pesoDoc = Number(ponderaciones.documental || 0.40);
    const pesoFin = Number(ponderaciones.financiero || 0.20);

    const avanceGen = Math.min(100, Math.round(avanceOp * pesoOp + avanceDoc * pesoDoc + avanceFin * pesoFin));

    return {
      documental: Math.min(100, Math.max(0, avanceDoc)),
      operativo: Math.min(100, Math.max(0, avanceOp)),
      financiero: Math.min(100, Math.max(0, avanceFin)),
      general: Math.min(100, Math.max(0, avanceGen))
    };
  }
}
