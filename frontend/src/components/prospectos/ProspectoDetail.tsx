import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlideOver } from '../ui/SlideOver';
import { Timeline, TimelineEvent } from '../ui/Timeline';
import { Badge } from '../ui/Badge';
import { SeguimientoForm } from './SeguimientoForm';
import { DocumentosTab } from './DocumentosTab';
import { Prospecto, useProspectoStore } from '../../stores/prospectoStore';
import { 
  Phone, Mail, MapPin, Calendar, AlertTriangle, FileText, Plus, 
  ArrowRight, User, Flag, MessageSquare, Handshake, BookOpen, Clock, ArchiveX
} from 'lucide-react';

const TIPO_ICONS: Record<string, any> = {
  llamada: <Phone size={14} />,
  whatsapp: <MessageSquare size={14} />,
  email: <Mail size={14} />,
  reunion: <Handshake size={14} />,
  nota: <BookOpen size={14} />,
};

const TIPO_COLORS: Record<string, string> = {
  llamada: 'var(--color-primary)',
  whatsapp: 'var(--color-success)',
  email: 'var(--color-info)',
  reunion: 'var(--color-warning)',
  nota: 'var(--text-muted)',
};

const ESTADO_VARIANT: Record<string, any> = {
  NUEVO: 'info',
  INFO_PENDIENTE: 'warning',
  DOCS_RECIBIDOS: 'default',
  EN_REVISION: 'primary',
  COTIZACION_SOLICITADA: 'warning',
  COTIZACION_ENVIADA: 'primary',
  SEGUIMIENTO: 'info',
  ACEPTADO: 'success',
  PERDIDO: 'danger',
  CANCELADO: 'danger',
  ARCHIVADO: 'default',
};

const PRIORIDAD_COLOR: Record<string, string> = {
  ALTA: 'var(--color-danger)',
  MEDIA: 'var(--color-warning)',
  BAJA: 'var(--color-info)',
};

const ESTADOS = [
  'NUEVO', 'INFO_PENDIENTE', 'DOCS_RECIBIDOS', 'EN_REVISION',
  'COTIZACION_SOLICITADA', 'COTIZACION_ENVIADA', 'SEGUIMIENTO', 'ACEPTADO', 'PERDIDO', 'CANCELADO'
];

interface ProspectoDetailProps {
  prospecto: Prospecto | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (p: Prospecto) => void;
  onArchive?: (p: Prospecto) => void;
}

export function ProspectoDetail({ prospecto, isOpen, onClose, onEdit, onArchive }: ProspectoDetailProps) {
  const navigate = useNavigate();
  const { fetchProspectoById, selectedProspecto, addSeguimiento, updateProspecto } = useProspectoStore();
  const [showSeguimientoForm, setShowSeguimientoForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumen' | 'historial' | 'documentos'>('resumen');

  useEffect(() => {
    if (isOpen && prospecto?.id) {
      fetchProspectoById(prospecto.id);
    }
  }, [isOpen, prospecto?.id]);

  const detail = selectedProspecto?.id === prospecto?.id ? selectedProspecto : prospecto;

  if (!detail) return null;

  const timelineEvents: TimelineEvent[] = (detail.seguimientos || []).map(s => {
    const isVencido = s.fecha_proximo_seguimiento && new Date(s.fecha_proximo_seguimiento) < new Date();
    return {
      id: s.id,
      date: new Date(s.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      title: `${s.tipo.charAt(0).toUpperCase() + s.tipo.slice(1)} — ${s.usuario?.nombre || 'Sistema'}`,
      icon: TIPO_ICONS[s.tipo] || <FileText size={14} />,
      iconColor: TIPO_COLORS[s.tipo],
      description: (
        <div>
          <div>{s.contenido}</div>
          {s.proxima_accion && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <ArrowRight size={12} />
              {s.proxima_accion}
            </div>
          )}
          {s.fecha_proximo_seguimiento && (
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: isVencido ? 'var(--color-danger)' : 'var(--text-muted)' }}>
              <Clock size={12} />
              Siguiente: {new Date(s.fecha_proximo_seguimiento).toLocaleDateString('es-MX')}
              {isVencido && <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}> ¡VENCIDO!</span>}
            </div>
          )}
        </div>
      ),
    };
  });

  // Check for stale / overdue
  const ultimoSeguimiento = detail.seguimientos?.[0];
  const diasSinSeguimiento = ultimoSeguimiento
    ? Math.floor((Date.now() - new Date(ultimoSeguimiento.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - new Date(detail.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const isStale = diasSinSeguimiento >= 5;

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      width="680px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{detail.nombre}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '2px' }}>
              <Badge variant={ESTADO_VARIANT[detail.estado]}>{detail.estado?.replace(/_/g, ' ')}</Badge>
              <span style={{ fontSize: '0.75rem', color: PRIORIDAD_COLOR[detail.prioridad], display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Flag size={12} /> {detail.prioridad}
              </span>
            </div>
          </div>
        </div>
      }
    >
      <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        
        {/* Alerta de estancamiento */}
        {isStale && (
          <div style={{ background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', border: '1px solid var(--color-warning)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <AlertTriangle size={18} color="var(--color-warning)" />
            <span style={{ fontSize: '0.9rem' }}>
              Sin seguimiento hace <strong>{diasSinSeguimiento} días</strong>. Este prospecto puede estar estancado.
            </span>
          </div>
        )}

        {/* Acciones rápidas */}
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowSeguimientoForm(true)}>
            <Plus size={16} /> Agregar Seguimiento
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => {
              onClose();
              if (detail.cotizacion?.id) {
                navigate(`/cotizaciones?cotizacion=${detail.cotizacion.id}`);
              } else {
                navigate(`/cotizaciones?nueva=1&prospecto=${detail.id}`);
              }
            }}
          >
            <FileText size={16} /> {detail.cotizacion?.id ? 'Abrir Cotización' : 'Generar Cotización'}
          </button>
          <button className="btn btn-secondary" onClick={() => onEdit(detail)}>
            Editar
          </button>
          {onArchive && (
            <button className="btn btn-danger" onClick={() => onArchive(detail)} title="Archivar prospecto">
              <ArchiveX size={16} />
            </button>
          )}
        </div>

        {/* Cambio de estado */}
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cambiar Estado</label>
          <select 
            className="input-field"
            value={detail.estado}
            onChange={e => updateProspecto(detail.id, { estado: e.target.value as any })}
            style={{ background: 'var(--bg-tertiary)' }}
          >
            {ESTADOS.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {/* Tabs Navegación */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', marginTop: 'var(--space-2)' }}>
          <button 
            onClick={() => setActiveTab('resumen')}
            style={{ padding: 'var(--space-2) 0', borderBottom: activeTab === 'resumen' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'resumen' ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'resumen' ? 600 : 500, background: 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Resumen
          </button>
          <button 
            onClick={() => setActiveTab('historial')}
            style={{ padding: 'var(--space-2) 0', borderBottom: activeTab === 'historial' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'historial' ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'historial' ? 600 : 500, background: 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Historial ({timelineEvents.length})
          </button>
          <button 
            onClick={() => setActiveTab('documentos')}
            style={{ padding: 'var(--space-2) 0', borderBottom: activeTab === 'documentos' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'documentos' ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'documentos' ? 600 : 500, background: 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Documentos
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'resumen' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div className="glass-card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 'var(--space-4)' }}>Datos de Contacto</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {detail.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.9rem' }}><Phone size={16} className="text-muted" /> {detail.telefono}</div>}
                {detail.email && <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.9rem' }}><Mail size={16} className="text-muted" /> {detail.email}</div>}
                {detail.ciudad && <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.9rem' }}><MapPin size={16} className="text-muted" /> {detail.ciudad}</div>}
                {detail.tipo_acto && <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.9rem' }}><FileText size={16} className="text-muted" /> {detail.tipo_acto}</div>}
                {detail.atendido_por && <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.9rem' }}><User size={16} className="text-muted" /> {detail.atendido_por.nombre}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.9rem' }}>
                  <Calendar size={16} className="text-muted" />
                  Alta: {new Date(detail.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Necesidad / Descripción */}
            {detail.necesidad && (
              <div className="glass-card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>Necesidad del Cliente</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {detail.necesidad}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'historial' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
              <button className="btn btn-primary" onClick={() => setShowSeguimientoForm(true)}>
                <Plus size={16} /> Agregar Seguimiento
              </button>
            </div>
            {timelineEvents.length > 0 ? (
              <Timeline events={timelineEvents} />
            ) : (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                No hay seguimientos registrados.
              </div>
            )}
          </div>
        )}

        {activeTab === 'documentos' && (
          <DocumentosTab prospectoId={detail.id} />
        )}

      </div>

      <SeguimientoForm
        isOpen={showSeguimientoForm}
        onClose={() => setShowSeguimientoForm(false)}
        prospectoNombre={detail.nombre}
        onSubmit={data => addSeguimiento(detail.id, data)}
      />
    </SlideOver>
  );
}
