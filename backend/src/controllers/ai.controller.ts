import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { getOpenAIEscalationModelName, getOpenAIModelName } from '../services/openaiDocument.service';

const asNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

function periodStart(value: unknown) {
  const now = new Date();
  const period = String(value || '30_DIAS').toUpperCase();
  if (period === 'HOY') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'ESTE_MES') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'TODO') return new Date('2000-01-01T00:00:00');
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
}

export class AIController {
  static async dashboard(req: Request, res: Response) {
    try {
      const from = periodStart(req.query.periodo);
      const where = {
        created_at: { gte: from },
        ...(req.query.usuario_id && req.query.usuario_id !== 'TODOS' ? { usuario_id: String(req.query.usuario_id) } : {}),
        ...(req.query.operacion && req.query.operacion !== 'TODAS' ? { operacion: String(req.query.operacion) } : {}),
      };
      const [logs, users] = await Promise.all([
        prisma.aIUsageLog.findMany({
          where,
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true } },
            expediente: { select: { id: true, numero_pravia: true, cliente_alias: true } },
          },
          orderBy: { created_at: 'desc' },
          take: 500,
        }),
        prisma.user.findMany({ where: { activo: true }, select: { id: true, nombre: true, apellido: true }, orderBy: { nombre: 'asc' } }),
      ]);

      const completed = logs.filter((item) => item.estatus === 'COMPLETADO');
      const totals = completed.reduce((acc, item) => {
        acc.requests += 1;
        acc.input += item.input_tokens;
        acc.output += item.output_tokens;
        acc.reasoning += item.reasoning_tokens;
        acc.tokens += item.total_tokens;
        acc.cost += asNumber(item.costo_estimado_usd);
        acc.documents += item.documentos_enviados;
        if (item.escalamiento_utilizado) acc.escalations += 1;
        return acc;
      }, { requests: 0, input: 0, output: 0, reasoning: 0, tokens: 0, cost: 0, documents: 0, escalations: 0 });

      const grouped = new Map<string, { modelo: string; solicitudes: number; tokens: number; costo_usd: number }>();
      for (const item of completed) {
        const current = grouped.get(item.modelo) || { modelo: item.modelo, solicitudes: 0, tokens: 0, costo_usd: 0 };
        current.solicitudes += 1;
        current.tokens += item.total_tokens;
        current.costo_usd += asNumber(item.costo_estimado_usd);
        grouped.set(item.modelo, current);
      }

      return res.json({
        success: true,
        configuracion: {
          provider: 'OPENAI',
          modelo_principal: getOpenAIModelName(),
          modelo_escalamiento: getOpenAIEscalationModelName(),
          api_key_configurada: Boolean((process.env.OPENAI_API_KEY || '').trim()),
          razonamiento: process.env.OPENAI_REASONING_EFFORT || 'high',
          escalamiento_habilitado: String(process.env.AI_ESCALATION_ENABLED || 'true').toLowerCase() !== 'false',
        },
        periodo: { desde: from },
        metricas: {
          solicitudes: totals.requests,
          fallidas: logs.length - completed.length,
          documentos: totals.documents,
          input_tokens: totals.input,
          output_tokens: totals.output,
          reasoning_tokens: totals.reasoning,
          total_tokens: totals.tokens,
          costo_estimado_usd: Number(totals.cost.toFixed(6)),
          escalaciones: totals.escalations,
        },
        por_modelo: [...grouped.values()].map((item) => ({ ...item, costo_usd: Number(item.costo_usd.toFixed(6)) })),
        operaciones: [...new Set(logs.map((item) => item.operacion))].sort(),
        usuarios: users,
        solicitudes_recientes: logs.slice(0, 100),
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'No fue posible consultar el consumo de IA.', detail: error.message });
    }
  }
}
