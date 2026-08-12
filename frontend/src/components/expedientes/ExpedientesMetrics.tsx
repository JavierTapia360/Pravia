import React, { useState } from 'react';
import { Folder, Clock, DollarSign, Calendar, TrendingUp, Activity, Briefcase } from 'lucide-react';
import { ExpedienteItem } from '../../stores/expedienteStore';

interface Props {
  expedientes: ExpedienteItem[];
}

export const ExpedientesMetrics: React.FC<Props> = ({ expedientes }) => {
  const [periodo, setPeriodo] = useState<'mes_actual' | 'mes_anterior' | 'ano_actual' | 'todos'>('mes_actual');

  const total = expedientes.length;
  const abiertos = expedientes.filter(e => ['ABIERTO', 'EN_INTEGRACION', 'EN_PROCESO'].includes(e.estatus)).length;
  const enFirma = expedientes.filter(e => ['PENDIENTE_NOTARIA', 'FIRMA_PROGRAMADA'].includes(e.estatus)).length;

  // Filter signed expedientes by selected period
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isSigned = (e: ExpedienteItem) => ['FIRMADO', 'POST_FIRMA', 'ENTREGADO'].includes(e.estatus);
  const isCartera = (e: ExpedienteItem) => !isSigned(e);

  const signedExpedientes = expedientes.filter(e => {
    if (!isSigned(e)) return false;
    const date = new Date(e.updated_at || e.fecha_apertura);
    if (periodo === 'mes_actual') {
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }
    if (periodo === 'mes_anterior') {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
    }
    if (periodo === 'ano_actual') {
      return date.getFullYear() === currentYear;
    }
    return true;
  });

  // Calculate PRAVIA fees exclusively (honorarios_pravia or 20% estimated of operational value if missing)
  const honorariosFirmados = signedExpedientes.reduce((acc, e) => {
    const fee = (e as any).honorarios_pravia || Number(e.valor_operacion || 0) * 0.15;
    return acc + Number(fee);
  }, 0);

  const carteraExpedientes = expedientes.filter(isCartera);
  const honorariosCartera = carteraExpedientes.reduce((acc, e) => {
    const fee = (e as any).honorarios_pravia || Number(e.valor_operacion || 0) * 0.15;
    return acc + Number(fee);
  }, 0);

  return (
    <section className="space-y-4" aria-labelledby="expedientes-indicadores">
      {/* Metrics Period Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span id="expedientes-indicadores" className="module-eyebrow flex items-center gap-2">
          <Activity size={14} className="text-gold" /> Indicadores Financieros y Operativos PRAVIA
        </span>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Calendar size={16} className="text-slate-500" />
          <span>Periodo de honorarios</span>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as any)}
            className="control-height rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
          >
            <option value="mes_actual">Mes Actual</option>
            <option value="mes_anterior">Mes Anterior</option>
            <option value="ano_actual">Año Actual ({currentYear})</option>
            <option value="todos">Todos los Periodos</option>
          </select>
        </label>
      </div>

      <div className="metric-grid">
        {/* Card 1: Honorarios Firmados del Mes */}
        <div className="kpi-card group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="metric-label">Honorarios Firmados</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="metric-value text-emerald-700 truncate">
              ${honorariosFirmados.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="metric-meta flex items-center justify-between gap-3">
            <span>Expedientes firmados: <strong className="text-slate-900">{signedExpedientes.length}</strong></span>
            <span className="text-emerald-700 font-semibold">PRAVIA neto</span>
          </div>
        </div>

        {/* Card 2: Honorarios en Cartera */}
        <div className="kpi-card group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="metric-label">Honorarios en Cartera</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="metric-value text-amber-800 truncate">
              ${honorariosCartera.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="metric-meta flex items-center justify-between gap-3">
            <span>En proceso: <strong className="text-slate-900">{carteraExpedientes.length}</strong></span>
            <span className="text-amber-800 font-semibold flex items-center gap-1"><TrendingUp size={14} /> Pipeline</span>
          </div>
        </div>

        {/* Card 3: Activos en Gestión */}
        <div className="kpi-card group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="metric-label">Activos en Gestión</span>
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
              <Folder size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="metric-value">{abiertos}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
              {total > 0 ? `${Math.round((abiertos / total) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="metric-meta flex items-center justify-between gap-3">
            <span>Total expedientes: <strong className="text-slate-900">{total}</strong></span>
            <span className="text-amber-800 font-semibold">Abiertos</span>
          </div>
        </div>

        {/* Card 4: Fase Notarial / Firma */}
        <div className="kpi-card group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="metric-label">Fase Notaría / Firma</span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="metric-value">{enFirma}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Protocolo
            </span>
          </div>
          <div className="metric-meta flex items-center justify-between gap-3">
            <span>En firma: <strong className="text-slate-900">{expedientes.filter(e => e.estatus === 'FIRMA_PROGRAMADA').length}</strong></span>
            <span className="text-sky-700 font-semibold">Prioridad</span>
          </div>
        </div>
      </div>
    </section>
  );
};
