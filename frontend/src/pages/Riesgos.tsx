import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Calculator, CheckCircle2, ChevronRight, ClipboardCheck, ExternalLink, FileCheck2,
  FilePlus2, Landmark, Loader2, Plus, RefreshCw, Scale, ShieldAlert, X,
} from 'lucide-react';
import { ComplianceCatalogs, ComplianceReview, complianceService } from '../services/compliance.service';
import { useToastStore } from '../stores/toastStore';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const labelStatus = (value: string) => value.replace(/_/g, ' ').toLocaleLowerCase('es-MX').replace(/^./, (letter: string) => letter.toLocaleUpperCase('es-MX'));

export default function Riesgos() {
  const toast = useToastStore();
  const [catalogs, setCatalogs] = useState<ComplianceCatalogs | null>(null);
  const [reviews, setReviews] = useState<ComplianceReview[]>([]);
  const [tab, setTab] = useState<'UIF' | 'ISR'>('UIF');
  const [selected, setSelected] = useState<ComplianceReview | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ expediente_id: '', rule_set_id: '', fecha_operacion: new Date().toISOString().slice(0, 10) });
  const [evidenceId, setEvidenceId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [catalogData, reviewData] = await Promise.all([complianceService.catalogs(), complianceService.list(tab)]);
      setCatalogs(catalogData);
      setReviews(reviewData);
      if (selected) setSelected(reviewData.find((item) => item.id === selected.id) || null);
    } catch (error: any) { toast.addToast(error.message || 'No fue posible cargar cumplimiento.', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [tab]);
  useEffect(() => { setAnswers(selected?.cuestionario_json || {}); setEvidenceId(''); }, [selected?.id]);

  const rules = catalogs?.reglas.filter((rule) => rule.tipo === tab) || [];
  const currentRule = selected?.ruleSet;
  const availableDocs = useMemo(() => catalogs?.documentos.filter((document) => selected && (document.expediente_id === selected.expediente.id || document.expedienteVinculos.some((link) => link.expediente_id === selected.expediente.id))) || [], [catalogs, selected]);
  const counts = { total: reviews.length, pending: reviews.filter((review) => review.estatus === 'PENDIENTE_REVISION').length, confirmed: reviews.filter((review) => review.estatus === 'CONFIRMADO').length };

  const openNew = () => {
    setNewForm((current) => ({ ...current, rule_set_id: rules[0]?.id || '', expediente_id: catalogs?.expedientes[0]?.id || '' }));
    setNewOpen(true);
  };
  const createReview = async (event: FormEvent) => {
    event.preventDefault(); setWorking(true);
    try {
      const review = await complianceService.create({ ...newForm, tipo: tab });
      setNewOpen(false); setSelected(review); setReviews((items) => [review, ...items]); toast.addToast('Revisión creada con versión normativa fija.', 'success');
    } catch (error: any) { toast.addToast(error.message || 'No fue posible crear la revisión.', 'error'); }
    finally { setWorking(false); }
  };
  const evaluate = async () => {
    if (!selected) return; setWorking(true);
    try { const review = await complianceService.evaluate(selected.id, { cuestionario: answers }); setSelected(review); setReviews((items) => items.map((item) => item.id === review.id ? review : item)); toast.addToast('Evaluación explicable actualizada.', 'success'); }
    catch (error: any) { toast.addToast(error.message || 'No fue posible evaluar.', 'error'); }
    finally { setWorking(false); }
  };
  const humanReview = async (decision: 'CONFIRMAR' | 'REQUIERE_AJUSTES') => {
    if (!selected) return; setWorking(true);
    try { const review = await complianceService.review(selected.id, { decision, observaciones: decision === 'CONFIRMAR' ? 'Resultado revisado y confirmado por el responsable.' : 'Requiere completar o corregir información.' }); setSelected(review); setReviews((items) => items.map((item) => item.id === review.id ? review : item)); toast.addToast(decision === 'CONFIRMAR' ? 'Resultado confirmado.' : 'Revisión devuelta para ajustes.', 'success'); }
    catch (error: any) { toast.addToast(error.message || 'No fue posible registrar la decisión.', 'error'); }
    finally { setWorking(false); }
  };
  const addEvidence = async () => {
    if (!selected || !evidenceId) return; setWorking(true);
    try { await complianceService.addEvidence(selected.id, { documento_id: evidenceId, tipo_evidencia: tab === 'UIF' ? 'DEBIDA_DILIGENCIA' : 'SOPORTE_FISCAL' }); await load(); toast.addToast('Evidencia vinculada sin duplicar el documento.', 'success'); }
    catch (error: any) { toast.addToast(error.message || 'No fue posible vincular evidencia.', 'error'); }
    finally { setWorking(false); }
  };

  if (loading && !catalogs) return <div className="flex min-h-[420px] items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin" />Cargando cumplimiento…</div>;
  return (
    <div className="module-page risk-page">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-sm lg:px-8 lg:py-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><ShieldAlert size={18} />Cumplimiento explicable y versionado</p><h1 className="module-title mt-2">Riesgos, UIF e ISR</h1><p className="module-description mt-3">Cuestionarios, evidencia y resultados revisables. Ninguna conclusión sustituye la responsabilidad jurídica o fiscal.</p></div><button type="button" onClick={openNew} className="btn btn-primary btn-lg"><Plus size={17} />Nueva revisión</button></div>
      </section>

      <div className="segmented-control w-full"><button type="button" onClick={() => { setTab('UIF'); setSelected(null); }} className={`control-height flex flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold ${tab === 'UIF' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}><Landmark size={17} />UIF</button><button type="button" onClick={() => { setTab('ISR'); setSelected(null); }} className={`control-height flex flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold ${tab === 'ISR' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}><Calculator size={17} />ISR</button></div>

      <section className="metric-grid"><article className="metric-card"><p className="metric-label">Revisiones</p><p className="metric-value">{counts.total}</p><p className="metric-meta">Casos del módulo seleccionado</p></article><article className="metric-card border-amber-200 bg-amber-50"><p className="metric-label text-amber-800">Pendientes de revisión</p><p className="metric-value text-amber-950">{counts.pending}</p><p className="metric-meta border-amber-200 text-amber-800">Requieren intervención humana</p></article><article className="metric-card border-emerald-200 bg-emerald-50"><p className="metric-label text-emerald-800">Confirmadas</p><p className="metric-value text-emerald-950">{counts.confirmed}</p><p className="metric-meta border-emerald-200 text-emerald-800">Con revisión registrada</p></article></section>

      <section className="grid gap-6 xl:grid-cols-[minmax(340px,0.75fr)_minmax(0,1.25fr)]">
        <div className="space-y-5">
          <article className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-semibold text-slate-950">Revisiones {tab}</h2><p className="text-[13px] text-slate-500">Casos con versión normativa fija</p></div><button onClick={() => void load()} className="control-height min-w-11 rounded-lg text-slate-500 hover:bg-slate-100"><RefreshCw className={`mx-auto ${loading ? 'animate-spin' : ''}`} size={17} /></button></div>{reviews.length ? <div className="divide-y divide-slate-100">{reviews.map((review) => <button type="button" key={review.id} onClick={() => setSelected(review)} className={`flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 ${selected?.id === review.id ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : ''}`}><span className={`h-2.5 w-2.5 rounded-full ${review.estatus === 'CONFIRMADO' ? 'bg-emerald-500' : review.estatus === 'PENDIENTE_REVISION' ? 'bg-amber-500' : 'bg-slate-300'}`} /><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">{review.expediente.numero_pravia}</strong><small className="mt-0.5 block truncate text-[13px] text-slate-500">{review.expediente.cliente_alias || review.ruleSet.nombre}</small><small className="text-xs text-slate-500">{labelStatus(review.estatus)} · {review.rule_version_snapshot}</small></span><ChevronRight size={17} className="text-slate-400" /></button>)}</div> : <div className="px-6 py-12 text-center text-sm text-slate-500"><ClipboardCheck className="mx-auto mb-3 text-slate-300" size={32} />No hay revisiones {tab}.</div>}</article>

          {rules.map((rule) => <article key={rule.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">{rule.estatus}</p><h3 className="mt-1 font-semibold text-slate-950">{rule.nombre}</h3><p className="mt-1 font-mono text-xs text-slate-500">{rule.version}</p></div><Scale className="text-slate-400" size={20} /></div><p className="mt-3 text-xs leading-5 text-slate-600">{rule.notas}</p><a href={rule.fuente_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline">Fuente oficial <ExternalLink size={13} /></a></article>)}
        </div>

        <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {!selected ? <div className="flex min-h-[560px] flex-col items-center justify-center px-8 text-center"><FileCheck2 className="text-slate-300" size={42} /><h2 className="mt-4 text-lg font-semibold text-slate-900">Selecciona o crea una revisión</h2><p className="mt-2 max-w-md text-sm text-slate-500">El cuestionario y su resultado quedarán ligados al expediente y a la versión normativa.</p></div> : <div>
            <div className="border-b border-slate-200 px-6 py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">{selected.tipo} · {selected.rule_version_snapshot}</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{selected.expediente.numero_pravia}</h2><p className="text-sm text-slate-500">{selected.expediente.cliente_alias || selected.ruleSet.nombre}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{labelStatus(selected.estatus)}</span></div></div>
            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">{(currentRule?.cuestionario || []).map((field: any) => <label key={field.clave} className={field.tipo === 'TEXTAREA' ? 'md:col-span-2' : ''}><span className="mb-1.5 block text-xs font-semibold text-slate-600">{field.etiqueta}{field.requerido ? ' *' : ''}</span>{field.clave === 'tipo_acto_uif' ? <select value={answers[field.clave] || ''} onChange={(event) => setAnswers({ ...answers, [field.clave]: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">Seleccionar supuesto</option>{Object.keys(currentRule?.parametros?.reglas || {}).map((key) => <option key={key} value={key}>{labelStatus(key)}</option>)}</select> : field.clave === 'pep_declarada' ? <select value={answers[field.clave] || ''} onChange={(event) => setAnswers({ ...answers, [field.clave]: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">Pendiente</option><option value="NO">No</option><option value="SI">Sí</option></select> : field.tipo === 'BOOLEAN' ? <select value={answers[field.clave] === true ? 'SI' : answers[field.clave] === false ? 'NO' : ''} onChange={(event) => setAnswers({ ...answers, [field.clave]: event.target.value === '' ? undefined : event.target.value === 'SI' })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">Pendiente</option><option value="SI">Sí</option><option value="NO">No</option></select> : field.tipo === 'TEXTAREA' ? <textarea rows={3} value={answers[field.clave] || ''} onChange={(event) => setAnswers({ ...answers, [field.clave]: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /> : <input type={field.tipo === 'MONEDA' ? 'number' : field.tipo === 'DATE' ? 'date' : 'text'} min={field.tipo === 'MONEDA' ? 0 : undefined} step={field.tipo === 'MONEDA' ? '0.01' : undefined} value={answers[field.clave] || ''} onChange={(event) => setAnswers({ ...answers, [field.clave]: field.tipo === 'MONEDA' ? Number(event.target.value) : event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />}</label>)}</div>
              <button disabled={working || selected.estatus === 'CONFIRMADO'} onClick={() => void evaluate()} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{working ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />}Evaluar con reglas versionadas</button>

              {selected.resultado_json && <div className={`rounded-xl border p-5 ${selected.resultado_json.clasificacion === 'REQUIERE_AVISO' ? 'border-red-200 bg-red-50' : selected.resultado_json.clasificacion?.includes('INCOMPLETO') ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex items-start gap-3">{selected.resultado_json.clasificacion === 'REQUIERE_AVISO' ? <AlertTriangle className="text-red-700" /> : <CheckCircle2 className="text-emerald-700" />}<div><p className="font-semibold text-slate-950">{labelStatus(selected.resultado_json.clasificacion)}</p><p className="mt-1 text-sm text-slate-600">{selected.resultado_json.disclaimer}</p>{selected.resultado_json.umbral_mxn != null && <p className="mt-2 text-sm text-slate-700">Base {money.format(selected.resultado_json.monto_base_mxn)} · Umbral {money.format(selected.resultado_json.umbral_mxn)}</p>}{selected.resultado_json.faltantes?.length > 0 && <p className="mt-2 text-sm text-amber-800">Faltantes: {selected.resultado_json.faltantes.map(labelStatus).join(', ')}</p>}</div></div><div className="mt-4 flex flex-wrap gap-2"><button disabled={working} onClick={() => void humanReview('CONFIRMAR')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Confirmar revisión humana</button><button disabled={working} onClick={() => void humanReview('REQUIERE_AJUSTES')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Solicitar ajustes</button></div></div>}

              <div className="border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-900">Evidencia</h3><p className="mt-1 text-xs text-slate-500">Vincula documentos existentes sin duplicarlos ni hacerlos públicos.</p><div className="mt-3 flex gap-2"><select value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)} disabled={selected.estatus === 'CONFIRMADO'} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Seleccionar documento del expediente</option>{availableDocs.map((document) => <option key={document.id} value={document.id}>{document.nombre_original}</option>)}</select><button disabled={!evidenceId || working || selected.estatus === 'CONFIRMADO'} onClick={() => void addEvidence()} className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40"><FilePlus2 size={17} /></button></div>{selected.evidencias.length > 0 && <ul className="mt-3 space-y-2">{selected.evidencias.map((evidence) => <li key={evidence.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{evidence.documento.nombre_original} · {labelStatus(evidence.tipo_evidencia)}</li>)}</ul>}</div>
            </div>
          </div>}
        </article>
      </section>

      {tab === 'ISR' && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><p><strong>Calculadora en modo preparado.</strong> Esta versión valida insumos exigidos por la fuente oficial, pero no calcula ISR hasta que un especialista apruebe la versión completa de parámetros, INPC y procedimiento.</p></div>}

      {newOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"><form onSubmit={createReview} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold text-slate-950">Nueva revisión {tab}</h2><p className="mt-1 text-sm text-slate-500">La versión normativa quedará congelada en el caso.</p></div><button type="button" onClick={() => setNewOpen(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button></div><div className="mt-5 space-y-4"><label><span className="mb-1 block text-xs font-semibold text-slate-600">Expediente</span><select required value={newForm.expediente_id} onChange={(event) => setNewForm({ ...newForm, expediente_id: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">Seleccionar</option>{catalogs?.expedientes.map((exp) => <option key={exp.id} value={exp.id}>{exp.numero_pravia} · {exp.cliente_alias || 'Sin alias'}</option>)}</select></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Versión de reglas</span><select required value={newForm.rule_set_id} onChange={(event) => setNewForm({ ...newForm, rule_set_id: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">{rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.version}</option>)}</select></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Fecha de operación</span><input required type="date" value={newForm.fecha_operacion} onChange={(event) => setNewForm({ ...newForm, fecha_operacion: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setNewOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button><button disabled={working} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{working ? 'Creando…' : 'Crear borrador'}</button></div></form></div>}
    </div>
  );
}
