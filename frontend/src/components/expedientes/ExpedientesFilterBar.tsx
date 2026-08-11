import React from 'react';
import { Search, Filter, Plus, ArrowRightLeft, X } from 'lucide-react';
import { useExpedienteStore } from '../../stores/expedienteStore';

interface Props {
  onOpenCreate: () => void;
  onOpenConvert: () => void;
}

const QUICK_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'ABIERTO', label: 'Abiertos' },
  { value: 'EN_INTEGRACION', label: 'En Integración' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'PENDIENTE_NOTARIA', label: 'Notaría' },
  { value: 'FIRMA_PROGRAMADA', label: 'En Firma' },
  { value: 'ENTREGADO', label: 'Concluidos' }
];

export const ExpedientesFilterBar: React.FC<Props> = ({ onOpenCreate, onOpenConvert }) => {
  const { filters, setFilters } = useExpedienteStore();

  return (
    <div className="space-y-3 mb-6">
      {/* Upper Control Bar: Search & Action Buttons */}
      <div className="bg-dark-card/90 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        
        {/* Search Input Container */}
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por Folio PRAVIA, cliente, antecedente o notaría..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => setFilters({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={onOpenConvert}
            className="h-10 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all hover:border-gold/30"
          >
            <ArrowRightLeft size={15} className="text-gold" />
            <span>Convertir Cotización</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="h-10 px-4 rounded-xl bg-gold hover:bg-gold-light text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-gold/20"
          >
            <Plus size={16} />
            <span>Nuevo Expediente</span>
          </button>
        </div>
      </div>

      {/* Quick Estatus Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1">
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider mr-1 flex items-center gap-1">
          <Filter size={12} /> Estado:
        </span>
        {QUICK_FILTERS.map((f) => {
          const isActive = filters.estatus === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilters({ estatus: f.value })}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-gold text-slate-950 border-gold shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
