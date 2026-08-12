import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ExternalLink, Send, Settings2, Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

type InteractionMode = 'proactive' | 'balanced' | 'discreet';
type OwlState = 'idle' | 'greeting' | 'thinking' | 'processing' | 'success';

interface AssistantAction {
  label: string;
  to?: string;
  response: string;
}

interface AssistantContext {
  module: string;
  title: string;
  message: string;
  actions: AssistantAction[];
}

const MODE_LABELS: Record<InteractionMode, string> = {
  proactive: 'Proactivo',
  balanced: 'Equilibrado',
  discreet: 'Discreto',
};

const owlAsset = (state: OwlState) => `/brand/pravia-ai/owl-${state}.png`;

function contextFor(pathname: string): AssistantContext {
  const expedienteMatch = pathname.match(/^\/expedientes\/([^/]+)/);
  if (expedienteMatch) return {
    module: 'Expediente actual',
    title: 'Contexto del expediente',
    message: 'Puedo mantener este expediente como contexto para navegación y acciones asistidas. Las respuestas con datos operativos requieren una herramienta backend autorizada y siempre mostrarán su fuente.',
    actions: [
      { label: 'Ir al resumen', to: pathname, response: 'Te mantengo en el expediente actual. El resumen operativo está en la cabecera y sus pestañas.' },
      { label: 'Abrir Agenda', to: '/agenda', response: 'Abriré Agenda para revisar citas, firmas y vencimientos.' },
    ],
  };
  if (pathname.startsWith('/comparecientes/nuevo')) return {
    module: 'Alta de compareciente',
    title: 'Captura con revisión humana',
    message: 'Al extraer documentos, revisa discrepancias y confirma cada dato antes de guardarlo. PRAVIA IA no convierte una detección en hecho jurídico por sí sola.',
    actions: [{ label: 'Ver catálogo maestro', to: '/comparecientes', response: 'Abriré el catálogo para comprobar si la persona ya existe.' }],
  };
  if (pathname.startsWith('/comparecientes')) return {
    module: 'Comparecientes',
    title: 'Catálogo maestro',
    message: 'Este catálogo debe reutilizar personas existentes. Antes de crear otra, conviene buscar por nombre, RFC o CURP.',
    actions: [{ label: 'Nuevo compareciente', to: '/comparecientes/nuevo', response: 'Abriré el flujo de alta guiada.' }],
  };
  if (pathname.startsWith('/expedientes')) return {
    module: 'Expedientes',
    title: 'Centro operativo',
    message: 'Puedo conservar filtros y ayudarte a navegar al expediente correcto. La consulta de pendientes por expediente se habilitará mediante herramientas con permisos y procedencia.',
    actions: [{ label: 'Abrir Agenda', to: '/agenda', response: 'Abriré Agenda para revisar los próximos compromisos.' }],
  };
  if (pathname.startsWith('/cotizaciones')) return {
    module: 'Cotizaciones',
    title: 'Seguimiento comercial',
    message: 'Las cotizaciones aceptadas pueden convertirse al motor único de apertura. Ninguna conversión debe ejecutarse sin confirmación del usuario.',
    actions: [{ label: 'Ver Expedientes', to: '/expedientes', response: 'Abriré Expedientes para continuar la operación.' }],
  };
  if (pathname.startsWith('/agenda')) return {
    module: 'Agenda',
    title: 'Citas y vencimientos',
    message: 'Puedo ayudarte a preparar una cita o navegar a su expediente. Crear o modificar eventos requerirá confirmación explícita.',
    actions: [{ label: 'Ver Mi Día', to: '/mi-dia', response: 'Abriré Mi Día para revisar prioridades y alertas.' }],
  };
  if (pathname.startsWith('/finanzas')) return {
    module: 'Finanzas',
    title: 'Lectura financiera',
    message: 'Los importes deben provenir del ledger y distinguir presupuesto, valor de operación, cobranza y honorarios. No afirmaré saldos sin una fuente verificable.',
    actions: [{ label: 'Abrir Reportes', to: '/reportes', response: 'Abriré Reportes para revisar indicadores agregados.' }],
  };
  if (pathname.startsWith('/riesgos')) return {
    module: 'Riesgos / UIF',
    title: 'Cumplimiento explicable',
    message: 'Las reglas orientan y la evidencia respalda, pero toda conclusión jurídica o fiscal sensible requiere revisión humana registrada.',
    actions: [{ label: 'Ver Expedientes', to: '/expedientes', response: 'Abriré Expedientes para revisar el contexto operativo.' }],
  };
  if (pathname.startsWith('/notarias')) return {
    module: 'Notarías',
    title: 'Coordinación notarial',
    message: 'Puedo ayudarte a navegar entre notarías y expedientes. Los datos de contacto siempre deben tomarse del directorio vigente.',
    actions: [{ label: 'Ver Agenda', to: '/agenda', response: 'Abriré Agenda para coordinar citas y firmas.' }],
  };
  return {
    module: 'PRAVIA OS',
    title: 'Asistencia contextual',
    message: 'Estoy disponible en todo PRAVIA para orientar navegación y preparar acciones. Las consultas operativas usarán herramientas limitadas por tus permisos y mostrarán sus fuentes.',
    actions: [
      { label: 'Ver Mi Día', to: '/mi-dia', response: 'Abriré Mi Día para revisar tus prioridades.' },
      { label: 'Abrir Expedientes', to: '/expedientes', response: 'Abriré el centro operativo de Expedientes.' },
    ],
  };
}

function fallbackImage(event: React.SyntheticEvent<HTMLImageElement>) {
  if (!event.currentTarget.src.endsWith('/icons/pravia-mark.svg')) event.currentTarget.src = '/icons/pravia-mark.svg';
}

export function PraviaAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<InteractionMode>(() => {
    const saved = window.localStorage.getItem('pravia_ai_mode');
    return saved === 'proactive' || saved === 'discreet' ? saved : 'balanced';
  });
  const [owlState, setOwlState] = useState<OwlState>('idle');
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const context = useMemo(() => contextFor(location.pathname), [location.pathname]);

  useEffect(() => {
    setResponse('');
    setOwlState('idle');
    setShowSuggestion(mode === 'proactive' || (mode === 'balanced' && location.pathname !== '/mi-dia'));
  }, [location.pathname, mode]);

  useEffect(() => {
    window.localStorage.setItem('pravia_ai_mode', mode);
  }, [mode]);

  const openAssistant = () => {
    setOpen(true);
    setShowSuggestion(false);
    setOwlState('greeting');
    window.setTimeout(() => setOwlState('idle'), 900);
  };

  const runAction = (action: AssistantAction) => {
    setResponse(action.response);
    setOwlState('success');
    window.setTimeout(() => {
      setOwlState('idle');
      if (action.to) navigate(action.to);
    }, 500);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = input.trim().toLocaleLowerCase('es-MX');
    if (!query) return;
    setOwlState('thinking');
    window.setTimeout(() => {
      const destination = query.includes('agenda') ? '/agenda'
        : query.includes('expediente') ? '/expedientes'
          : query.includes('compareciente') ? '/comparecientes'
            : query.includes('finanza') || query.includes('pago') ? '/finanzas'
              : query.includes('riesgo') || query.includes('uif') ? '/riesgos'
                : query.includes('notar') ? '/notarias'
                  : '';
      setResponse(destination
        ? 'Puedo llevarte al módulo relacionado. Para responder con datos del sistema necesito una herramienta backend autorizada, limitada por tus permisos y con fuentes visibles.'
        : 'Entendí la solicitud, pero no consultaré ni inventaré datos. La herramienta backend correspondiente debe autorizarse antes de responder con información operativa.');
      setOwlState('idle');
      setInput('');
      if (destination) window.setTimeout(() => navigate(destination), 900);
    }, 550);
  };

  return (
    <div className="pravia-assistant" data-open={open ? 'true' : 'false'}>
      {showSuggestion && !open && mode !== 'discreet' && (
        <button type="button" className="pravia-ai-suggestion" onClick={openAssistant}>
          <span className="pravia-ai-suggestion__eyebrow">Sugerencia contextual</span>
          <strong>{context.title}</strong>
          <span>{context.message}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        className="pravia-ai-launcher"
        onClick={open ? () => setOpen(false) : openAssistant}
        aria-label={open ? 'Cerrar PRAVIA IA' : 'Abrir PRAVIA IA'}
        aria-expanded={open}
        aria-controls="pravia-ai-panel"
      >
        {open ? <X size={22} /> : <img src={owlAsset('idle')} onError={fallbackImage} alt="" />}
        {!open && <span>PRAVIA IA</span>}
      </button>

      <aside id="pravia-ai-panel" className="pravia-ai-panel" aria-hidden={!open} aria-label="PRAVIA IA">
        <header className="pravia-ai-header">
          <div className="pravia-ai-identity">
            <span className={`pravia-ai-avatar pravia-ai-avatar--${owlState}`}>
              <img src={owlAsset(owlState)} onError={fallbackImage} alt="Búho de PRAVIA IA" />
            </span>
            <div>
              <span>Asistente operativo</span>
              <strong>PRAVIA IA</strong>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label="Cerrar asistente"><X size={19} /></button>
        </header>

        <div className="pravia-ai-context">
          <Sparkles size={16} aria-hidden="true" />
          <span><strong>{context.module}</strong> · {user?.nombre || 'Usuario'} · {user?.rol || 'Sin rol'}</span>
        </div>

        <div className="pravia-ai-body">
          <section className="pravia-ai-message pravia-ai-message--assistant">
            <p className="pravia-ai-message__label">Contexto activo</p>
            <h2>{context.title}</h2>
            <p>{context.message}</p>
          </section>

          <div className="pravia-ai-actions" aria-label="Acciones sugeridas">
            {context.actions.map((action) => (
              <button type="button" key={action.label} onClick={() => runAction(action)}>
                {action.label}<ArrowRight size={15} />
              </button>
            ))}
          </div>

          {response && (
            <section className="pravia-ai-message pravia-ai-message--result" aria-live="polite">
              <p className="pravia-ai-message__label">Respuesta segura</p>
              <p>{response}</p>
              <span className="pravia-ai-source">Fuente: contexto de navegación de PRAVIA OS</span>
            </section>
          )}

          <section className="pravia-ai-safety-note">
            <strong>Control humano activo</strong>
            <p>No se realizan escrituras, confirmaciones jurídicas ni consultas de datos sensibles desde este panel sin herramientas autorizadas.</p>
          </section>
        </div>

        <footer className="pravia-ai-footer">
          <form onSubmit={submit} className="pravia-ai-composer">
            <label htmlFor="pravia-ai-input">Pide orientación o navega a un módulo</label>
            <div>
              <input id="pravia-ai-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ej. abrir agenda o ver expedientes" />
              <button type="submit" disabled={!input.trim()} aria-label="Enviar"><Send size={17} /></button>
            </div>
          </form>
          <label className="pravia-ai-mode">
            <Settings2 size={15} />
            <span>Intervención</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as InteractionMode)}>
              {Object.entries(MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
          <a href="/inteligencia" onClick={(event) => { event.preventDefault(); navigate('/inteligencia'); }}>
            Configuración y consumo de IA <ExternalLink size={13} />
          </a>
        </footer>
      </aside>
      {open && <button type="button" className="pravia-ai-backdrop" onClick={() => setOpen(false)} aria-label="Cerrar PRAVIA IA" />}
    </div>
  );
}
