import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (item: T) => void;
  searchPlaceholder?: string;
  globalFilterFn?: (item: T, query: string) => boolean;
}

export function DataTable<T>({ 
  data, 
  columns, 
  onRowClick, 
  searchPlaceholder = 'Buscar...',
  globalFilterFn 
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter
  const filteredData = React.useMemo(() => {
    if (!searchQuery || !globalFilterFn) return data;
    return data.filter(item => globalFilterFn(item, searchQuery.toLowerCase()));
  }, [data, searchQuery, globalFilterFn]);

  // Sort
  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      const mod = sortDir === 'asc' ? 1 : -1;
      return aVal > bVal ? 1 * mod : -1 * mod;
    });
  }, [filteredData, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSort = (key?: keyof T) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toolbar */}
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 'var(--space-4)' }}>
        <div style={{ position: 'relative', maxWidth: '300px', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '40px', background: 'var(--bg-tertiary)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  scope="col"
                  aria-sort={sortKey === col.accessorKey ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  style={{ 
                    padding: 'var(--space-3) var(--space-4)', 
                    fontWeight: 500, 
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {col.sortable && col.accessorKey ? (
                    <button type="button" className="table-sort-button" onClick={() => handleSort(col.accessorKey)} aria-label={`Ordenar por ${col.header}`}>
                      {col.header}<ArrowUpDown size={14} className="text-muted" aria-hidden="true" />
                    </button>
                  ) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron resultados.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  style={{ 
                    borderBottom: '1px solid var(--border-color)',
                    cursor: onRowClick ? 'pointer' : 'default'
                  }}
                  className={onRowClick ? 'hover-bg-tertiary' : ''}
                  onClick={() => onRowClick && onRowClick(row)}
                  onKeyDown={(event) => {
                    if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick ? 'Abrir registro' : undefined}
                >
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '0.9rem' }}>
                      {col.cell ? col.cell(row) : col.accessorKey ? String(row[col.accessorKey] || '') : ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ 
        padding: 'var(--space-3) var(--space-4)', 
        borderTop: '1px solid var(--border-color)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'var(--bg-tertiary)'
      }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Mostrando {paginatedData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} a {Math.min(currentPage * rowsPerPage, sortedData.length)} de {sortedData.length} resultados
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <button 
            type="button"
            className="btn-icon" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {currentPage} / {totalPages}
          </span>
          <button 
            type="button"
            className="btn-icon" 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            aria-label="Página siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
