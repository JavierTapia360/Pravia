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
            form="prospecto-form"
            type="submit"
            disabled={isLoading || !form.nombre.trim()}
            className="btn btn-primary modal-primary-action"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spinner" />
                Guardando…
              </>
            ) : (
              isEditing ? 'Guardar Cambios' : 'Crear Prospecto'
            )}
          </button>
        </>
      }
    >
      {/* Error banner */}
      {error && <div className="form-alert" role="alert">{error}</div>}

      <form id="prospecto-form" className="prospect-form" onSubmit={handleSubmit}>
        {/* Datos de Contacto */}
        <h3 className="form-section-title">
          Datos de Contacto
        </h3>

        <div className="form-grid">
          <div className="form-field">
            <label className="input-label">Nombre *</label>
            <input
              type="text"
              className="input-field"
              value={form.nombre}
              onChange={e => handleChange('nombre', e.target.value)}
              placeholder="Nombre completo"
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="input-label">Teléfono</label>
            <input type="tel" className="input-field" value={form.telefono} onChange={e => handleChange('telefono', e.target.value)} placeholder="55 0000 0000" />
          </div>
          <div className="form-field">
            <label className="input-label">Correo electrónico</label>
            <input type="email" className="input-field" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="correo@ejemplo.com" />
          </div>
          <div className="form-field">
            <label className="input-label">Ciudad</label>
            <input type="text" className="input-field" value={form.ciudad} onChange={e => handleChange('ciudad', e.target.value)} placeholder="Ciudad de México" />
          </div>
        </div>

        {/* Datos del Servicio */}
        <h3 className="form-section-title form-section-title--spaced">
          Datos del Servicio
        </h3>

        <div className="form-grid">
          <div className="form-field">
            <label className="input-label">Tipo de acto</label>
            <select className="input-field" value={form.tipo_acto} onChange={e => handleChange('tipo_acto', e.target.value)}>
              <option value="">Seleccionar...</option>
              {TIPOS_ACTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="input-label">Fuente del prospecto</label>
            <select className="input-field" value={form.fuente} onChange={e => handleChange('fuente', e.target.value)}>
              <option value="">Seleccionar...</option>
              {FUENTES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label className="input-label">Necesidad / descripción</label>
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
        <div className="form-field">
          <label className="input-label">Prioridad</label>
          <div className="choice-row">
            {(['ALTA', 'MEDIA', 'BAJA'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handleChange('prioridad', p)}
                aria-pressed={form.prioridad === p}
                className="choice-button"
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
        <div className="form-checks">
          {([
            { field: 'tiene_antecedente', label: '¿Tiene antecedente registral?' },
            { field: 'tiene_predial', label: '¿Tiene predial actualizado?' },
          ] as const).map(({ field, label }) => (
            <label key={field} className="check-label">
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

    </Modal>
  );
}
