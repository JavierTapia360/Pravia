import React, { useDeferredValue, useEffect, useState } from 'react';
import { 
  Archive, Building2, Plus, Search, Star, Edit2, Phone, Mail, MapPin, User,
  Clock, RefreshCw, Users, MessageCircle, FileText, Landmark, X
} from 'lucide-react';
import { useNotariasStore, Notaria, NotariaContacto } from '../stores/notariasStore';
import { useToastStore } from '../stores/toastStore';

export default function NotariasList() {
  const { notarias, loading, fetchNotarias, createNotaria, updateNotaria, setPredeterminada, archiveNotaria } = useNotariasStore();
  const { addToast } = useToastStore();

  const [search, setSearch] = useState('');
  const [filterActiva, setFilterActiva] = useState<'TODAS' | 'ACTIVAS' | 'INACTIVAS'>('TODAS');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingNotaria, setEditingNotaria] = useState<Notaria | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'contacto' | 'contactos_operativos' | 'config'>('general');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formTouched, setFormTouched] = useState(false);

  // Form State
  const [form, setForm] = useState({
    numero_notaria: '',
    nombre: '',
    notario_titular: '',
    entidad_federativa: 'Nayarit',
    municipio: 'Tepic',
    demarcacion: '',
    direccion: '',
    codigo_postal: '',
    telefono: '',
    whatsapp: '',
    correo_general: '',
    correo_proyectos: '',
    pagina_web: '',
    contacto_principal: '',
    horario: '',
    dias_atencion: '',
    tiempo_respuesta: '',
    tiempo_presupuesto: '',
    tiempo_firma: '',
    instrucciones_especiales: '',
    observaciones_generales: '',
    requisitos_frecuentes: '',
    tipos_acto_texto: '',
    instituciones_texto: '',
    municipios_atendidos_texto: '',
    activa: true,
    predeterminada: false,
    color_identificador: '#D4AF37'
  });

  const [contactosForm, setContactosForm] = useState<NotariaContacto[]>([]);
  const [newContact, setNewContact] = useState<NotariaContacto>({
    nombre: '',
    cargo: 'Proyectista',
    telefono: '',
    whatsapp: '',
    correo: '',
    observaciones: ''
  });

  useEffect(() => {
    fetchNotarias();
  }, [fetchNotarias]);

  const handleOpenCreateModal = () => {
    setEditingNotaria(null);
    setForm({
      numero_notaria: '',
      nombre: '',
      notario_titular: '',
      entidad_federativa: 'Nayarit',
      municipio: 'Tepic',
      demarcacion: '',
      direccion: '',
      codigo_postal: '',
      telefono: '',
      whatsapp: '',
      correo_general: '',
      correo_proyectos: '',
      pagina_web: '',
      contacto_principal: '',
      horario: '',
      dias_atencion: '',
      tiempo_respuesta: '',
      tiempo_presupuesto: '',
      tiempo_firma: '',
      instrucciones_especiales: '',
      observaciones_generales: '',
      requisitos_frecuentes: '',
      tipos_acto_texto: '',
      instituciones_texto: '',
      municipios_atendidos_texto: '',
      activa: true,
      predeterminada: false,
      color_identificador: '#D4AF37'
    });
    setContactosForm([]);
    setFormError('');
    setFormTouched(false);
    setActiveFormTab('general');
    setShowModal(true);
  };

  const handleOpenEditModal = (notaria: Notaria) => {
    setEditingNotaria(notaria);
    setForm({
      numero_notaria: notaria.numero_notaria || '',
      nombre: notaria.nombre || '',
      notario_titular: notaria.notario_titular || '',
      entidad_federativa: notaria.entidad_federativa || 'Nayarit',
      municipio: notaria.municipio || 'Tepic',
      demarcacion: notaria.demarcacion || '',
      direccion: notaria.direccion || '',
      codigo_postal: notaria.codigo_postal || '',
      telefono: notaria.telefono || '',
      whatsapp: notaria.whatsapp || '',
      correo_general: notaria.correo_general || '',
      correo_proyectos: notaria.correo_proyectos || '',
      pagina_web: notaria.pagina_web || '',
      contacto_principal: notaria.contacto_principal || '',
      horario: notaria.horario || '',
      dias_atencion: notaria.dias_atencion || '',
      tiempo_respuesta: notaria.tiempo_respuesta || '',
      tiempo_presupuesto: notaria.tiempo_presupuesto || '',
      tiempo_firma: notaria.tiempo_firma || '',
      instrucciones_especiales: notaria.instrucciones_especiales || '',
      observaciones_generales: notaria.observaciones_generales || '',
      requisitos_frecuentes: notaria.requisitos_frecuentes || '',
      tipos_acto_texto: (notaria.tipos_acto_json || []).join(', '),
      instituciones_texto: (notaria.instituciones_json || []).join(', '),
      municipios_atendidos_texto: (notaria.municipios_atendidos_json || []).join(', '),
      activa: notaria.activa,
      predeterminada: notaria.predeterminada,
      color_identificador: notaria.color_identificador || '#D4AF37'
    });
    setContactosForm(notaria.contactos || []);
    setFormError('');
    setFormTouched(false);
    setActiveFormTab('general');
    setShowModal(true);
  };

  const handleAddContact = () => {
    if (!newContact.nombre.trim()) {
      addToast('Ingresa el nombre del contacto operativo', 'error');
      return;
    }
    setContactosForm([...contactosForm, { ...newContact, activo: true }]);
    setFormTouched(true);
    setNewContact({ nombre: '', cargo: 'Proyectista', telefono: '', whatsapp: '', correo: '', observaciones: '' });
    addToast('Contacto agregado a la lista', 'success');
  };

  const handleRemoveContact = (index: number) => {
    setContactosForm(contactosForm.filter((_, i) => i !== index));
    setFormTouched(true);
  };

  const handleCloseModal = () => {
    if (saving) return;
    if (formTouched && !confirm('¿Cerrar sin guardar los cambios de esta ficha?')) return;
    setShowModal(false);
    setFormError('');
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      addToast('El nombre de la notaría es obligatorio', 'error');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const toList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
      const { tipos_acto_texto, instituciones_texto, municipios_atendidos_texto, ...baseForm } = form;
      const payload = {
        ...baseForm,
        tipos_acto_json: toList(tipos_acto_texto),
        instituciones_json: toList(instituciones_texto),
        municipios_atendidos_json: toList(municipios_atendidos_texto),
        contactos: contactosForm
      };

      if (editingNotaria) {
        await updateNotaria(editingNotaria.id, payload);
        addToast('Notaría actualizada exitosamente', 'success');
      } else {
        await createNotaria(payload);
        addToast('Notaría registrada exitosamente en PRAVIA OS', 'success');
      }
      setFormTouched(false);
      setShowModal(false);
    } catch (err: any) {
      const message = err.detail || err.message || 'Error al guardar notaría';
      setFormError(message);
      addToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPredeterminada = async (id: string, nombre: string) => {
    try {
      await setPredeterminada(id);
      addToast(`"${nombre}" establecida como notaría predeterminada`, 'success');
    } catch (e: any) {
      addToast('Error al establecer notaría predeterminada', 'error');
    }
  };

  const handleArchiveNotaria = async (id: string, nombre: string) => {
    if (!confirm(`¿Archivar la notaría "${nombre}"? Sus contactos, cotizaciones y expedientes se conservarán.`)) return;
    try {
      await archiveNotaria(id);
      addToast(`Notaría "${nombre}" archivada de forma reversible`, 'success');
    } catch (err: any) {
      addToast(err.detail || err.message || 'Error al archivar notaría', 'error');
    }
  };

  // Filtering
  const deferredSearch = useDeferredValue(search);
  const filteredNotarias = notarias.filter((n) => {
    if (filterActiva === 'ACTIVAS' && !n.activa) return false;
    if (filterActiva === 'INACTIVAS' && n.activa) return false;
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase().trim();
      return (
        n.nombre.toLowerCase().includes(q) ||
        (n.numero_notaria && n.numero_notaria.includes(q)) ||
        (n.notario_titular && n.notario_titular.toLowerCase().includes(q)) ||
        n.municipio.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto fade-in">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-sm">
            <Building2 size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
              Catálogo Maestro de Notarías
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Gestión centralizada de notarías, contactos operativos y tiempos para PRAVIA OS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="min-h-11 px-5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-2"
        >
          <Plus size={16} />
          <span>Registrar Notaría</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por número, nombre, notario o municipio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-11 bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterActiva('TODAS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterActiva === 'TODAS' ? 'bg-blue-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todas ({notarias.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterActiva('ACTIVAS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterActiva === 'ACTIVAS' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Activas ({notarias.filter(n => n.activa).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterActiva('INACTIVAS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterActiva === 'INACTIVAS' ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Inactivas ({notarias.filter(n => !n.activa).length})
          </button>
        </div>
      </div>

      {/* NOTARIAS GRID / LIST */}
      {loading ? (
        <div className="p-16 text-center text-slate-600 flex flex-col items-center justify-center" role="status">
          <RefreshCw size={28} className="animate-spin text-amber-700 mb-2" />
          <p className="text-xs font-semibold">Cargando catálogo de notarías...</p>
        </div>
      ) : filteredNotarias.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotarias.map((n) => (
            <div
              key={n.id}
              className={`bg-white border rounded-2xl p-5 space-y-4 shadow-sm transition-colors relative overflow-hidden flex flex-col justify-between ${
                n.predeterminada 
                  ? 'border-amber-400 ring-1 ring-amber-200'
                  : n.activa
                    ? 'border-slate-200 hover:border-amber-300'
                    : 'border-slate-200 bg-slate-50 opacity-75'
              }`}
            >
              <div className="space-y-3">
                
                {/* CARD HEADER */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 font-extrabold font-mono text-sm shrink-0">
                      {n.numero_notaria ? `No. ${n.numero_notaria}` : 'N/A'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-950">{n.nombre}</h3>
                      </div>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-amber-700" />
                        {n.municipio}, {n.entidad_federativa}
                      </p>
                    </div>
                  </div>

                  {n.predeterminada && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200 flex items-center gap-1 shadow-sm shrink-0">
                      <Star size={11} className="fill-amber-700" /> Predeterminada
                    </span>
                  )}
                </div>

                {/* NOTARIO TITULAR */}
                {n.notario_titular && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center gap-2">
                    <User size={14} className="text-slate-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Notario titular</span>
                      <span className="font-bold text-slate-900">{n.notario_titular}</span>
                    </div>
                  </div>
                )}

                {/* CONTACT DETAILS */}
                <div className="space-y-1.5 text-sm text-slate-700 pt-1">
                  {n.telefono && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400" />
                      <span>{n.telefono}</span>
                    </div>
                  )}
                  {n.whatsapp && (
                    <div className="flex items-center gap-2">
                      <MessageCircle size={13} className="text-emerald-700" />
                      <span>WhatsApp {n.whatsapp}</span>
                    </div>
                  )}
                  {n.correo_general && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={13} className="text-slate-400" />
                      <span className="truncate">{n.correo_general}</span>
                    </div>
                  )}
                  {n.contacto_principal && (
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-slate-400" />
                      <span>Contacto: {n.contacto_principal}</span>
                    </div>
                  )}
                </div>

                {(n.tiempo_respuesta || n.tiempo_presupuesto || n.tiempo_firma) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {n.tiempo_respuesta && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                        <span className="block text-slate-500">Respuesta</span>
                        <strong className="text-slate-900">{n.tiempo_respuesta}</strong>
                      </div>
                    )}
                    {n.tiempo_presupuesto && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                        <span className="block text-slate-500">Presupuesto</span>
                        <strong className="text-slate-900">{n.tiempo_presupuesto}</strong>
                      </div>
                    )}
                    {n.tiempo_firma && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                        <span className="block text-slate-500">Firma</span>
                        <strong className="text-slate-900">{n.tiempo_firma}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* CONTACTOS OPERATIVOS COUNT */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users size={13} className="text-amber-700" />
                    {n.contactos?.length || 0} contacto(s) operativo(s)
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-blue-700 font-semibold">{n._count?.cotizaciones || 0} cotiz.</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">{n._count?.expedientes || 0} exp.</span>
                  </div>
                </div>

              </div>

              {/* CARD ACTIONS */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2 mt-4">
                <div className="flex items-center gap-2">
                  {!n.predeterminada && n.activa && (
                    <button
                      type="button"
                      onClick={() => handleSetPredeterminada(n.id, n.nombre)}
                      className="min-h-10 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800"
                    >
                      <Star size={12} /> Predeterminada
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(n)}
                    className="w-11 h-11 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800"
                    aria-label={`Editar ${n.nombre}`}
                    title="Editar notaría"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchiveNotaria(n.id, n.nombre)}
                    className="w-11 h-11 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-800 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800"
                    title="Archivar notaría"
                    aria-label={`Archivar ${n.nombre}`}
                  >
                    <Archive size={16} />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-600 bg-white rounded-2xl border border-slate-200 space-y-3">
          <Building2 size={40} className="mx-auto text-slate-400 mb-1" />
          <h3 className="text-base font-bold text-slate-900">No se encontraron notarías</h3>
          <p className="text-sm text-slate-600">Cambia los filtros o registra una nueva notaría.</p>
        </div>
      )}

      {/* MODAL: ALTA Y EDICIÓN COMPLETA DE NOTARÍA */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" role="presentation">
          <form onSubmit={handleSubmitForm} onChangeCapture={() => setFormTouched(true)} className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl p-4 sm:p-6 space-y-5 shadow-2xl flex flex-col max-h-[96dvh] sm:max-h-[90vh]" role="dialog" aria-modal="true" aria-labelledby="notaria-form-title">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 font-bold">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 id="notaria-form-title" className="text-lg font-bold text-slate-950">
                    {editingNotaria ? `Editar ${editingNotaria.nombre}` : 'Registrar Nueva Notaría'}
                  </h3>
                  <p className="text-sm text-slate-600">Ficha operativa reutilizable en PRAVIA OS</p>
                </div>
              </div>
              <button type="button" onClick={handleCloseModal} className="w-11 h-11 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800" aria-label="Cerrar formulario">
                <X size={20} />
              </button>
            </div>

            {/* FORM TABS */}
            <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-bold shrink-0 overflow-x-auto" role="tablist" aria-label="Secciones de la ficha">
              <button
                type="button"
                role="tab"
                aria-selected={activeFormTab === 'general'}
                onClick={() => setActiveFormTab('general')}
                className={`min-h-11 py-2.5 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeFormTab === 'general' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-600 hover:text-slate-950'}`}
              >
                1. Identificación
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeFormTab === 'contacto'}
                onClick={() => setActiveFormTab('contacto')}
                className={`min-h-11 py-2.5 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeFormTab === 'contacto' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-600 hover:text-slate-950'}`}
              >
                2. Contacto General
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeFormTab === 'contactos_operativos'}
                onClick={() => setActiveFormTab('contactos_operativos')}
                className={`min-h-11 py-2.5 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeFormTab === 'contactos_operativos' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-600 hover:text-slate-950'}`}
              >
                3. Contactos Operativos ({contactosForm.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeFormTab === 'config'}
                onClick={() => setActiveFormTab('config')}
                className={`min-h-11 py-2.5 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeFormTab === 'config' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-600 hover:text-slate-950'}`}
              >
                4. Operación y Configuración
              </button>
            </div>

            {/* FORM BODY */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-sm">

              {/* TAB 1: IDENTIFICACIÓN */}
              {activeFormTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Número de Notaría</label>
                      <input
                        type="text"
                        placeholder="Ej. 1"
                        value={form.numero_notaria}
                        onChange={(e) => setForm({ ...form, numero_notaria: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Nombre o Denominación Interna *</label>
                      <input
                        type="text"
                        placeholder="Ej. Notaría Pública No. 1"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Nombre Completo del Notario Titular</label>
                    <input
                      type="text"
                      placeholder="Ej. Lic. Javier Concordia Ramos"
                      value={form.notario_titular}
                      onChange={(e) => setForm({ ...form, notario_titular: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Entidad Federativa</label>
                      <input
                        type="text"
                        value={form.entidad_federativa}
                        onChange={(e) => setForm({ ...form, entidad_federativa: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Municipio</label>
                      <input
                        type="text"
                        value={form.municipio}
                        onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Demarcación Notarial</label>
                      <input
                        type="text"
                        placeholder="Ej. Primer Distrito"
                        value={form.demarcacion}
                        onChange={(e) => setForm({ ...form, demarcacion: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-4">
                    <div>
                    <label className="block text-slate-700 font-semibold mb-1">Dirección completa</label>
                    <input
                      type="text"
                      placeholder="Ej. Av. México No. 145 Sur, Centro"
                      value={form.direccion}
                      onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                    />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Código postal</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.codigo_postal}
                        onChange={(e) => setForm({ ...form, codigo_postal: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACTO GENERAL */}
              {activeFormTab === 'contacto' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Teléfono General</label>
                      <input
                        type="tel"
                        autoComplete="tel"
                        placeholder="Ej. 311-212-4590"
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">WhatsApp</label>
                      <input
                        type="tel"
                        placeholder="Ej. 311-102-3489"
                        value={form.whatsapp}
                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Correo Electrónico General</label>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="contacto@notaria1.mx"
                        value={form.correo_general}
                        onChange={(e) => setForm({ ...form, correo_general: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Correo para Proyectos y Escrituras</label>
                      <input
                        type="email"
                        placeholder="proyectos@notaria1.mx"
                        value={form.correo_proyectos}
                        onChange={(e) => setForm({ ...form, correo_proyectos: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                    <label className="block text-slate-700 font-semibold mb-1">Página web / portal</label>
                    <input
                      type="url"
                      placeholder="https://www.notaria1tepic.mx"
                      value={form.pagina_web}
                      onChange={(e) => setForm({ ...form, pagina_web: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                    />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Contacto principal</label>
                      <input
                        type="text"
                        value={form.contacto_principal}
                        onChange={(e) => setForm({ ...form, contacto_principal: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTACTOS OPERATIVOS MÚLTIPLES */}
              {activeFormTab === 'contactos_operativos' && (
                <div className="space-y-4">
                  
                  {/* ADD NEW CONTACT SUB-FORM */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                      + Agregar Contacto Operativo Vinculado
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="text-xs font-semibold text-slate-700">Nombre completo *
                        <input type="text" value={newContact.nombre} onChange={(e) => setNewContact({ ...newContact, nombre: e.target.value })} className="mt-1 w-full bg-white border border-slate-300 rounded-lg min-h-11 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">Cargo
                        <select value={newContact.cargo} onChange={(e) => setNewContact({ ...newContact, cargo: e.target.value })} className="mt-1 w-full bg-white border border-slate-300 rounded-lg min-h-11 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 cursor-pointer">
                          <option value="Abogado">Abogado / Proyectista</option>
                          <option value="Gestor">Gestor de Registro/Catastro</option>
                          <option value="Administración">Administración</option>
                          <option value="Contabilidad">Contabilidad / Facturación</option>
                          <option value="Recepción">Recepción</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-xs font-semibold text-slate-700">Teléfono
                        <input type="tel" value={newContact.telefono} onChange={(e) => setNewContact({ ...newContact, telefono: e.target.value })} className="mt-1 w-full bg-white border border-slate-300 rounded-lg min-h-11 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">WhatsApp
                        <input type="tel" value={newContact.whatsapp} onChange={(e) => setNewContact({ ...newContact, whatsapp: e.target.value })} className="mt-1 w-full bg-white border border-slate-300 rounded-lg min-h-11 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">Correo
                        <input type="email" value={newContact.correo} onChange={(e) => setNewContact({ ...newContact, correo: e.target.value })} className="mt-1 w-full bg-white border border-slate-300 rounded-lg min-h-11 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddContact}
                        className="min-h-11 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800"
                      >
                        Agregar Contacto
                      </button>
                    </div>
                  </div>

                  {/* LIST OF CONTACTS */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Contactos Operativos Registrados ({contactosForm.length})
                    </span>

                    {contactosForm.length > 0 ? (
                      contactosForm.map((c, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-950">{c.nombre} <span className="text-amber-800 font-normal">({c.cargo})</span></p>
                            <p className="text-xs text-slate-600">{c.telefono || 'Sin teléfono'} • {c.correo || 'Sin correo'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(idx)}
                            className="w-11 h-11 text-rose-700 hover:bg-rose-50 rounded-lg flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800"
                            aria-label={`Retirar ${c.nombre} de la ficha`}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 italic py-3 text-center">No se han agregado contactos operativos.</p>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 4: OPERACIÓN Y CONFIGURACIÓN */}
              {activeFormTab === 'config' && (
                <div className="space-y-6">
                  <section className="space-y-3" aria-labelledby="notaria-tiempos">
                    <h4 id="notaria-tiempos" className="font-bold text-slate-950 flex items-center gap-2">
                      <Clock size={17} className="text-amber-700" /> Horarios y tiempos operativos
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Horario</label>
                        <input type="text" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Días de atención</label>
                        <input type="text" value={form.dias_atencion} onChange={(e) => setForm({ ...form, dias_atencion: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Tiempo de respuesta</label>
                        <input type="text" value={form.tiempo_respuesta} onChange={(e) => setForm({ ...form, tiempo_respuesta: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Tiempo de presupuesto</label>
                        <input type="text" value={form.tiempo_presupuesto} onChange={(e) => setForm({ ...form, tiempo_presupuesto: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Tiempo para firma</label>
                        <input type="text" value={form.tiempo_firma} onChange={(e) => setForm({ ...form, tiempo_firma: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3" aria-labelledby="notaria-cobertura">
                    <h4 id="notaria-cobertura" className="font-bold text-slate-950 flex items-center gap-2">
                      <Landmark size={17} className="text-amber-700" /> Cobertura y experiencia
                    </h4>
                    <p className="text-xs text-slate-600">Separa cada elemento con una coma. La ficha guarda listas reutilizables, no texto decorativo.</p>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Tipos de acto que trabaja</label>
                        <input type="text" value={form.tipos_acto_texto} onChange={(e) => setForm({ ...form, tipos_acto_texto: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Municipios atendidos</label>
                        <input type="text" value={form.municipios_atendidos_texto} onChange={(e) => setForm({ ...form, municipios_atendidos_texto: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Instituciones con las que trabaja</label>
                        <input type="text" value={form.instituciones_texto} onChange={(e) => setForm({ ...form, instituciones_texto: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl min-h-11 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3" aria-labelledby="notaria-indicaciones">
                    <h4 id="notaria-indicaciones" className="font-bold text-slate-950 flex items-center gap-2">
                      <FileText size={17} className="text-amber-700" /> Indicaciones y requisitos
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Instrucciones especiales</label>
                        <textarea rows={3} value={form.instrucciones_especiales} onChange={(e) => setForm({ ...form, instrucciones_especiales: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 resize-y" />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Requisitos frecuentes</label>
                        <textarea rows={3} value={form.requisitos_frecuentes} onChange={(e) => setForm({ ...form, requisitos_frecuentes: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 resize-y" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Observaciones generales</label>
                      <textarea rows={3} value={form.observaciones_generales} onChange={(e) => setForm({ ...form, observaciones_generales: e.target.value })} className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 resize-y" />
                    </div>
                  </section>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.predeterminada}
                        onChange={(e) => setForm({ ...form, predeterminada: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-300 text-blue-900 focus:ring-blue-800"
                      />
                      <div>
                        <span className="font-bold text-amber-800 block">Establecer como Notaría Predeterminada</span>
                        <span className="text-xs text-slate-600">Aparecerá preseleccionada en nuevas cotizaciones.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-slate-100">
                      <input
                        type="checkbox"
                        checked={form.activa}
                        onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-300 text-blue-900 focus:ring-blue-800"
                      />
                      <div>
                        <span className="font-bold text-slate-950 block">Notaría Activa</span>
                        <span className="text-xs text-slate-600">Habilita esta notaría en cotizaciones y expedientes.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

            </div>

            {formError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
                {formError}
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
              <button type="button" onClick={handleCloseModal} disabled={saving} className="min-h-11 px-4 py-2 text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="min-h-11 px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-sm rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait">
                {saving ? 'Guardando…' : editingNotaria ? 'Guardar cambios' : 'Registrar notaría'}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
