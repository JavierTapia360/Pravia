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
    <div className="space-y-3 mb-6">
      {/* Metrics Period Filter Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Activity size={14} className="text-gold" /> Indicadores Financieros y Operativos PRAVIA
        </span>

        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-slate-400" />
          <span className="text-[11px]">Periodo de Honorarios:</span>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as any)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gold font-bold focus:outline-none focus:border-gold cursor-pointer"
          >
            <option value="mes_actual">Mes Actual</option>
            <option value="mes_anterior">Mes Anterior</option>
            <option value="ano_actual">Año Actual ({currentYear})</option>
            <option value="todos">Todos los Periodos</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Honorarios Firmados del Mes */}
        <div className="kpi-card group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Honorarios Firmados</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-emerald-400 tracking-tight truncate">
              ${honorariosFirmados.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>Expedientes firmados: <strong className="text-slate-200">{signedExpedientes.length}</strong></span>
            <span className="text-emerald-400 font-semibold">PRAVIA Neto</span>
          </div>
        </div>

        {/* Card 2: Honorarios en Cartera */}
        <div className="kpi-card group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Honorarios en Cartera</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-amber-400 tracking-tight truncate">
              ${honorariosCartera.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>En proceso: <strong className="text-slate-200">{carteraExpedientes.length}</strong></span>
            <span className="text-amber-400 font-semibold flex items-center gap-1"><TrendingUp size={12} /> Pipeline</span>
          </div>
        </div>

        {/* Card 3: Activos en Gestión */}
        <div className="kpi-card group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Activos en Gestión</span>
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
              <Folder size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-white tracking-tight">{abiertos}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
              {total > 0 ? `${Math.round((abiertos / total) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>Total expedientes: <strong className="text-slate-200">{total}</strong></span>
            <span className="text-gold font-medium">Abiertos</span>
          </div>
        </div>

        {/* Card 4: Fase Notarial / Firma */}
        <div className="kpi-card group cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fase Notaria / Firma</span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-white tracking-tight">{enFirma}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Protocolo
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>En firma: <strong className="text-slate-200">{expedientes.filter(e => e.estatus === 'FIRMA_PROGRAMADA').length}</strong></span>
            <span className="text-sky-400 font-semibold">Prioridad</span>
          </div>
        </div>
      </div>
    </div>
  );
};
