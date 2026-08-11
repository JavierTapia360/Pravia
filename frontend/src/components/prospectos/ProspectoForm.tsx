import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Loader2 } from 'lucide-react';

interface ProspectoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;  // ASYNC — must be awaited
  initialData?: any;
  isEditing?: boolean;
}

const TIPOS_ACTO = [
  'Compraventa', 'Donación', 'Testamento', 'Poderes Notariales', 'Constitución de Empresa',
  'Hipoteca', 'Dación en Pago', 'Acta Notarial', 'Ratificación de Firmas', 'Sucesión', 'Otro'
];

const FUENTES = [
  'Referido', 'Redes Sociales', 'Sitio Web', 'Llamada Directa', 'Anuncio', 'Otro'
];

const EMPTY_FORM = {
  nombre: '',
  telefono: '',
  email: '',
  tipo_acto: '',
  ciudad: '',
  fuente: '',
  prioridad: 'MEDIA',
  necesidad: '',
  tiene_antecedente: false,
  tiene_predial: false,
};

export function ProspectoForm({ isOpen, onClose, onSubmit, initialData, isEditing }: ProspectoFormProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset or populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setForm(initialData ? {
        nombre: initialData.nombre || '',
        telefono: initialData.telefono || '',
        email: initialData.email || '',
        tipo_acto: initialData.tipo_acto || '',
        ciudad: initialData.ciudad || '',
        fuente: initialData.fuente || '',
        prioridad: initialData.prioridad || 'MEDIA',
        necesidad: initialData.necesidad || '',
        tiene_antecedente: initialData.tiene_antecedente || false,
        tiene_predial: initialData.tiene_predial || false,
      } : { ...EMPTY_FORM });
    }
  }, [isOpen, initialData]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!form.nombre.trim()) {
      setError('El nombre del prospecto es obligatorio.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(form);
      // Only close on success
      onClose();
    } catch (err: any) {
      const msg = err?.message || err?.detail || 'Error desconocido al guardar.';
      setError(`Error: ${msg}`);
      console.error('ProspectoForm submit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fieldStyle = { marginBottom: 'var(--space-4)' };
  const labelStyle = { display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 as const };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={isEditing ? 'Editar Prospecto' : 'Nuevo Prospecto'}
      maxWidth="640px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            form="prospecto-form"
            type="submit"
            disabled={isLoading || !form.nombre.trim()}
            style={{ minWidth: '160px' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Guardando...
              </>
            ) : (
              isEditing ? 'Guardar Cambios' : 'Crear Prospecto'
            )}
          </button>
        </>
      }
    >
      {/* Error banner */}
      {error && (
        <div style={{
          background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
          border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
          fontSize: '0.9rem',
          color: 'var(--color-danger)',
        }}>
          {error}
        </div>
      )}

      <form id="prospecto-form" onSubmit={handleSubmit}>
        {/* Datos de Contacto */}
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
          Datos de Contacto
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nombre *</label>
            <input
              type="text"
              className="input-field"
              value={form.nombre}
              onChange={e => handleChange('nombre', e.target.value)}
              placeholder="Nombre completo"
              autoFocus
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Teléfono</label>
            <input type="tel" className="input-field" value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} placeholder="55 0000 0000" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Correo electrónico</label>
            <input type="email" className="input-field" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="correo@ejemplo.com" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Ciudad</label>
            <input type="text" className="input-field" value={form.ciudad} onChange={e => handleChange('ciudad', e.target.value)} placeholder="Ciudad de México" />
          </div>
        </div>

        {/* Datos del Servicio */}
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 'var(--space-4) 0' }}>
          Datos del Servicio
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Tipo de Acto</label>
            <select className="input-field" value={form.tipo_acto} onChange={e => handleChange('tipo_acto', e.target.value)}>
              <option value="">Seleccionar...</option>
              {TIPOS_ACTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Fuente del Prospecto</label>
            <select className="input-field" value={form.fuente} onChange={e => handleChange('fuente', e.target.value)}>
              <option value="">Seleccionar...</option>
              {FUENTES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Necesidad / Descripción</label>
          <textarea
            className="input-field"
            rows={3}
            value={form.necesidad}
            onChange={e => handleChange('necesidad', e.target.value)}
            placeholder="Descripción de lo que necesita..."
            style={{ resize: 'none' }}
          />
        </div>

        {/* Prioridad */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Prioridad</label>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {(['ALTA', 'MEDIA', 'BAJA'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handleChange('prioridad', p)}
                style={{
                  flex: 1, padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${form.prioridad === p
                    ? (p === 'ALTA' ? 'var(--color-danger)' : p === 'MEDIA' ? 'var(--color-warning)' : 'var(--color-info)')
                    : 'var(--border-color)'}`,
                  background: form.prioridad === p
                    ? (p === 'ALTA' ? 'color-mix(in srgb, var(--color-danger) 15%, transparent)'
                      : p === 'MEDIA' ? 'color-mix(in srgb, var(--color-warning) 15%, transparent)'
                      : 'color-mix(in srgb, var(--color-info) 15%, transparent)')
                    : 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontWeight: form.prioridad === p ? 600 : 400,
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Checks */}
        <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
          {([
            { field: 'tiene_antecedente', label: '¿Tiene antecedente registral?' },
            { field: 'tiene_predial', label: '¿Tiene predial actualizado?' },
          ] as const).map(({ field, label }) => (
            <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={!!form[field as keyof typeof form]}
                onChange={e => handleChange(field, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </form>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Modal>
  );
}
