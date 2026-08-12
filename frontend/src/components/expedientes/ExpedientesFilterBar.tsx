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
    <div className="space-y-3">
      {/* Upper Control Bar: Search & Action Buttons */}
      <div className="toolbar-card justify-between">
        
        {/* Search Input Container */}
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por Folio PRAVIA, cliente, antecedente o notaría..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="control-height w-full rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
          />
          {filters.search && (
            <button
              onClick={() => setFilters({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={onOpenConvert}
            className="btn btn-secondary btn-md"
          >
            <ArrowRightLeft size={15} className="text-gold" />
            <span>Convertir Cotización</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="btn btn-primary btn-md"
          >
            <Plus size={16} />
            <span>Nuevo Expediente</span>
          </button>
        </div>
      </div>

      {/* Quick Estatus Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1">
        <span className="mr-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
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
                  ? 'bg-amber-700 text-white border-amber-700 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:text-slate-950'
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
