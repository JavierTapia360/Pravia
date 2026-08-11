import { useEffect, useState } from 'react';
import { Plus, Users, AlertTriangle, Filter, X } from 'lucide-react';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ProspectoForm } from '../components/prospectos/ProspectoForm';
import { ProspectoDetail } from '../components/prospectos/ProspectoDetail';
import { useProspectoStore, Prospecto } from '../stores/prospectoStore';
import { useToastStore } from '../stores/toastStore';
import { LoadingState } from '../components/ui/AsyncState';

const ESTADO_VARIANT: Record<string, any> = {
  NUEVO: 'info', INFO_PENDIENTE: 'warning', DOCS_RECIBIDOS: 'default',
  EN_REVISION: 'primary', COTIZACION_SOLICITADA: 'warning', COTIZACION_ENVIADA: 'primary',
  SEGUIMIENTO: 'info', ACEPTADO: 'success', PERDIDO: 'danger',
  CANCELADO: 'danger', ARCHIVADO: 'default',
};

const PRIORIDAD_COLOR: Record<string, string> = {
  ALTA: 'var(--color-danger)', MEDIA: 'var(--color-warning)', BAJA: 'var(--color-info)'
};

const columns: ColumnDef<Prospecto>[] = [
  {
    header: 'Nombre',
    accessorKey: 'nombre',
    sortable: true,
    cell: (row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{row.nombre}</div>
        {row.email && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.email}</div>}
      </div>
    )
  },
  {
    header: 'Tipo de Acto', accessorKey: 'tipo_acto', sortable: true,
    cell: (row) => row.tipo_acto ? <span>{row.tipo_acto}</span> : <span className="text-muted">—</span>
  },
  {
    header: 'Responsable',
    cell: (row) => row.atendido_por ? <span>{row.atendido_por.nombre}</span> : <span className="text-muted">—</span>
  },
  {
    header: 'Estado', accessorKey: 'estado', sortable: true,
    cell: (row) => <Badge variant={ESTADO_VARIANT[row.estado]}>{row.estado?.replace(/_/g, ' ')}</Badge>
  },
  {
    header: 'Prioridad', accessorKey: 'prioridad', sortable: true,
    cell: (row) => (
      <span style={{ color: PRIORIDAD_COLOR[row.prioridad], fontWeight: 600, fontSize: '0.85rem' }}>
        {row.prioridad}
      </span>
    )
  },
  {
    header: 'Ciudad', accessorKey: 'ciudad',
    cell: (row) => row.ciudad || <span className="text-muted">—</span>
  },
  {
    header: 'Fuente', accessorKey: 'fuente',
    cell: (row) => row.fuente || <span className="text-muted">—</span>
  },
  {
    header: 'Último Seguimiento',
    cell: (row) => {
      const s = row.seguimientos?.[0];
      const ref = s ? s.created_at : row.created_at;
      const dias = Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
      if (!s) return <span style={{ color: dias >= 5 ? 'var(--color-danger)' : 'var(--text-muted)', fontSize: '0.85rem' }}>Sin seguimiento ({dias}d)</span>;
      return <span style={{ fontSize: '0.85rem', color: dias >= 5 ? 'var(--color-warning)' : 'var(--text-secondary)' }}>Hace {dias}d</span>;
    }
  },
  {
    header: 'Fecha Alta', accessorKey: 'created_at', sortable: true,
    cell: (row) => (
      <span style={{ fontSize: '0.85rem' }}>
        {new Date(row.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })}
      </span>
    )
  },
  {
    header: 'Teléfono', accessorKey: 'telefono',
    cell: (row) => row.telefono || <span className="text-muted">—</span>
  },
];

export default function Prospectos() {
  const { prospectos, isLoading, fetchProspectos, createProspecto, updateProspecto, archiveProspecto } = useProspectoStore();
  const toast = useToastStore();

  const [showForm, setShowForm] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveMotivo, setArchiveMotivo] = useState('');
  const [editingProspecto, setEditingProspecto] = useState<Prospecto | null>(null);
  const [detailProspecto, setDetailProspecto] = useState<Prospecto | null>(null);
  const [toArchive, setToArchive] = useState<Prospecto | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState('TODOS');
  const [prioridadFilter, setPrioridadFilter] = useState('TODAS');

  useEffect(() => {
    fetchProspectos().catch(() => toast.add('No se pudo conectar al servidor. Verifica que el backend esté corriendo en el puerto 3001.', 'error'));
  }, []);

  const staleCount = prospectos.filter(p => {
    const s = p.seguimientos?.[0];
    const ref = s ? s.created_at : p.created_at;
    return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24)) >= 5;
  }).length;

  const filteredProspectos = prospectos.filter((prospecto) => (
    (estadoFilter === 'TODOS' || prospecto.estado === estadoFilter)
    && (prioridadFilter === 'TODAS' || prospecto.prioridad === prioridadFilter)
  ));

  const handleCreate = async (data: any) => {
    await createProspecto(data);   // throws on error — form shows the error banner
    toast.add('Prospecto creado correctamente.', 'success');
  };

  const handleEdit = async (data: any) => {
    if (!editingProspecto) return;
    await updateProspecto(editingProspecto.id, data);
    toast.add('Prospecto actualizado.', 'success');
    setEditingProspecto(null);
  };

  const handleArchive = async () => {
    if (!toArchive) return;
    setIsArchiving(true);
    try {
      await archiveProspecto(toArchive.id, archiveMotivo || 'Archivado por el usuario');
      toast.add('Prospecto archivado.', 'info');
      setShowArchiveModal(false);
      setDetailProspecto(null);
      setToArchive(null);
    } catch {
      toast.add('Error al archivar el prospecto.', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Users size={28} color="var(--color-primary)" /> Prospectos
          </h1>
          <p className="text-secondary">Motor Comercial — Gestión de contactos y seguimiento</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          {staleCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)', border: '1px solid var(--color-warning)', fontSize: '0.85rem', color: 'var(--color-warning)' }}>
              <AlertTriangle size={15} /> {staleCount} estancado{staleCount > 1 ? 's' : ''}
            </div>
          )}
          <button className="btn btn-primary" onClick={() => { setEditingProspecto(null); setShowForm(true); }}>
            <Plus size={18} /> Nuevo Prospecto
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)', padding: 'var(--space-3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
          <Filter size={15} aria-hidden="true" /> Filtros
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Estado
          <select className="input-field" value={estadoFilter} onChange={(event) => setEstadoFilter(event.target.value)} style={{ width: 'auto', minWidth: '180px' }}>
            <option value="TODOS">Todos</option>
            {Object.keys(ESTADO_VARIANT).map((estado) => <option key={estado} value={estado}>{estado.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Prioridad
          <select className="input-field" value={prioridadFilter} onChange={(event) => setPrioridadFilter(event.target.value)} style={{ width: 'auto', minWidth: '130px' }}>
            <option value="TODAS">Todas</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
        </label>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{filteredProspectos.length} de {prospectos.length}</span>
        {(estadoFilter !== 'TODOS' || prioridadFilter !== 'TODAS') && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEstadoFilter('TODOS'); setPrioridadFilter('TODAS'); }}>
            <X size={14} aria-hidden="true" /> Limpiar
          </button>
        )}
      </div>

      {/* DataTable */}
      {isLoading ? (
        <LoadingState label="Cargando prospectos" rows={6} />
      ) : (
        <DataTable<Prospecto>
          data={filteredProspectos}
          columns={columns}
          searchPlaceholder="Buscar por nombre, correo, teléfono, tipo de acto..."
          globalFilterFn={(item, q) =>
            [item.nombre, item.email, item.telefono, item.tipo_acto, item.ciudad, item.atendido_por?.nombre]
              .some(v => v?.toLowerCase().includes(q))
          }
          onRowClick={(p) => setDetailProspecto(p)}
        />
      )}

      {/* Prospecto Form Modal */}
      <ProspectoForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingProspecto(null); }}
        onSubmit={editingProspecto ? handleEdit : handleCreate}
        initialData={editingProspecto}
        isEditing={!!editingProspecto}
      />

      {/* Prospecto Detail Slide Over */}
      <ProspectoDetail
        prospecto={detailProspecto}
        isOpen={!!detailProspecto}
        onClose={() => setDetailProspecto(null)}
        onEdit={(p) => {
          setEditingProspecto(p);
          setDetailProspecto(null);
          setShowForm(true);
        }}
        onArchive={(p) => {
          setToArchive(p);
          setArchiveMotivo('');
          setShowArchiveModal(true);
        }}
      />

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archivar Prospecto"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowArchiveModal(false)} disabled={isArchiving}>Cancelar</button>
            <button
              className="btn"
              style={{ background: 'var(--color-danger)', color: 'white', minWidth: '130px' }}
              onClick={handleArchive}
              disabled={isArchiving || !archiveMotivo}
            >
              {isArchiving ? 'Archivando...' : 'Confirmar Archivo'}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
          El prospecto <strong>{toArchive?.nombre}</strong> quedará archivado. No se eliminará de la base de datos y podrás consultarlo en el historial.
        </p>
        <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', fontWeight: 500 }}>Motivo *</label>
        <select className="input-field" value={archiveMotivo} onChange={e => setArchiveMotivo(e.target.value)}>
          <option value="">Seleccionar motivo...</option>
          <option value="Perdido - eligió otra opción">Perdido — eligió otra opción</option>
          <option value="Sin respuesta del cliente">Sin respuesta del cliente</option>
          <option value="Cancelado por el cliente">Cancelado por el cliente</option>
          <option value="Registro duplicado">Registro duplicado</option>
          <option value="Servicio no disponible">Servicio no disponible</option>
          <option value="Otro">Otro</option>
        </select>
      </Modal>
    </div>
  );
}
