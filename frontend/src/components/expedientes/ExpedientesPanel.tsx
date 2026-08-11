import React, { useState } from 'react';
import { 
  Folder, Search, Filter, Plus, ArrowRightLeft, Eye, RefreshCw, X, 
  ChevronLeft, ChevronRight, FileText, UserCheck, ShieldCheck, ArrowUpDown, Clock
} from 'lucide-react';
import { ExpedienteItem, useExpedienteStore } from '../../stores/expedienteStore';

interface Props {
  expedientes: ExpedienteItem[];
  loading: boolean;
  onOpenCreate: () => void;
  onOpenConvert: () => void;
  onOpenDetail: (id: string) => void;
  onRefresh: () => void;
}

const ESTATUS_OPTIONS = [
  { value: '', label: 'Todos los Estatus' },
  { value: 'ABIERTO', label: 'Abiertos' },
  { value: 'EN_INTEGRACION', label: 'En integración' },
  { value: 'REVISION_BANCO_CLIENTE', label: 'En revisión banco/cliente' },
  { value: 'PENDIENTE_NOTARIA', label: 'En notaría' },
  { value: 'FIRMADO', label: 'Firmado' },
  { value: 'EN_CATASTRO', label: 'En catastro' },
  { value: 'EN_REGISTRO', label: 'En registro' },
  { value: 'EN_ARMADO', label: 'En armado' },
  { value: 'ENTREGADO', label: 'Entregado al cliente' }
];

const QUICK_PILLS = [
  { value: '', label: 'Todos' },
  { value: 'ABIERTO', label: 'Abiertos' },
  { value: 'EN_INTEGRACION', label: 'En integración' },
  { value: 'REVISION_BANCO_CLIENTE', label: 'En revisión banco/cliente' },
  { value: 'PENDIENTE_NOTARIA', label: 'En notaría' },
  { value: 'FIRMADO', label: 'Firmado' },
  { value: 'EN_CATASTRO', label: 'En catastro' },
  { value: 'EN_REGISTRO', label: 'En registro' },
  { value: 'EN_ARMADO', label: 'En armado' },
  { value: 'ENTREGADO', label: 'Entregado al cliente' }
];

const getStatusBadgeClass = (estatus: string) => {
  switch (estatus) {
    case 'ABIERTO': return 'badge-abierto';
    case 'EN_INTEGRACION': return 'badge-integracion';
    case 'EN_PROCESO': return 'badge-proceso';
    case 'PENDIENTE_NOTARIA': return 'badge-notaria';
    case 'FIRMA_PROGRAMADA': return 'badge-firma';
    case 'FIRMADO': return 'badge-firmado';
    case 'POST_FIRMA': return 'badge-postfirma';
    case 'ENTREGADO': return 'badge-entregado';
    default: return 'badge-abierto';
  }
};

export const ExpedientesPanel: React.FC<Props> = ({
  expedientes,
  loading,
  onOpenCreate,
  onOpenConvert,
  onOpenDetail,
  onRefresh
}) => {
  const { filters, setFilters } = useExpedienteStore();

  // Sorting & Pagination states
  const [sortBy, setSortBy] = useState<'updated_at' | 'numero_pravia' | 'valor_operacion' | 'avance_general'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Apply sorting
  const sortedExpedientes = [...expedientes].sort((a, b) => {
    let valA = (a as any)[sortBy] || 0;
    let valB = (b as any)[sortBy] || 0;
    if (typeof valA === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  // Pagination calculation
  const totalItems = sortedExpedientes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedData = sortedExpedientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSortToggle = (field: 'updated_at' | 'numero_pravia' | 'valor_operacion' | 'avance_general') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
      
      {/* 1. PANEL HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shadow-sm">
            <Folder size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">Expedientes Registrados</h2>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                {totalItems} expedientes
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestión operativa, seguimiento de etapas notariales y control documental en PRAVIA OS
            </p>
          </div>
        </div>

        {/* Primary Header Action Buttons */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <button
            onClick={onRefresh}
            title="Recargar Expedientes"
            className="h-10 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={onOpenConvert}
            className="h-10 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-white/10 hover:border-gold/40 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
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

      {/* 2. DEDICATED CONTROL BAR (BUSQUEDA Y FILTROS) */}
      <div className="bg-slate-950/70 border border-white/10 rounded-xl p-4 space-y-3.5 shadow-inner">
        {/* Upper Row: Wide Search Input & Dropdowns */}
        <div className="flex flex-col lg:flex-row items-center gap-3">
          
          {/* Wide Search Bar */}
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por Folio PRAVIA (ej. EXP-2026-0001), cliente, antecedente o notaría..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ search: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all"
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

          {/* Estatus Dropdown Select */}
          <div className="w-full lg:w-56">
            <select
              value={filters.estatus}
              onChange={(e) => {
                setFilters({ estatus: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-gold cursor-pointer"
            >
              {ESTATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenamiento Dropdown */}
          <div className="w-full lg:w-48">
            <select
              value={sortBy}
              onChange={(e) => handleSortToggle(e.target.value as any)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-gold cursor-pointer"
            >
              <option value="updated_at" className="bg-slate-900 text-white">Ordenar: Última Actualización</option>
              <option value="numero_pravia" className="bg-slate-900 text-white">Ordenar: Folio PRAVIA</option>
              <option value="valor_operacion" className="bg-slate-900 text-white">Ordenar: Valor Operación</option>
              <option value="avance_general" className="bg-slate-900 text-white">Ordenar: Avance Operativo</option>
            </select>
          </div>
        </div>

        {/* Lower Row: Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1.5 flex items-center gap-1">
            <Filter size={11} /> Estatus Rápido:
          </span>
          {QUICK_PILLS.map((p) => {
            const isActive = filters.estatus === p.value;
            return (
              <button
                key={p.value}
                onClick={() => {
                  setFilters({ estatus: p.value });
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-gold text-slate-950 border-gold shadow-sm font-bold'
                    : 'bg-slate-900/80 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}

          {(filters.estatus || filters.search) && (
            <button
              onClick={() => {
                setFilters({ estatus: '', search: '' });
                setCurrentPage(1);
              }}
              className="ml-auto text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 px-2 py-0.5 rounded hover:bg-rose-500/10 transition-colors"
            >
              <X size={12} /> Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* 3. STRUCTURED DATA TABLE */}
      <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/40">
        {loading && expedientes.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <RefreshCw size={32} className="animate-spin text-gold mb-3" />
            <p className="text-sm font-semibold text-white">Cargando datos de expedientes...</p>
            <p className="text-xs text-slate-400 mt-1">Conectando con el backend de PRAVIA OS</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
            <FileText size={44} className="text-slate-600 mb-1" />
            <h4 className="text-base font-bold text-white">No se encontraron expedientes</h4>
            <p className="text-xs text-slate-400 max-w-md">
              {filters.search || filters.estatus
                ? 'Prueba ajustando o limpiando los criterios de búsqueda y filtros aplicados.'
                : 'Apertura un expediente directo o convierte una cotización aceptada para iniciar.'}
            </p>
            {(filters.search || filters.estatus) && (
              <button
                onClick={() => setFilters({ search: '', estatus: '' })}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 hover:border-gold/40 text-xs font-semibold text-white transition-all"
              >
                Limpiar Filtros de Búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/90 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th 
                    onClick={() => handleSortToggle('numero_pravia')}
                    className="py-3.5 px-5 w-36 cursor-pointer hover:text-gold transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Folio PRAVIA</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3.5 px-5 min-w-[220px]">Cliente / Identificador</th>
                  <th className="py-3.5 px-5 w-44">Tipo de Acto</th>
                  <th className="py-3.5 px-5 w-52">Etapa Operativa Actual</th>
                  <th className="py-3.5 px-5 w-40">Estatus</th>
                  <th 
                    onClick={() => handleSortToggle('avance_general')}
                    className="py-3.5 px-5 w-36 cursor-pointer hover:text-gold transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Avance</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-3.5 px-5 w-32 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {paginatedData.map((exp) => (
                  <tr
                    key={exp.id}
                    onClick={() => onOpenDetail(exp.id)}
                    className="table-row-modern cursor-pointer group"
                  >
                    {/* Folio Correlativo PRAVIA: 01-2026 */}
                    <td className="py-4 px-5 font-mono font-bold text-gold whitespace-nowrap">
                      {exp.numero_pravia ? exp.numero_pravia.replace('EXP-', '').split('-').reverse().join('-') : '01-2026'}
                    </td>

                    {/* Cliente / Alias */}
                    <td className="py-4 px-5">
                      <p className="font-bold text-slate-100 group-hover:text-gold transition-colors truncate max-w-[240px]">
                        {exp.cliente_alias}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[240px]">
                        <UserCheck size={12} className="text-slate-400 shrink-0" />
                        <span>Abogado: {exp.abogado ? `${exp.abogado.nombre} ${exp.abogado.apellido}` : 'Asignado'}</span>
                      </p>
                    </td>

                    {/* Tipo de Acto */}
                    <td className="py-4 px-5 text-slate-300 text-xs font-medium whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/5">
                        {exp.tipo_acto?.nombre || 'Compraventa Inmobiliaria'}
                      </span>
                    </td>

                    {/* Etapa Operativa Actual */}
                    <td className="py-4 px-5 text-xs text-slate-200 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <Clock size={13} className="text-gold shrink-0" />
                        <span className="truncate">{exp.etapa_actual_nombre || 'Apertura de Expediente'}</span>
                      </div>
                    </td>

                    {/* Estatus Badge */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className={`badge-status ${getStatusBadgeClass(exp.estatus)}`}>
                        {exp.estatus}
                      </span>
                    </td>

                    {/* Avance General (%) */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="w-28">
                        <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                          <span>Operativo</span>
                          <span className="text-gold">{exp.avance_general}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-gold/70 to-gold rounded-full transition-all duration-500"
                            style={{ width: `${exp.avance_general}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail(exp.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-gold hover:text-slate-950 border border-white/10 text-slate-200 transition-all inline-flex items-center gap-1.5 text-xs font-bold shadow-sm"
                      >
                        <Eye size={14} />
                        <span>Ver Detalle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. PAGINATION FOOTER */}
        {totalItems > 0 && (
          <div className="px-5 py-4 bg-slate-900/90 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Mostrando <strong>{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</strong> - <strong>{Math.min(totalItems, currentPage * itemsPerPage)}</strong> de <strong>{totalItems}</strong> expedientes
              </span>

              {/* Items per page selector */}
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px] text-slate-400">Mostrar:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-800 border border-white/10 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none focus:border-gold"
                >
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                </select>
              </div>
            </div>

            {/* Previous / Next buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white flex items-center gap-1 text-xs font-medium"
              >
                <ChevronLeft size={14} />
                <span>Anterior</span>
              </button>

              <div className="px-3 py-1 bg-slate-950 border border-white/10 rounded-lg text-slate-200 font-mono font-bold text-xs">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white flex items-center gap-1 text-xs font-medium"
              >
                <span>Siguiente</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
