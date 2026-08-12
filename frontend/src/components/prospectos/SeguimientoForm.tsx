import { useState } from 'react';
import { Modal } from '../ui/Modal';

interface SeguimientoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  prospectoNombre: string;
}

const TIPOS = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Correo' },
  { value: 'reunion', label: 'Reunión' },
  { value: 'nota', label: 'Nota interna' },
];

export function SeguimientoForm({ isOpen, onClose, onSubmit, prospectoNombre }: SeguimientoFormProps) {
  const [form, setForm] = useState({
    tipo: 'llamada',
    contenido: '',
    proxima_accion: '',
    fecha_proximo_seguimiento: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contenido.trim()) return;
    onSubmit(form);
    setForm({ tipo: 'llamada', contenido: '', proxima_accion: '', fecha_proximo_seguimiento: '' });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Nuevo Seguimiento — ${prospectoNombre}`}
      maxWidth="520px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" form="seguimiento-form" type="submit">Registrar Seguimiento</button>
        </>
      }
    >
      <form id="seguimiento-form" className="prospect-form" onSubmit={handleSubmit}>
        
        {/* Tipo */}
        <div className="form-field">
          <label className="input-label">Tipo de contacto</label>
          <div className="choice-row choice-row--wrap">
            {TIPOS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, tipo: t.value }))}
                aria-pressed={form.tipo === t.value}
                className="choice-button choice-button--compact"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${form.tipo === t.value ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  background: form.tipo === t.value ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comentario */}
        <div className="form-field">
          <label className="input-label">Comentario *</label>
          <textarea
            className="input-field"
            rows={4}
            required
            value={form.contenido}
            onChange={e => setForm(prev => ({ ...prev, contenido: e.target.value }))}
            placeholder="Descripción de lo que ocurrió..."
            style={{ resize: 'none' }}
          />
        </div>

        {/* Próxima acción */}
        <div className="form-field">
          <label className="input-label">Próxima acción (opcional)</label>
          <input
            type="text"
            className="input-field"
            value={form.proxima_accion}
            onChange={e => setForm(prev => ({ ...prev, proxima_accion: e.target.value }))}
            placeholder="Ej. Enviar cotización, llamar la próxima semana..."
          />
        </div>

        {/* Fecha próximo seguimiento */}
        <div className="form-field">
          <label className="input-label">Fecha del próximo seguimiento</label>
          <input
            type="date"
            className="input-field"
            value={form.fecha_proximo_seguimiento}
            onChange={e => setForm(prev => ({ ...prev, fecha_proximo_seguimiento: e.target.value }))}
          />
        </div>

      </form>
    </Modal>
  );
}
