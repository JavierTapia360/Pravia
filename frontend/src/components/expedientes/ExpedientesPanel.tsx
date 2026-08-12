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
    <section className="surface-card overflow-hidden p-5 sm:p-6 space-y-6" aria-labelledby="expedientes-registrados">
      
      {/* 1. PANEL HEADER */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shadow-sm">
            <Folder size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="expedientes-registrados" className="text-xl font-bold text-slate-950 tracking-tight">Expedientes registrados</h2>
              <span className="badge badge-warning normal-case tracking-normal">
                {totalItems} expedientes
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Gestión operativa, seguimiento de etapas notariales y control documental en PRAVIA OS
            </p>
          </div>
        </div>

        {/* Primary Header Action Buttons */}
        <div className="module-actions">
          <button
            onClick={onRefresh}
            title="Recargar Expedientes"
            className="btn btn-secondary btn-md"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

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

      {/* 2. DEDICATED CONTROL BAR (BUSQUEDA Y FILTROS) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
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

          {/* Estatus Dropdown Select */}
          <div className="w-full lg:w-56">
            <select
              value={filters.estatus}
              onChange={(e) => {
                setFilters({ estatus: e.target.value });
                setCurrentPage(1);
              }}
              className="control-height w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-800 focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
            >
              {ESTATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
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
              className="control-height w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-800 focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
            >
              <option value="updated_at">Ordenar: Última actualización</option>
              <option value="numero_pravia">Ordenar: Folio PRAVIA</option>
              <option value="valor_operacion">Ordenar: Valor de operación</option>
              <option value="avance_general">Ordenar: Avance operativo</option>
            </select>
          </div>
        </div>

        {/* Lower Row: Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="mr-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Filter size={13} /> Estatus rápido:
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
                    ? 'bg-amber-700 text-white border-amber-700 shadow-sm font-bold'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:text-slate-950'
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
      <div className="data-surface">
        {loading && expedientes.length === 0 ? (
          <div className="p-16 text-center text-slate-600 flex flex-col items-center justify-center">
            <RefreshCw size={32} className="animate-spin text-gold mb-3" />
            <p className="text-base font-semibold text-slate-900">Cargando datos de expedientes…</p>
            <p className="text-sm text-slate-500 mt-1">Preparando el catálogo operativo</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="p-16 text-center text-slate-600 flex flex-col items-center justify-center space-y-3">
            <FileText size={44} className="text-slate-600 mb-1" />
            <h4 className="text-lg font-bold text-slate-900">No se encontraron expedientes</h4>
            <p className="text-sm text-slate-500 max-w-md">
              {filters.search || filters.estatus
                ? 'Prueba ajustando o limpiando los criterios de búsqueda y filtros aplicados.'
                : 'Apertura un expediente directo o convierte una cotización aceptada para iniciar.'}
            </p>
            {(filters.search || filters.estatus) && (
              <button
                onClick={() => setFilters({ search: '', estatus: '' })}
                className="btn btn-secondary btn-md mt-2"
              >
                Limpiar Filtros de Búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="data-table-scroll">
            <table className="data-table min-w-[1120px]">
              <thead>
                <tr>
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
              <tbody>
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
                      <p className="font-bold text-slate-950 group-hover:text-amber-800 transition-colors truncate max-w-[240px]">
                        {exp.cliente_alias}
                      </p>
                      <p className="text-[13px] text-slate-600 flex items-center gap-1 mt-1 truncate max-w-[240px]">
                        <UserCheck size={12} className="text-slate-400 shrink-0" />
                        <span>Abogado: {exp.abogado ? `${exp.abogado.nombre} ${exp.abogado.apellido}` : 'Asignado'}</span>
                      </p>
                    </td>

                    {/* Tipo de Acto */}
                    <td className="py-4 px-5 text-slate-700 text-[13px] font-medium whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                        {exp.tipo_acto?.nombre || 'Compraventa Inmobiliaria'}
                      </span>
                    </td>

                    {/* Etapa Operativa Actual */}
                    <td className="py-4 px-5 text-[13px] text-slate-700 font-medium whitespace-nowrap">
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
                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                          <span>Operativo</span>
                          <span className="text-gold">{exp.avance_general}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
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
                        className="btn btn-secondary btn-sm whitespace-nowrap"
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
          <div className="data-table-pagination">
            <div className="flex items-center gap-3">
              <span>
                Mostrando <strong>{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</strong> - <strong>{Math.min(totalItems, currentPage * itemsPerPage)}</strong> de <strong>{totalItems}</strong> expedientes
              </span>

              {/* Items per page selector */}
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-xs text-slate-600">Mostrar:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="control-height rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
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
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={14} />
                <span>Anterior</span>
              </button>

              <div className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-bold text-xs">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary btn-sm"
              >
                <span>Siguiente</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </section>
  );
};
