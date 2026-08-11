import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Building2, User, FileText, Send, CheckCircle2, Copy, Mail, AlertTriangle, Plus } from 'lucide-react';
import { api } from '../../services/api';

interface WizardCotizacionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────────────
// MAIN WIZARD COMPONENT
// ─────────────────────────────────────────────────────
export default function WizardCotizacion({ isOpen, onClose, onSuccess }: WizardCotizacionProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Wizard State
  const [selectedProspecto, setSelectedProspecto] = useState<any>(null);
  const [selectedNotaria, setSelectedNotaria] = useState<any>(null);
  const [selectedDocs, setSelectedDocs] = useState<any[]>([]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const steps = [
    { id: 1, title: 'Prospecto', icon: User },
    { id: 2, title: 'Notaría', icon: Building2 },
    { id: 3, title: 'Documentos', icon: FileText },
    { id: 4, title: 'Solicitud', icon: Send },
    { id: 5, title: 'Confirmar', icon: CheckCircle2 },
  ];

  if (!isOpen) return null;

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleClose = () => {
    if (currentStep > 1) {
      const choice = window.confirm('¿Desea descartar el progreso de esta solicitud?');
      if (choice) onClose();
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!selectedProspecto?.id) {
      setSubmitError('Debe seleccionar un prospecto.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const userId = localStorage.getItem('pravia_user_id') || undefined;
      await api.post('/cotizaciones', {
        prospecto_id: selectedProspecto.id,
        user_id: userId,
        notaria_id: selectedNotaria?.id || null,
      });
      onSuccess();
    } catch (err: any) {
      const detail = err?.detail || err?.message || 'Error desconocido al crear la solicitud.';
      setSubmitError(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNextDisabled =
    (currentStep === 1 && !selectedProspecto) ||
    (currentStep === 2 && !selectedNotaria);

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 99999,
      backgroundColor: 'rgba(15, 15, 35, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        width: 'min(1140px, calc(100vw - 48px))',
        height: 'min(780px, calc(100vh - 48px))',
        maxWidth: '1140px',
        maxHeight: 'calc(100vh - 48px)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>

        {/* ── A. HEADER FIJO ── */}
        <div style={{
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Nueva Solicitud de Cotización
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Siga el asistente guiado para preparar y solicitar el presupuesto a la notaría
            </p>
          </div>
          <button className="btn-icon" onClick={handleClose} title="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        {/* ── B. BARRA DE PASOS EN UNA LÍNEA ── */}
        <div style={{
          padding: 'var(--space-3) var(--space-6)',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-primary)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: '1px solid',
                    backgroundColor: isActive 
                      ? 'var(--color-primary)' 
                      : isCompleted 
                      ? 'rgba(34, 197, 94, 0.2)' 
                      : 'var(--bg-tertiary)',
                    borderColor: isActive 
                      ? 'var(--color-primary-light)' 
                      : isCompleted 
                      ? 'var(--color-success)' 
                      : 'var(--border-color)',
                    color: isActive || isCompleted ? '#ffffff' : 'var(--text-muted)'
                  }}>
                    {isCompleted ? <CheckCircle2 size={16} color="var(--color-success)" /> : <Icon size={16} />}
                  </div>

                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--text-primary)' : isCompleted ? 'var(--color-success)' : 'var(--text-muted)'
                  }}>
                    {step.id}. {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── C. BODY INTERNO (SCROLL SINGLE VERTICAL) ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-6)',
          background: 'var(--bg-primary)',
          minHeight: 0
        }}>
          {submitError && (
            <div className="badge badge-danger" style={{ width: '100%', padding: 'var(--space-3)', marginBottom: 'var(--space-4)', fontSize: '0.85rem', borderRadius: 'var(--radius-md)' }}>
              ❌ {submitError}
            </div>
          )}

          {currentStep === 1 && (
            <Step1Prospecto selected={selectedProspecto} onSelect={setSelectedProspecto} />
          )}
          {currentStep === 2 && (
            <Step2Notaria selected={selectedNotaria} onSelect={setSelectedNotaria} />
          )}
          {currentStep === 3 && (
            <Step3Documentos prospecto={selectedProspecto} selectedDocs={selectedDocs} setSelectedDocs={setSelectedDocs} />
          )}
          {currentStep === 4 && (
            <Step4Solicitud prospecto={selectedProspecto} notaria={selectedNotaria} docs={selectedDocs} />
          )}
          {currentStep === 5 && (
            <Step5Confirmacion prospecto={selectedProspecto} notaria={selectedNotaria} docs={selectedDocs} />
          )}
        </div>

        {/* ── D. FOOTER FIJO ── */}
        <div style={{
          padding: 'var(--space-4) var(--space-6)',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <button className="btn btn-secondary" onClick={handleClose}>
            Cancelar
          </button>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              className="btn btn-secondary"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft size={16} />
              <span>Atrás</span>
            </button>

            {currentStep < 5 ? (
              <button
                className="btn btn-primary"
                onClick={nextStep}
                disabled={isNextDisabled}
              >
                <span>Continuar</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ backgroundColor: 'var(--color-success)' }}
              >
                {isSubmitting ? (
                  <span>Creando...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Crear solicitud</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────
// STEP 1 — Seleccionar Prospecto (Grid 2 Columnas con Resumen)
// ─────────────────────────────────────────────────────
function Step1Prospecto({ selected, onSelect }: { selected: any, onSelect: (p: any) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [prospectos, setProspectos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/prospectos')
      .then((data: any) => {
        const active = (Array.isArray(data) ? data : data.data || []).filter(
          (p: any) => p.estado !== 'ARCHIVADO' && p.estado !== 'EXPEDIENTE_CREADO'
        );
        setProspectos(active);
      })
      .catch(() => setProspectos([]))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = prospectos.filter((p: any) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(t) ||
      p.telefono?.toLowerCase().includes(t) ||
      p.email?.toLowerCase().includes(t) ||
      p.tipo_acto?.toLowerCase().includes(t) ||
      p.atendido_por?.nombre?.toLowerCase().includes(t)
    );
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 'var(--space-6)', height: '100%' }}>
      
      {/* Panel Izquierdo — Lista y Buscador */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Seleccionar Prospecto
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Seleccione el prospecto activo que originará la cotización.
          </p>
        </div>

        {/* Input de Búsqueda */}
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono, correo, acto o abogado..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="input-field"
        />

        {/* Lista de Prospectos en Tarjetas Oscuras */}
        <div className="glass-panel" style={{ overflowY: 'auto', maxHeight: '360px', padding: 'var(--space-2)' }}>
          {isLoading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Cargando prospectos...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
              {searchTerm ? 'Sin resultados para la búsqueda.' : 'No hay prospectos activos disponibles.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {filtered.map((p: any) => {
                const hasActive = p.cotizacion && !['RECHAZADA', 'VENCIDA', 'CONVERTIDA_EXPEDIENTE'].includes(p.cotizacion.estado);
                const isSel = selected?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelect(p)}
                    className="glass-card hover-bg-tertiary"
                    style={{
                      cursor: 'pointer',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      borderColor: isSel ? 'var(--color-primary)' : 'var(--border-color)',
                      backgroundColor: isSel ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                      boxShadow: isSel ? 'var(--shadow-glow)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{p.nombre}</span>
                      <span className="badge badge-info">{p.estado?.replace(/_/g, ' ')}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-1) var(--space-4)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Acto:</span> {p.tipo_acto || '—'}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Tel:</span> {p.telefono || '—'}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Responsable:</span> {p.atendido_por?.nombre || '—'}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Docs:</span> {p.documentos?.length || 0}</div>
                    </div>

                    {hasActive && (
                      <div className="badge badge-warning" style={{ marginTop: 'var(--space-2)', width: '100%', justifyContent: 'flex-start' }}>
                        ⚠️ Este prospecto ya tiene una cotización en proceso
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Acceso Rápido */}
        <div style={{ textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={() => alert('Función de creación rápida de prospecto disponible desde el módulo Prospectos.')}
            className="btn btn-secondary" 
            style={{ fontSize: '0.8rem' }}
          >
            <Plus size={14} />
            <span>+ Crear prospecto rápido</span>
          </button>
        </div>
      </div>

      {/* Panel Derecho — Resumen del Prospecto */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', height: 'fit-content' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
          Resumen del Prospecto
        </h4>

        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: '0.85rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Cliente</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selected.nombre}</span>
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{selected.email || 'Sin correo'}</span>
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{selected.telefono || 'Sin teléfono'}</span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Acto Solicitado</span>
              <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{selected.tipo_acto || 'No especificado'}</span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Necesidad / Descripción</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{selected.necesidad || 'Sin detalles registrados'}</span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Documentos Disponibles</span>
              <span style={{ color: 'var(--text-secondary)' }}>{selected.documentos_disponibles || 'No especificado'}</span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Abogado Responsable</span>
              <span style={{ color: 'var(--text-primary)' }}>{selected.atendido_por?.nombre || 'No asignado'}</span>
            </div>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-8) 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <User size={32} style={{ margin: '0 auto var(--space-2)', opacity: 0.3 }} />
            <p>Seleccione un prospecto para visualizar su resumen.</p>
          </div>
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────
// STEP 2 — Seleccionar Notaría
// ─────────────────────────────────────────────────────
function Step2Notaria({ selected, onSelect }: { selected: any, onSelect: (n: any) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customDays, setCustomDays] = useState<number | ''>('');
  const [notarias, setNotarias] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Create Modal State
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickNum, setQuickNum] = useState('');
  const [quickNombre, setQuickNombre] = useState('');
  const [quickTitular, setQuickTitular] = useState('');
  const [quickMunicipio, setQuickMunicipio] = useState('Tepic');
  const [quickTelefono, setQuickTelefono] = useState('');
  const [quickEmail, setQuickEmail] = useState('');

  const loadNotarias = () => {
    setIsLoading(true);
    api.get('/notarias')
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setNotarias(list);
        if (!selected && list.length > 0) {
          const predef = list.find((n: any) => n.predeterminada && n.activa) || list[0];
          if (predef) handleSelect(predef);
        }
      })
      .catch(() => setNotarias([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadNotarias();
  }, []);

  const filtered = notarias.filter((n: any) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      n.nombre?.toLowerCase().includes(t) ||
      n.numero_notaria?.toLowerCase().includes(t) ||
      n.notario_titular?.toLowerCase().includes(t) ||
      n.municipio?.toLowerCase().includes(t) ||
      n.ciudad?.toLowerCase().includes(t)
    );
  });

  const handleSelect = (n: any) => {
    const days = n.dias_respuesta_estimados || 3;
    setCustomDays(days);
    onSelect({ ...n, dias_respuesta_estimados_ajustados: days });
  };

  const handleDaysChange = (val: string) => {
    const num = parseInt(val, 10);
    setCustomDays(isNaN(num) ? '' : num);
    if (selected && !isNaN(num)) onSelect({ ...selected, dias_respuesta_estimados_ajustados: num });
  };

  const handleSaveQuickNotaria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNombre.trim()) return;
    try {
      const newNotaria = await api.post('/notarias', {
        numero_notaria: quickNum.trim() || undefined,
        nombre: quickNombre.trim(),
        notario_titular: quickTitular.trim() || undefined,
        municipio: quickMunicipio.trim() || 'Tepic',
        entidad_federativa: 'Nayarit',
        telefono: quickTelefono.trim() || undefined,
        correo_general: quickEmail.trim() || undefined,
        activa: true
      });
      setShowQuickModal(false);
      setQuickNum(''); setQuickNombre(''); setQuickTitular(''); setQuickTelefono(''); setQuickEmail('');
      loadNotarias();
      handleSelect(newNotaria);
    } catch (err: any) {
      alert(err.message || 'Error al registrar notaría');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 'var(--space-6)', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Seleccionar Notaría</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Elija la notaría responsable del trámite notarial y presupuesto desglosado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowQuickModal(true)}
            className="btn-secondary text-gold"
            style={{ fontSize: '0.8rem', padding: '6px 12px', fontWeight: 700, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            + Registrar nueva notaría
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por número, nombre, notario o municipio..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="input-field"
        />

        <div className="glass-panel" style={{ overflowY: 'auto', maxHeight: '360px', padding: 'var(--space-2)' }}>
          {isLoading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando catálogo de notarías...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron notarías.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {filtered.map((n: any) => {
                const isSel = selected?.id === n.id;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleSelect(n)}
                    className="glass-card hover-bg-tertiary"
                    style={{
                      cursor: 'pointer',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      borderColor: isSel ? 'var(--color-primary)' : 'var(--border-color)',
                      backgroundColor: isSel ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{n.nombre}</span>
                        {n.predeterminada && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>⭐ Predeterminada</span>
                        )}
                      </div>
                      <span className="badge badge-secondary">{n.municipio || n.ciudad || 'Tepic'}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Notario Titular:</span> {n.notario_titular || '—'}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Contacto:</span> {n.telefono || n.correo_general || '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resumen de Notaría */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', height: 'fit-content' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
          Notaría Seleccionada
        </h4>

        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: '0.85rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Nombre</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selected.nombre}</span>
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{selected.correo_general || selected.email || 'Sin correo'}</span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Días de Respuesta Estimados</span>
              <input
                type="number"
                min="1"
                value={customDays}
                onChange={e => handleDaysChange(e.target.value)}
                className="input-field"
                style={{ marginTop: 'var(--space-1)' }}
              />
            </div>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-8) 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Selecciona una notaría de la lista.
          </div>
        )}
      </div>

      {/* MODAL REGISTRO RÁPIDO DE NOTARÍA */}
      {showQuickModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <form onSubmit={handleSaveQuickNotaria} className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Alta Rápida de Notaría</h4>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Número de Notaría</label>
              <input type="text" placeholder="Ej. 5" value={quickNum} onChange={e => setQuickNum(e.target.value)} className="input-field" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nombre / Denominación *</label>
              <input type="text" placeholder="Ej. Notaría Pública No. 5" value={quickNombre} onChange={e => setQuickNombre(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Notario Titular</label>
              <input type="text" placeholder="Ej. Lic. Fernando Mendoza" value={quickTitular} onChange={e => setQuickTitular(e.target.value)} className="input-field" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Municipio</label>
                <input type="text" value={quickMunicipio} onChange={e => setQuickMunicipio(e.target.value)} className="input-field" />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Teléfono</label>
                <input type="text" placeholder="311-000-0000" value={quickTelefono} onChange={e => setQuickTelefono(e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Correo Electrónico</label>
              <input type="email" placeholder="contacto@notaria5.mx" value={quickEmail} onChange={e => setQuickEmail(e.target.value)} className="input-field" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowQuickModal(false)} className="btn-secondary" style={{ fontSize: '0.8rem' }}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ fontSize: '0.8rem' }}>Guardar y Seleccionar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// STEP 3 — Revisar Documentos
// ─────────────────────────────────────────────────────
function Step3Documentos({ prospecto, selectedDocs, setSelectedDocs }: { prospecto: any, selectedDocs: any[], setSelectedDocs: (d: any[]) => void }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && prospecto?.documentos?.length > 0) {
      setSelectedDocs(prospecto.documentos);
      setInitialized(true);
    }
  }, [prospecto, initialized, setSelectedDocs]);

  const toggleDoc = (doc: any) => {
    const already = selectedDocs.some((d: any) => d.id === doc.id);
    if (already) {
      setSelectedDocs(selectedDocs.filter((d: any) => d.id !== doc.id));
    } else {
      setSelectedDocs([...selectedDocs, doc]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Revisar Documentos</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Seleccione cuáles expedientes digitales de {prospecto?.nombre} adjuntar a la solicitud.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
        {!prospecto?.documentos || prospecto.documentos.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto var(--space-2)', opacity: 0.3 }} />
            <p>El prospecto no tiene documentos cargados actualmente.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {prospecto.documentos.map((doc: any) => {
              const isChecked = selectedDocs.some((d: any) => d.id === doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc)}
                  className="glass-card hover-bg-tertiary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    cursor: 'pointer',
                    borderColor: isChecked ? 'var(--color-primary)' : 'var(--border-color)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="checkbox-custom"
                  />
                  <FileText size={20} color="var(--color-primary-light)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {doc.nombre_original || `Documento ${doc.id?.slice(0, 6)}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.tipo || 'General'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// STEP 4 — Solicitud Generada
// ─────────────────────────────────────────────────────
function Step4Solicitud({ prospecto, notaria, docs }: { prospecto: any, notaria: any, docs: any[] }) {
  const docsList = docs.length > 0
    ? docs.map(d => `  - ${d.tipo || 'Documento'} (${d.nombre_original || d.id?.slice(0, 8)})`).join('\n')
    : '  (Sin documentos adjuntos)';

  const defaultSubject = `[${notaria?.nombre || 'Notaría'}] – SOLICITUD COTIZACIÓN – ${prospecto?.tipo_acto || 'Acto'} – ${prospecto?.nombre || 'Cliente'}`;
  const defaultBody = `Estimados Notaría ${notaria?.nombre || ''}:

Solicitamos atentamente la emisión de presupuesto desglosado para el siguiente acto:

- Acto: ${prospecto?.tipo_acto || 'No especificado'}
- Cliente: ${prospecto?.nombre || 'No especificado'}

Documentación disponible adjunta:
${docsList}

Quedamos atentos a sus comentarios.

Atentamente,
PRAVIA OS`;

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Solicitud de Cotización</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Revise el borrador de correo que será enviado a la notaría.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div>
          <label className="input-label">Destinatario (Notaría)</label>
          <input type="text" readOnly value={notaria?.email || 'Sin correo registrado'} className="input-field" />
        </div>

        <div>
          <label className="input-label">Asunto</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="input-field" />
        </div>

        <div>
          <label className="input-label">Cuerpo de la Solicitud</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            className="input-field"
            rows={10}
            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// STEP 5 — Confirmación
// ─────────────────────────────────────────────────────
function Step5Confirmacion({ prospecto, notaria, docs }: { prospecto: any, notaria: any, docs: any[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Confirmar e Iniciar Cotización</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Verifique el resumen final antes de crear el folio oficial de cotización.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Prospecto</span>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{prospecto?.nombre}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{prospecto?.tipo_acto}</div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Notaría</span>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{notaria?.nombre}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{notaria?.dias_respuesta_estimados_ajustados || notaria?.dias_respuesta_estimados} días respuesta</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 'var(--space-2)' }}>
            Documentos Adjuntos ({docs.length})
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {docs.map(d => (
              <span key={d.id} className="badge badge-info">
                <FileText size={12} />
                {d.nombre_original || d.tipo || 'Documento'}
              </span>
            ))}
          </div>
        </div>

        <div className="badge badge-success" style={{ padding: 'var(--space-3)', width: '100%', justifyContent: 'flex-start' }}>
          <CheckCircle2 size={18} />
          <span>Al hacer clic en "Crear solicitud", el sistema registrará la cotización en estado Borrador y notificará a la notaría.</span>
        </div>
      </div>
    </div>
  );
}
