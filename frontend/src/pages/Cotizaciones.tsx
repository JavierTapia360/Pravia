import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Clock, AlertCircle, FileText, CheckCircle2, Building2, User, RefreshCw, Layers } from 'lucide-react';
import { api } from '../services/api';
import WizardCotizacion from '../components/cotizaciones/WizardCotizacion';
import CotizacionDetail from '../components/cotizaciones/CotizacionDetail';

const ESTADO_BADGE_CLASS: Record<string, string> = {
  BORRADOR: 'badge-secondary',
  ENVIADA_NOTARIA: 'badge-info',
  PRESUPUESTO_RECIBIDO: 'badge-primary',
  EN_REVISION_ABOGADO: 'badge-primary',
  ENVIADA_CLIENTE: 'badge-warning',
  EN_NEGOCIACION: 'badge-warning',
  ACEPTADA: 'badge-success',
  RECHAZADA: 'badge-danger',
  VENCIDA: 'badge-danger',
  CONVERTIDA_EXPEDIENTE: 'badge-success',
};

function EstadoBadge({ estado }: { estado: string }) {
  const badgeClass = ESTADO_BADGE_CLASS[estado] || 'badge-secondary';
  return (
    <span className={`badge ${badgeClass}`}>
      {estado?.replace(/_/g, ' ')}
    </span>
  );
}

function timeSince(date: string | null) {
  if (!date) return '—';
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return '1 día';
  return `${diff} días`;
}

function getProximaAccionText(c: any) {
  if (c.estado === 'CONVERTIDA_EXPEDIENTE') return 'Gestoría: Integración de Expediente';
  if (c.estado === 'ACEPTADA') {
    const hasValidatedAdvance = c.pagos?.some((payment: any) => payment.estatus === 'VALIDADO' && Number(payment.monto) > 0);
    return hasValidatedAdvance
      ? 'Abogado: Aperturar expediente'
      : 'Administración: Registrar y validar anticipo';
  }
  if (c.estado === 'ENVIADA_CLIENTE' || c.estado === 'EN_NEGOCIACION') return 'Cliente: Decisión de propuesta';
  if (c.estado === 'PRESUPUESTO_RECIBIDO' || c.estado === 'EN_REVISION_ABOGADO') return 'Abogado: Revisar desglose y aprobar';
  if (c.estado === 'ENVIADA_NOTARIA') return 'Notaría: Emisión de presupuesto';
  return 'Recepción: Enviar solicitud a notaría';
}

export default function Cotizaciones() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  const [selectedNotariaFilter, setSelectedNotariaFilter] = useState<string>('TODAS');

  const fetchCotizaciones = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await api.get('/cotizaciones');
      setCotizaciones(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setFetchError(err?.detail || err?.message || 'Error al cargar cotizaciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCotizaciones();
  }, [fetchCotizaciones]);

  useEffect(() => {
    const requestedQuoteId = searchParams.get('cotizacion');
    const requestedProspectId = searchParams.get('prospecto');
    if (requestedQuoteId) setSelectedId(requestedQuoteId);
    if (searchParams.get('nueva') === '1' && requestedProspectId) setIsWizardOpen(true);
  }, [searchParams]);

  // KPI counts
  const borradorCount = cotizaciones.filter(c => c.estado === 'BORRADOR').length;
  const esperaNotariaCount = cotizaciones.filter(c => c.estado === 'ENVIADA_NOTARIA').length;
  const presupuestoRecibidoCount = cotizaciones.filter(c => c.estado === 'PRESUPUESTO_RECIBIDO' || c.estado === 'EN_REVISION_ABOGADO').length;
  const enviadaClienteCount = cotizaciones.filter(c => c.estado === 'ENVIADA_CLIENTE').length;
  const enNegociacionCount = cotizaciones.filter(c => c.estado === 'EN_NEGOCIACION').length;
  const aceptadasCount = cotizaciones.filter(c => c.estado === 'ACEPTADA' || c.estado === 'CONVERTIDA_EXPEDIENTE').length;
  const rechazadasCount = cotizaciones.filter(c => c.estado === 'RECHAZADA' || c.estado === 'VENCIDA').length;
  const retrasadasCount = cotizaciones.filter(c => c.fecha_limite_respuesta_notaria && new Date(c.fecha_limite_respuesta_notaria) < new Date()).length;

  const notariasList = Array.from(new Set(cotizaciones.map(c => c.notaria?.nombre).filter(Boolean)));

  // Filtered dataset
  const filtered = cotizaciones.filter(c => {
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      const matchText = (
        c.prospecto?.nombre?.toLowerCase().includes(t) ||
        c.numero_solicitud?.toLowerCase().includes(t) ||
        c.numero_cotizacion?.toLowerCase().includes(t) ||
        c.prospecto?.tipo_acto?.toLowerCase().includes(t) ||
        c.notaria?.nombre?.toLowerCase().includes(t) ||
        c.creada_por?.nombre?.toLowerCase().includes(t)
      );
      if (!matchText) return false;
    }

    if (selectedEstado !== 'TODOS' && c.estado !== selectedEstado) {
      return false;
    }

    if (selectedNotariaFilter !== 'TODAS' && c.notaria?.nombre !== selectedNotariaFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="module-page cotizaciones-page">

      {/* ── A. ENCABEZADO ── */}
      <div className="module-page-header">
        <div>
          <span className="module-eyebrow">Operación comercial</span>
          <h1 className="module-title">Centro de Cotizaciones</h1>
          <p className="module-description">
            Solicitudes a notaría, presupuestos y seguimiento comercial.
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSearchParams({});
            setIsWizardOpen(true);
          }}
          className="btn btn-primary"
          style={{ whiteSpace: 'nowrap' }}
        >
          <Plus size={18} />
          <span>Iniciar nueva cotización</span>
        </button>
      </div>

      {/* ── B. TARJETAS KPI (GRID RESPONSIVE 4 COLUMNAS) ── */}
      <div className="quote-kpi-grid">
        
        {/* KPI 1 */}
        <div 
          onClick={() => setSelectedEstado('BORRADOR')}
          className="quote-stat-card hover-bg-tertiary"
          style={{ cursor: 'pointer', padding: 'var(--space-4)', borderColor: selectedEstado === 'BORRADOR' ? 'var(--color-primary)' : 'var(--border-color)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span>Borradores</span>
            <FileText size={16} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>{borradorCount}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>en preparación</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div 
          onClick={() => setSelectedEstado('ENVIADA_NOTARIA')}
          className="quote-stat-card hover-bg-tertiary"
          style={{ cursor: 'pointer', padding: 'var(--space-4)', borderColor: selectedEstado === 'ENVIADA_NOTARIA' ? 'var(--color-primary)' : 'var(--border-color)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span>Espera Notaría</span>
            <Clock size={16} color="var(--color-info)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-info)' }}>{esperaNotariaCount}</span>
            {retrasadasCount > 0 ? (
              <span className="badge badge-danger"><AlertCircle size={12} aria-hidden="true" /> {retrasadasCount} retrasada</span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Al día</span>
            )}
          </div>
        </div>

        {/* KPI 3 */}
        <div 
          onClick={() => setSelectedEstado('PRESUPUESTO_RECIBIDO')}
          className="quote-stat-card hover-bg-tertiary"
          style={{ cursor: 'pointer', padding: 'var(--space-4)', borderColor: selectedEstado === 'PRESUPUESTO_RECIBIDO' ? 'var(--color-primary)' : 'var(--border-color)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span>Presupuesto Recibido</span>
            <Building2 size={16} color="var(--color-primary-light)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>{presupuestoRecibidoCount}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>revisar desglose</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div 
          onClick={() => setSelectedEstado('ENVIADA_CLIENTE')}
          className="quote-stat-card hover-bg-tertiary"
          style={{ cursor: 'pointer', padding: 'var(--space-4)', borderColor: selectedEstado === 'ENVIADA_CLIENTE' ? 'var(--color-primary)' : 'var(--border-color)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span>Enviadas Cliente</span>
            <User size={16} color="var(--color-warning)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-warning)' }}>{enviadaClienteCount}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>esperando decisión</span>
          </div>
        </div>

        {/* KPI 5 */}
        <div 
          onClick={() => setSelectedEstado('EN_NEGOCIACION')}
          className="quote-stat-card hover-bg-tertiary"
          style={{ cursor: 'pointer', padding: 'var(--space-4)', borderColor: selectedEstado === 'EN_NEGOCIACION' ? 'var(--color-primary)' : 'var(--border-color)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span>En Negociación</span>
            <RefreshCw size={16} color="var(--color-warning)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-warning)' }}>{enNegociacionCount}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>ajuste propuesta</span>
          </div>
        </div>

        {/* KPI 6 */}
        <div 
          onClick={() => setSelectedEstado('ACEPTADA')}
          className="quote-stat-card hover-bg-tertiary"
          style={{ cursor: 'pointer', padding: 'var(--space-4)', borderColor: selectedEstado === 'ACEPTADA' ? 'var(--color-primary)' : 'var(--border-color)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span>Aceptadas</span>
            <CheckCircle2 size={16} color="var(--color-success)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success)' }}>{aceptadasCount}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>exitosas</span>
          </div>
        </div>

        {/* KPI 7 */}
        <div 
          onClick={() => setSelectedEstado('RECHAZADA')}
          className="quote-stat-card hover-bg-tertiary"
          style={{ cursor: 'pointer', padding: 'var(--space-4)', borderColor: selectedEstado === 'RECHAZADA' ? 'var(--color-primary)' : 'var(--border-color)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span>Rechazadas</span>
            <AlertCircle size={16} color="var(--color-danger)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-danger)' }}>{rechazadasCount}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>sin éxito</span>
          </div>
        </div>

        {/* KPI 8 */}
        <div 
          onClick={() => setSelectedEstado('TODOS')}
          className="quote-stat-card hover-bg-tertiary"
          style={{ cursor: 'pointer', padding: 'var(--space-4)', borderColor: selectedEstado === 'TODOS' ? 'var(--color-primary)' : 'var(--border-color)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span>Total Cotizaciones</span>
            <Layers size={16} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>{cotizaciones.length}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)' }}>mostrar todas</span>
          </div>
        </div>

      </div>

      {/* ── C. BARRA DE ACCIONES Y FILTROS ── */}
      <div className="toolbar-card quote-toolbar">
        
        {/* Search */}
        <div className="data-table-search quote-search">
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por folio, cliente, notaría, acto o abogado..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '38px' }}
          />
        </div>

        {/* Filters */}
        <div className="toolbar-group quote-filters">
          <select 
            value={selectedEstado} 
            onChange={e => setSelectedEstado(e.target.value)}
            className="input-field"
            style={{ width: 'auto' }}
          >
            <option value="TODOS">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="ENVIADA_NOTARIA">Enviada a Notaría</option>
            <option value="PRESUPUESTO_RECIBIDO">Presupuesto recibido</option>
            <option value="ENVIADA_CLIENTE">Enviada al cliente</option>
            <option value="ACEPTADA">Aceptada</option>
            <option value="CONVERTIDA_EXPEDIENTE">Convertida Expediente</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>

          {notariasList.length > 0 && (
            <select 
              value={selectedNotariaFilter} 
              onChange={e => setSelectedNotariaFilter(e.target.value)}
              className="input-field"
              style={{ width: 'auto' }}
            >
              <option value="TODAS">Todas las notarías</option>
              {notariasList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}

          {(searchTerm || selectedEstado !== 'TODOS' || selectedNotariaFilter !== 'TODAS') && (
            <button 
              onClick={() => { setSearchTerm(''); setSelectedEstado('TODOS'); setSelectedNotariaFilter('TODAS'); }}
              className="btn btn-secondary"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── D. TABLA DE COTIZACIONES ── */}
      <div className="data-surface">
        <div className="data-table-scroll">
          {fetchError ? (
            <div className="state-panel state-panel--compact state-panel--error">
              <AlertCircle size={32} style={{ margin: '0 auto var(--space-2)' }} />
              <p>{fetchError}</p>
              <button onClick={fetchCotizaciones} className="btn btn-secondary" style={{ marginTop: 'var(--space-3)' }}>Reintentar</button>
            </div>
          ) : isLoading ? (
            <div className="state-panel state-panel--compact">
              <p>Cargando cotizaciones...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="state-panel">
              <FileText size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} />
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>No se encontraron cotizaciones</h3>
              <p style={{ fontSize: '0.85rem', marginTop: 'var(--space-1)' }}>
                {searchTerm || selectedEstado !== 'TODOS' ? 'Intente ajustar los filtros.' : 'Inicie una nueva cotización con el botón superior.'}
              </p>
            </div>
          ) : (
            <table className="data-table quote-table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Folio</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Cliente</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Acto</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Notaría</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Responsable</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Estado</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Tiempo</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Próxima Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const isRetrasada = c.fecha_limite_respuesta_notaria && new Date(c.fecha_limite_respuesta_notaria) < new Date();
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className="hover-bg-tertiary"
                      style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    >
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                        {c.numero_solicitud || c.numero_cotizacion || 'Borrador'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 500 }}>
                        {c.prospecto?.nombre || 'Sin cliente'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-secondary)' }}>
                        {c.prospecto?.tipo_acto || '—'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-secondary)' }}>
                        {c.notaria?.nombre || '—'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-secondary)' }}>
                        {c.creada_por?.nombre || '—'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <EstadoBadge estado={c.estado} />
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <span>{timeSince(c.fecha_solicitud_notaria)}</span>
                        {isRetrasada && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'var(--color-danger)', fontWeight: 'bold' }}><AlertCircle size={11} aria-hidden="true" /> Retrasada</span>
                        )}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {getProximaAccionText(c)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── WIZARD MODAL ── */}
      <WizardCotizacion
        isOpen={isWizardOpen}
        initialProspectoId={searchParams.get('prospecto')}
        onClose={() => {
          setIsWizardOpen(false);
          setSearchParams({});
        }}
        onSuccess={() => {
          setIsWizardOpen(false);
          setSearchParams({});
          fetchCotizaciones();
        }}
      />

      {/* ── DETAIL SLIDEOVER ── */}
      {selectedId && (
        <CotizacionDetail
          cotizacionId={selectedId}
          onClose={() => {
            setSelectedId(null);
            if (searchParams.get('cotizacion')) setSearchParams({});
          }}
          onUpdate={fetchCotizaciones}
        />
      )}
    </div>
  );
}
