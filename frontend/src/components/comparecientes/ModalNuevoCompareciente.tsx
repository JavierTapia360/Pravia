import React, { useState } from 'react';
import { X, UserCheck, Building2, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { comparecientesService } from '../../services/comparecientes.service';

interface ModalNuevoComparecienteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (comparecienteCreado: any) => void;
}

export const ModalNuevoCompareciente: React.FC<ModalNuevoComparecienteProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [tipoPersona, setTipoPersona] = useState<'FISICA' | 'MORAL' | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // Form State Persona Física
  const [fisicaForm, setFisicaForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    sexo: 'MASCULINO',
    curp: '',
    rfc: '',
    estado_civil: 'SOLTERO',
    regimen_matrimonial: 'SEPARACION_DE_BIENES',
    ocupacion: '',
    calle: '',
    exterior: '',
    colonia: '',
    municipio: 'Tepic',
    estado: 'Nayarit',
    codigo_postal: '',
    telefono: '',
    email: '',
  });

  // Form State Persona Moral
  const [moralForm, setMoralForm] = useState({
    razon_social: '',
    nombre_comercial: '',
    tipo_societario: 'S. DE R.L. DE C.V.',
    rfc: '',
    fecha_constitucion: '',
    folio_mercantil: '',
    objeto_social_resumido: '',
    calle: '',
    exterior: '',
    colonia: '',
    municipio: 'Bahía de Banderas',
    estado: 'Nayarit',
    codigo_postal: '',
    telefono: '',
    email: '',
  });

  // Duplicate state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicadosDetectados, setDuplicadosDetectados] = useState<any[]>([]);
  const [riesgoDuplicado, setRiesgoDuplicado] = useState<'VERDE' | 'AMARILLO' | 'ROJO'>('VERDE');
  const [motivoBypass, setMotivoBypass] = useState('');
  const [showBypassInput, setShowBypassInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerificarDuplicados = async () => {
    setCheckingDuplicates(true);
    setErrorMsg(null);
    try {
      const isFisica = tipoPersona === 'FISICA';
      const rfc = isFisica ? fisicaForm.rfc : moralForm.rfc;
      const curp = isFisica ? fisicaForm.curp : undefined;
      const nombre = isFisica
        ? `${fisicaForm.nombre} ${fisicaForm.apellido_paterno}`.trim()
        : moralForm.razon_social;

      const res = await comparecientesService.buscarDuplicados({ rfc, curp, nombre });
      const matches = res?.data || [];
      setDuplicadosDetectados(matches);

      let maxRiesgo: 'VERDE' | 'AMARILLO' | 'ROJO' = 'VERDE';
      if (matches.length > 0) {
        const hasRfcOrCurp = matches.some((m: any) =>
          m.tipo === 'CURP_COINCIDENCIA_EXACTA' ||
          m.tipo === 'RFC_FISICA_EXACTO' ||
          m.tipo === 'RFC_MORAL_EXACTO'
        );
        maxRiesgo = hasRfcOrCurp ? 'ROJO' : 'AMARILLO';
      }
      setRiesgoDuplicado(maxRiesgo);
      return matches;
    } catch (err: any) {
      console.error(err);
      return [];
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Verificación previa de duplicados
      const matches = await handleVerificarDuplicados();
      if (matches.length > 0 && !motivoBypass) {
        setShowBypassInput(true);
        setLoading(false);
        return;
      }

      let res;
      if (tipoPersona === 'FISICA') {
        res = await comparecientesService.crearPersonaFisica({
          ...fisicaForm,
          domicilio_principal: {
            tipo: 'PARTICULAR',
            calle: fisicaForm.calle,
            exterior: fisicaForm.exterior,
            colonia: fisicaForm.colonia,
            municipio: fisicaForm.municipio,
            estado: fisicaForm.estado,
            codigo_postal: fisicaForm.codigo_postal,
          },
          contacto_principal: {
            tipo: 'TELEFONO',
            valor: fisicaForm.telefono || fisicaForm.email,
          },
        });
      } else {
        res = await comparecientesService.crearPersonaMoral({
          ...moralForm,
        });
      }

      if (res?.success) {
        onSuccess(res.data);
        handleReset();
        onClose();
      } else {
        throw new Error(res?.error || 'Error al registrar persona maestra');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTipoPersona(null);
    setStep(1);
    setDuplicadosDetectados([]);
    setRiesgoDuplicado('VERDE');
    setShowBypassInput(false);
    setMotivoBypass('');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Encabezado */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-sm">
                +
              </span>
              Nuevo Registro en Catálogo Maestro de Personas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Entidad maestra reutilizable en todo PRAVIA OS (Comparecientes, Apoderados, Representantes, etc.)
            </p>
          </div>
          <button
            onClick={() => { handleReset(); onClose(); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* MENSAJE DE ERROR */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PASO 1: SELECCIÓN DE TIPO DE PERSONA */}
          {step === 1 && (
            <div className="py-8 text-center space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Selecciona el Tipo de Persona que deseas registrar
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <button
                  type="button"
                  onClick={() => { setTipoPersona('FISICA'); setStep(2); }}
                  className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col items-start gap-4 group hover:shadow-lg ${
                    tipoPersona === 'FISICA'
                      ? 'border-gold-500 bg-gold-50/20 dark:bg-gold-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-gold-400 dark:hover:border-gold-600'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">Persona Física</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Individuo particular con nombre, apellidos, CURP, RFC y estado civil.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 flex items-center gap-1 mt-auto">
                    Capturar datos físicos <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setTipoPersona('MORAL'); setStep(2); }}
                  className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col items-start gap-4 group hover:shadow-lg ${
                    tipoPersona === 'MORAL'
                      ? 'border-gold-500 bg-gold-50/20 dark:bg-gold-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-gold-400 dark:hover:border-gold-600'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">Persona Moral</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Empresa o entidad jurídica (S.A. de C.V., S. de R.L., Asociación, etc.).
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-gold-600 dark:text-gold-400 flex items-center gap-1 mt-auto">
                    Capturar datos morales <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: CAPTURA DE FORMULARIO */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gold-100 dark:bg-gold-900/40 text-gold-800 dark:text-gold-300">
                    {tipoPersona === 'FISICA' ? 'PERSONA FÍSICA' : 'PERSONA MORAL'}
                  </span>
                  <span className="text-xs text-slate-500">Completa la información estructurada</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline"
                >
                  Cambiar tipo de persona
                </button>
              </div>

              {/* CLASIFICADOR DE RIESGO DE DUPLICADOS */}
              {duplicadosDetectados.length > 0 && (
                <div className={`p-4 rounded-xl border ${
                  riesgoDuplicado === 'ROJO'
                    ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200'
                    : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {riesgoDuplicado === 'ROJO' ? (
                        <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                          🔴 COINCIDENCIA ALTA DE DUPLICADO (RFC/CURP idéntico)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                          🟡 COINCIDENCIA PARCIAL DE DUPLICADO (Nombre similar)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {duplicadosDetectados.map((dup, i) => (
                      <div key={i} className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {dup.record?.nombre_completo_calculado || dup.record?.razon_social || dup.record?.nombre_busqueda}
                          </p>
                          <p className="text-slate-500">
                            RFC: {dup.record?.rfc || 'N/D'} | CURP: {dup.record?.curp || 'N/D'}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {dup.tipo}
                        </span>
                      </div>
                    ))}
                  </div>

                  {showBypassInput && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Para continuar creando un nuevo registro a pesar de la coincidencia, proporciona un motivo justificado:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Homo-clave distinta confirmada / Representación con distinto poder"
                        value={motivoBypass}
                        onChange={(e) => setMotivoBypass(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* FORMULARIO PERSONA FÍSICA */}
              {tipoPersona === 'FISICA' && (
                <div className="space-y-6">
                  {/* Sección Identidad */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">1. Identidad Personal</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre(s) *</label>
                        <input
                          type="text"
                          required
                          value={fisicaForm.nombre}
                          onChange={(e) => setFisicaForm({ ...fisicaForm, nombre: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          placeholder="Ej. José Manuel"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Primer Apellido</label>
                        <input
                          type="text"
                          value={fisicaForm.apellido_paterno}
                          onChange={(e) => setFisicaForm({ ...fisicaForm, apellido_paterno: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          placeholder="Ej. Richard"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Segundo Apellido</label>
                        <input
                          type="text"
                          value={fisicaForm.apellido_materno}
                          onChange={(e) => setFisicaForm({ ...fisicaForm, apellido_materno: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          placeholder="Ej. García"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección Identificadores Fiscales / CURP */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">2. Identificadores Oficiales</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">CURP</label>
                        <input
                          type="text"
                          maxLength={18}
                          value={fisicaForm.curp}
                          onChange={(e) => setFisicaForm({ ...fisicaForm, curp: e.target.value.toUpperCase() })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                          placeholder="RIGJ800101HNT..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">RFC con Homoclave</label>
                        <input
                          type="text"
                          maxLength={13}
                          value={fisicaForm.rfc}
                          onChange={(e) => setFisicaForm({ ...fisicaForm, rfc: e.target.value.toUpperCase() })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                          placeholder="RIGJ800101XXX"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ocupación / Profesión</label>
                        <input
                          type="text"
                          value={fisicaForm.ocupacion}
                          onChange={(e) => setFisicaForm({ ...fisicaForm, ocupacion: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          placeholder="Ej. Empresario / Comerciante"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estado Civil */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">3. Estado Civil y Régimen Matrimonial</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Estado Civil</label>
                        <select
                          value={fisicaForm.estado_civil}
                          onChange={(e) => setFisicaForm({ ...fisicaForm, estado_civil: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="SOLTERO">Soltero(a)</option>
                          <option value="CASADO">Casado(a)</option>
                          <option value="DIVORCIADO">Divorciado(a)</option>
                          <option value="VIUDO">Viudo(a)</option>
                          <option value="UNION_LIBRE">Unión Libre</option>
                        </select>
                      </div>
                      {fisicaForm.estado_civil === 'CASADO' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Régimen Matrimonial</label>
                          <select
                            value={fisicaForm.regimen_matrimonial}
                            onChange={(e) => setFisicaForm({ ...fisicaForm, regimen_matrimonial: e.target.value })}
                            className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            <option value="SEPARACION_DE_BIENES">Separación de Bienes</option>
                            <option value="SOCIEDAD_CONYUGAL">Sociedad Conyugal</option>
                            <option value="SOCIEDAD_LEGAL">Sociedad Legal</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* FORMULARIO PERSONA MORAL */}
              {tipoPersona === 'MORAL' && (
                <div className="space-y-6">
                  {/* Datos Generales Moral */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">1. Datos Generales de la Sociedad</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Razón Social *</label>
                        <input
                          type="text"
                          required
                          value={moralForm.razon_social}
                          onChange={(e) => setMoralForm({ ...moralForm, razon_social: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                          placeholder="Ej. PACIFIC SOLEIL, S. DE R.L. DE C.V."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">RFC Fiscal *</label>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          value={moralForm.rfc}
                          onChange={(e) => setMoralForm({ ...moralForm, rfc: e.target.value.toUpperCase() })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                          placeholder="PSO150820XXX"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Constitución y Mercantil */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">2. Datos de Constitución y Registro Mercantil</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo Societario</label>
                        <input
                          type="text"
                          value={moralForm.tipo_societario}
                          onChange={(e) => setMoralForm({ ...moralForm, tipo_societario: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          placeholder="Ej. S. DE R.L. DE C.V."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Folio Mercantil Electrónico</label>
                        <input
                          type="text"
                          value={moralForm.folio_mercantil}
                          onChange={(e) => setMoralForm({ ...moralForm, folio_mercantil: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          placeholder="Ej. FME-98421-NAY"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Constitución</label>
                        <input
                          type="date"
                          value={moralForm.fecha_constitucion}
                          onChange={(e) => setMoralForm({ ...moralForm, fecha_constitucion: e.target.value })}
                          className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BOTONES DE ACCIÓN */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl"
                >
                  Volver al inicio
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { handleReset(); onClose(); }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || checkingDuplicates}
                    className="px-5 py-2 text-xs font-bold text-slate-900 bg-gold-500 hover:bg-gold-400 rounded-xl transition-all shadow-md flex items-center gap-2"
                  >
                    {loading ? 'Guardando...' : 'Guardar y Registrar Persona'}
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
