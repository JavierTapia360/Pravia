import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, ExternalLink, Pencil, Send, Settings2, Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { aiService, type AssistantToolName, type AssistantToolResult } from '../../services/ai.service';
import { buildAssistantContext, type GlobalAssistantContext } from './assistantContext';
import { dismissSuggestion, isSuggestionVisible, markSuggestionShown, snoozeSuggestion, suggestionFromPendingItems, type PraviaSuggestion } from './suggestionEngine';

type InteractionMode = 'proactive' | 'balanced' | 'discreet';
type OwlState = 'idle' | 'blink' | 'greeting' | 'thinking' | 'processing' | 'success';

interface AssistantAction {
  label: string;
  to?: string;
  response?: string;
  query?: string;
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
      { label: 'Qué falta', query: '¿Qué falta en este expediente?' },
      { label: 'Resumen', query: 'Resumen del expediente' },
      { label: 'Documentos', query: 'Documentos del expediente' },
      { label: 'Próximos pasos', query: 'Próximos pasos y pendientes' },
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
    actions: pathname.match(/^\/comparecientes\/[^/]+$/) ? [
      { label: 'Qué falta', query: 'Resumen del compareciente' },
      { label: 'Documentos', query: 'Documentos del compareciente' },
      { label: 'Expedientes relacionados', query: 'Expedientes relacionados del compareciente' },
    ] : [{ label: 'Nuevo compareciente', to: '/comparecientes/nuevo', response: 'Abriré el flujo de alta guiada.' }],
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
    actions: [
      { label: 'Hoy', query: 'Agenda de hoy' },
      { label: 'Buscar espacio', query: 'Buscar espacio disponible' },
      { label: 'Pendientes', query: 'Pendientes de hoy' },
    ],
  };
  if (pathname.startsWith('/finanzas')) return {
    module: 'Finanzas',
    title: 'Lectura financiera',
    message: 'Los importes deben provenir del ledger y distinguir presupuesto, valor de operación, cobranza y honorarios. No afirmaré saldos sin una fuente verificable.',
    actions: [
      { label: 'Por cobrar', query: 'Saldos por cobrar' },
      { label: 'Vencidos', query: 'Saldos vencidos' },
      { label: 'Resumen', query: 'Resumen de cobranza' },
    ],
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

const tomorrowAtTen = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
};

function inferTool(rawQuery: string, context: GlobalAssistantContext): { tool: AssistantToolName; args: Record<string, unknown> } {
  const query = rawQuery.toLocaleLowerCase('es-MX');
  const expediente_id = context.entity_type === 'expediente' ? context.entity_id : undefined;
  if (/\b(crea|crear|prepara|programa)\b.*\b(cita|reuni[oó]n)\b/.test(query)) return { tool: 'prepareAppointment', args: { title: rawQuery.replace(/\b(crea|crear|prepara|programa|una|cita|reunión|para mañana)\b/gi, ' ').replace(/\s+/g, ' ').trim() || 'Cita de seguimiento', fecha_inicio: tomorrowAtTen(), expediente_id } };
  if (/\b(crea|crear|prepara|agrega)\b.*\btarea\b/.test(query)) return { tool: 'prepareTask', args: { title: rawQuery.replace(/\b(crea|crear|prepara|agrega|una|tarea|para mañana)\b/gi, ' ').replace(/\s+/g, ' ').trim() || 'Seguimiento pendiente', fecha_limite: tomorrowAtTen(), expediente_id } };
  if (/\b(prepara|crear|crea)\b.*\bseguimiento\b/.test(query)) return { tool: 'prepareFollowUp', args: { title: rawQuery.replace(/\b(prepara|crear|crea|un|seguimiento|para mañana)\b/gi, ' ').replace(/\s+/g, ' ').trim() || 'Dar seguimiento', fecha_limite: tomorrowAtTen(), expediente_id } };
  if (expediente_id && /(qu[eé] falta|pendiente|incompleto|vencido)/.test(query)) return { tool: 'getExpedientePendingItems', args: {} };
  if (expediente_id && /(documento|archivo|evidencia)/.test(query)) return { tool: 'getExpedienteDocuments', args: {} };
  if (expediente_id && /(saldo|cobro|finanza|pago)/.test(query)) return { tool: 'getFinancialSummary', args: {} };
  if (expediente_id && /(cumplimiento|riesgo|uif|isr)/.test(query)) return { tool: 'getComplianceSummary', args: {} };
  if (expediente_id && /(agenda|evento|cita|firma pr[oó]xima)/.test(query)) return { tool: 'getUpcomingEvents', args: {} };
  if (expediente_id) return { tool: 'getExpedienteSummary', args: {} };
  if (context.entity_type === 'compareciente') return { tool: 'getComparecienteSummary', args: {} };
  if (context.module === 'agenda' && /(hoy|espacio|agenda|evento)/.test(query)) {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const to = new Date(from.getTime() + 86_400_000 - 1);
    return { tool: /espacio/.test(query) ? 'getUpcomingEvents' : 'getAgenda', args: { from: from.toISOString(), to: to.toISOString() } };
  }
  if (/(mi trabajo|mis tareas|qu[eé] tengo|pendientes de hoy)/.test(query)) return { tool: 'getCurrentUserWork', args: {} };
  if (/(saldos? (?:pendientes?|vencidos?|por cobrar)|cobranza|por cobrar)/.test(query)) return { tool: 'getOutstandingBalances', args: {} };
  return { tool: 'globalSearch', args: { query: rawQuery.replace(/^buscar\s+/i, '').trim() } };
}

function toolResponse(result: AssistantToolResult): string {
  const data: any = result.data;
  if (result.tool === 'getExpedientePendingItems') return data.total_pendientes
    ? `Encontré ${data.total_pendientes} pendiente${data.total_pendientes === 1 ? '' : 's'}: ${data.requisitos_documentales?.length || 0} documental(es), ${data.tareas?.length || 0} tarea(s) y ${data.gestiones_externas?.length || 0} gestión(es) externa(s).`
    : 'No encontré requisitos, tareas ni gestiones externas pendientes en el expediente actual.';
  if (result.tool === 'getExpedienteSummary') return `${data.folio}: ${data.estado}${data.etapa ? ` · ${data.etapa}` : ''}. Avance general: ${Math.round(Number(data.avance?.general || 0))}%.`;
  if (result.tool === 'getFinancialSummary') return `Presupuesto cliente: ${Number(data.presupuesto_cliente || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}. Recibido neto: ${Number(data.recibido_cliente_neto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}. Saldo: ${Number(data.saldo_cliente || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}.`;
  if (result.tool === 'getExpedienteDocuments') return `Encontré ${Array.isArray(data) ? data.length : 0} documento(s) vinculados dentro del límite de consulta.`;
  if (result.tool === 'getUpcomingEvents' || result.tool === 'getAgenda') return `Encontré ${Array.isArray(data) ? data.length : 0} evento(s) en el rango consultado.`;
  if (result.tool === 'getComplianceSummary') return `El expediente tiene ${data.revisiones?.length || 0} revisión(es) de cumplimiento registradas.`;
  if (result.tool === 'getCurrentUserWork') return `Tienes ${data.tareas?.length || 0} tarea(s) abierta(s) y ${data.proximos_eventos?.length || 0} evento(s) próximos.`;
  if (result.tool === 'getOutstandingBalances') return `Encontré ${Array.isArray(data) ? data.length : 0} expediente(s) con saldo pendiente dentro de tu alcance.`;
  if (result.tool === 'getComparecienteSummary') return `${data.nombre}: ${data.documentos_activos || 0} documento(s) activo(s) y ${data.expedientes?.length || 0} expediente(s) relacionado(s).`;
  if (['prepareTask', 'prepareAppointment', 'prepareFollowUp'].includes(result.tool)) return 'Preparé el borrador. Revísalo: no se ejecutará hasta que elijas Confirmar.';
  if (result.tool === 'globalSearch') return `Resultados: ${data.expedientes?.length || 0} expediente(s), ${data.comparecientes?.length || 0} compareciente(s) y ${data.notarias?.length || 0} notaría(s).`;
  return 'Consulta completada con las fuentes autorizadas disponibles.';
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
  const [suggestion, setSuggestion] = useState<PraviaSuggestion | null>(null);
  const [toolResult, setToolResult] = useState<AssistantToolResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [contextEntityLabel, setContextEntityLabel] = useState('');
  const context = useMemo(() => contextFor(location.pathname), [location.pathname]);
  const globalContext = useMemo(() => buildAssistantContext(location.pathname), [location.pathname]);

  useEffect(() => {
    setResponse('');
    setToolResult(null);
    setOwlState('idle');
    setSuggestion(null);
    setContextEntityLabel('');
    setShowSuggestion(false);
    if (mode === 'discreet' || globalContext.entity_type !== 'expediente' || !user?.permissions.includes('ai.use') || !user.permissions.includes('ai.expedientes.read') || !user.permissions.includes('expedientes.read')) return;
    let active = true;
    aiService.executeTool('getExpedientePendingItems', {}, globalContext)
      .then((result) => {
        if (!active) return;
        if (result.data?.folio) setContextEntityLabel(result.data.folio);
        const next = suggestionFromPendingItems(result.data);
        if (next && isSuggestionVisible(next, mode)) {
          setSuggestion(next);
          setShowSuggestion(true);
          markSuggestionShown(next.id);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [globalContext, mode, user?.permissions]);

  useEffect(() => {
    window.localStorage.setItem('pravia_ai_mode', mode);
  }, [mode]);

  useEffect(() => {
    if (!open || owlState !== 'idle') return;
    const timer = window.setTimeout(() => {
      setOwlState('blink');
      window.setTimeout(() => setOwlState('idle'), 180);
    }, 12_000 + Math.round(Math.random() * 8_000));
    return () => window.clearTimeout(timer);
  }, [open, owlState]);

  const openAssistant = () => {
    setOpen(true);
    setShowSuggestion(false);
    setOwlState('greeting');
    window.setTimeout(() => setOwlState('idle'), 900);
    if (globalContext.entity_type === 'expediente' && !contextEntityLabel) {
      aiService.executeTool('getExpedienteSummary', {}, globalContext)
        .then((result: any) => setContextEntityLabel(result.data?.folio || ''))
        .catch(() => undefined);
    }
  };

  const runAction = (action: AssistantAction) => {
    if (action.query) {
      void submitQuery(action.query);
      return;
    }
    setResponse(action.response || '');
    setOwlState('success');
    window.setTimeout(() => {
      setOwlState('idle');
      if (action.to) navigate(action.to);
    }, 500);
  };

  const submitQuery = async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;
    setToolResult(null);
    setOwlState('thinking');
    try {
      const request = inferTool(query, globalContext);
      setOwlState(request.tool.startsWith('prepare') ? 'processing' : 'thinking');
      const result = await aiService.executeTool(request.tool, request.args, globalContext);
      setToolResult(result);
      setResponse(toolResponse(result));
      setOwlState(request.tool.startsWith('prepare') ? 'processing' : 'success');
      window.setTimeout(() => setOwlState('idle'), 900);
    } catch (error: any) {
      setResponse(error?.message || 'No fue posible completar la consulta con tus permisos actuales.');
      setOwlState('idle');
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = input.trim();
    if (!query) return;
    setInput('');
    void submitQuery(query);
  };

  const preparedAction = toolResult?.data?.kind === 'PREPARED_ACTION' ? toolResult.data : null;
  const confirmPreparedAction = async () => {
    if (!preparedAction || confirming) return;
    setConfirming(true);
    setOwlState('processing');
    try {
      const confirmed: any = await api.post(preparedAction.confirmation.endpoint, preparedAction.payload);
      let confirmationAudited = true;
      try {
        await aiService.confirmPreparedAction({
          tool: toolResult!.tool,
          prepared_correlation_id: toolResult!.correlation_id,
          target_endpoint: preparedAction.confirmation.endpoint,
          result_entity_type: preparedAction.action === 'prepareAppointment' ? 'EventoAgenda' : 'Tarea',
          result_entity_id: confirmed?.id,
        });
      } catch {
        confirmationAudited = false;
      }
      setResponse(confirmationAudited
        ? 'Acción confirmada y registrada mediante la API normal de PRAVIA.'
        : 'La acción sí quedó registrada. Su constancia de confirmación requiere revisión técnica.');
      setToolResult(null);
      setOwlState('success');
      window.setTimeout(() => setOwlState('idle'), 900);
    } catch (error: any) {
      setResponse(error?.message || 'No fue posible confirmar la acción.');
      setOwlState('idle');
    } finally { setConfirming(false); }
  };

  return (
    <div className="pravia-assistant" data-open={open ? 'true' : 'false'}>
      {showSuggestion && suggestion && !open && mode !== 'discreet' && (
        <section className="pravia-ai-suggestion" aria-label="Sugerencia contextual de PRAVIA IA">
          <button type="button" className="pravia-ai-suggestion__main" onClick={() => { openAssistant(); void submitQuery(suggestion.action.query); }}>
            <span className="pravia-ai-suggestion__eyebrow">{suggestion.trigger.replace(/_/g, ' ')}</span>
            <strong>{suggestion.title}</strong>
            <span>{suggestion.reason}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <div className="pravia-ai-suggestion__controls">
            <button type="button" onClick={() => { snoozeSuggestion(suggestion.id); setShowSuggestion(false); }}>Después</button>
            <button type="button" onClick={() => { dismissSuggestion(suggestion.id); setShowSuggestion(false); }}>Descartar</button>
          </div>
        </section>
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
          <span><strong>{contextEntityLabel ? `Expediente ${contextEntityLabel}` : context.module}</strong> · {user?.nombre || 'Usuario'} · {user?.rol || 'Sin rol'}</span>
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
              {preparedAction && (
                <div className="pravia-ai-prepared">
                  <dl>
                    <div><dt>Título</dt><dd>{preparedAction.payload.titulo}</dd></div>
                    <div><dt>Fecha</dt><dd>{new Date(preparedAction.payload.fecha_limite || preparedAction.payload.fecha_inicio).toLocaleString('es-MX')}</dd></div>
                    <div><dt>Responsable</dt><dd>{preparedAction.responsible.nombre} {preparedAction.responsible.apellido}</dd></div>
                  </dl>
                  <div>
                    <button type="button" onClick={() => void confirmPreparedAction()} disabled={confirming}><Check size={15} />{confirming ? 'Confirmando…' : 'Confirmar'}</button>
                    <button type="button" onClick={() => { setInput(String(preparedAction.payload.titulo || '')); setToolResult(null); }}><Pencil size={15} />Editar</button>
                    <button type="button" onClick={() => { setToolResult(null); setResponse('Borrador cancelado. No se realizó ningún cambio.'); }}><X size={15} />Cancelar</button>
                  </div>
                </div>
              )}
              {toolResult?.provenance?.length ? (
                <div className="pravia-ai-sources">
                  <span>Fuentes consultadas</span>
                  {toolResult.provenance.slice(0, 5).map((item) => <button type="button" key={`${item.entity}-${item.id}`} onClick={() => navigate(item.path)}>{item.label}<ExternalLink size={12} /></button>)}
                  {toolResult.truncated && <small>Resultados limitados para proteger contexto y rendimiento.</small>}
                  <small>Correlación: {toolResult.correlation_id}</small>
                </div>
              ) : <span className="pravia-ai-source">Fuente: contexto autenticado de PRAVIA OS</span>}
            </section>
          )}

          <section className="pravia-ai-safety-note">
            <strong>Control humano activo</strong>
            <p>Cada consulta hereda tus permisos. Las acciones preparadas solo se ejecutan después de tu confirmación y mediante la API normal.</p>
          </section>
        </div>

        <footer className="pravia-ai-footer">
          <form onSubmit={submit} className="pravia-ai-composer">
            <label htmlFor="pravia-ai-input">Consulta el contexto actual o prepara una acción</label>
            <div>
              <input id="pravia-ai-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder={globalContext.entity_type === 'expediente' ? 'Ej. ¿qué falta?' : 'Ej. buscar EXP-2026'} />
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
          {['DIRECCION', 'ADMINISTRACION'].includes(user?.rol || '') && <a href="/inteligencia" onClick={(event) => { event.preventDefault(); navigate('/inteligencia'); }}>Configuración y consumo de IA <ExternalLink size={13} /></a>}
        </footer>
      </aside>
      {open && <button type="button" className="pravia-ai-backdrop" onClick={() => setOpen(false)} aria-label="Cerrar PRAVIA IA" />}
    </div>
  );
}
