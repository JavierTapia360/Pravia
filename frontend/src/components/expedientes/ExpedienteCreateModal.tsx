import React, { useState, useEffect } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useExpedienteStore } from '../../stores/expedienteStore';
import { useToastStore } from '../../stores/toastStore';
import { api } from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpedienteCreateModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createExpediente } = useExpedienteStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [tiposActo, setTiposActo] = useState<any[]>([]);
  const [abogados, setAbogados] = useState<any[]>([]);

  const [notarias, setNotarias] = useState<any[]>([]);

  const [form, setForm] = useState({
    tipo_acto_id: '',
    notaria_id: '',
    abogado_id: '',
    cliente_alias: '',
    descripcion: '',
    valor_operacion: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadCatalogos();
    }
  }, [isOpen]);

  const loadCatalogos = async () => {
    try {
      const [actosRes, notariasRes] = await Promise.all([
        api.get('/expedientes/tipos-acto'),
        api.get('/notarias')
      ]);

      const listActos = Array.isArray(actosRes) ? actosRes : [];
      setTiposActo(listActos.length > 0 ? listActos : [
        { id: 'f3bd75ef-9d92-488c-8edb-6d5ad86d43fe', nombre: 'Compraventa Inmobiliaria' }
      ]);
      
      const listNotarias = Array.isArray(notariasRes) ? notariasRes : [];
      setNotarias(listNotarias);
      
      setAbogados([
        { id: '3448a30a-fb2b-47e0-bdf1-30ef1dcfbc15', nombre: 'Abogado Responsable' }
      ]);
    } catch (e) {
      setTiposActo([
        { id: 'f3bd75ef-9d92-488c-8edb-6d5ad86d43fe', nombre: 'Compraventa Inmobiliaria' }
      ]);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipo_acto_id || !form.cliente_alias) {
      addToast('Por favor completa los campos requeridos', 'error');
      return;
    }

    setLoading(true);
    try {
      await createExpediente({
        ...form,
        abogado_id: form.abogado_id || '3448a30a-fb2b-47e0-bdf1-30ef1dcfbc15',
        valor_operacion: form.valor_operacion ? Number(form.valor_operacion) : undefined
      });
      addToast('Expediente aperturado exitosamente', 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Error al crear expediente', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Apertura Directa de Expediente</h3>
              <p className="text-xs text-muted">Inicia un trámite jurídico operativo directo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Tipo de Acto / Operación <span className="text-gold">*</span>
            </label>
            <select
              value={form.tipo_acto_id}
              onChange={(e) => setForm({ ...form, tipo_acto_id: e.target.value })}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold/50 cursor-pointer"
              required
            >
              <option value="">Selecciona Tipo de Acto</option>
              {tiposActo.map((t) => (
                <option key={t.id} value={t.id} className="bg-dark-card text-white">
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Cliente / Identificador de la Operación <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Familia García López / Terreno Campestre"
              value={form.cliente_alias}
              onChange={(e) => setForm({ ...form, cliente_alias: e.target.value })}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Notaría Asignada (Editable)
            </label>
            <select
              value={form.notaria_id}
              onChange={(e) => setForm({ ...form, notaria_id: e.target.value })}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold/50 cursor-pointer"
            >
              <option value="">Selecciona Notaría (Opcional)</option>
              {notarias.map((n) => (
                <option key={n.id} value={n.id} className="bg-dark-card text-white">
                  {n.nombre} {n.numero_notaria ? `(No. ${n.numero_notaria})` : ''} {n.predeterminada ? '★ Predeterminada' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
                Abogado Responsable
              </label>
              <select
                value={form.abogado_id}
                onChange={(e) => setForm({ ...form, abogado_id: e.target.value })}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold/50 cursor-pointer"
              >
                {abogados.map((a) => (
                  <option key={a.id} value={a.id} className="bg-dark-card text-white">
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
                Valor Operación ($)
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={form.valor_operacion}
                onChange={(e) => setForm({ ...form, valor_operacion: e.target.value })}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Observaciones / Descripción Inicial
            </label>
            <textarea
              rows={3}
              placeholder="Detalles sobre el inmueble o las condiciones acordadas..."
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gold/50 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-gold hover:bg-gold-light text-dark-bg font-semibold text-sm px-5 py-2 rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Creando Expediente...' : 'Crear Expediente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
