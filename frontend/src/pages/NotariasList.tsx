import React, { useEffect, useState } from 'react';
import { 
  Building2, Plus, Search, Filter, Star, Edit2, Trash2, CheckCircle2, 
  XCircle, Phone, Mail, MapPin, User, Clock, Shield, AlertTriangle, RefreshCw,
  Users, Check, ExternalLink, ChevronRight
} from 'lucide-react';
import { useNotariasStore, Notaria, NotariaContacto } from '../stores/notariasStore';
import { useToastStore } from '../stores/toastStore';

export default function NotariasList() {
  const { notarias, loading, fetchNotarias, createNotaria, updateNotaria, setPredeterminada, deleteNotaria } = useNotariasStore();
  const { addToast } = useToastStore();

  const [search, setSearch] = useState('');
  const [filterActiva, setFilterActiva] = useState<'TODAS' | 'ACTIVAS' | 'INACTIVAS'>('TODAS');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingNotaria, setEditingNotaria] = useState<Notaria | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'contacto' | 'contactos_operativos' | 'config'>('general');

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
    horario: 'Lunes a Viernes 9:00 AM - 6:00 PM',
    tiempo_respuesta: '24-48 horas',
    tiempo_presupuesto: '24 horas',
    tiempo_firma: '3-5 días',
    instrucciones_especiales: '',
    observaciones_generales: '',
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
      horario: 'Lunes a Viernes 9:00 AM - 6:00 PM',
      tiempo_respuesta: '24-48 horas',
      tiempo_presupuesto: '24 horas',
      tiempo_firma: '3-5 días',
      instrucciones_especiales: '',
      observaciones_generales: '',
      activa: true,
      predeterminada: false,
      color_identificador: '#D4AF37'
    });
    setContactosForm([]);
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
      horario: notaria.horario || '',
      tiempo_respuesta: notaria.tiempo_respuesta || '',
      tiempo_presupuesto: notaria.tiempo_presupuesto || '',
      tiempo_firma: notaria.tiempo_firma || '',
      instrucciones_especiales: notaria.instrucciones_especiales || '',
      observaciones_generales: notaria.observaciones_generales || '',
      activa: notaria.activa,
      predeterminada: notaria.predeterminada,
      color_identificador: notaria.color_identificador || '#D4AF37'
    });
    setContactosForm(notaria.contactos || []);
    setActiveFormTab('general');
    setShowModal(true);
  };

  const handleAddContact = () => {
    if (!newContact.nombre.trim()) {
      addToast('Ingresa el nombre del contacto operativo', 'error');
      return;
    }
    setContactosForm([...contactosForm, { ...newContact, activo: true }]);
    setNewContact({ nombre: '', cargo: 'Proyectista', telefono: '', whatsapp: '', correo: '', observaciones: '' });
    addToast('Contacto agregado a la lista', 'success');
  };

  const handleRemoveContact = (index: number) => {
    setContactosForm(contactosForm.filter((_, i) => i !== index));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      addToast('El nombre de la notaría es obligatorio', 'error');
      return;
    }

    try {
      const payload = {
        ...form,
        contactos: contactosForm
      };

      if (editingNotaria) {
        await updateNotaria(editingNotaria.id, payload);
        addToast('Notaría actualizada exitosamente', 'success');
      } else {
        await createNotaria(payload);
        addToast('Notaría registrada exitosamente en PRAVIA OS', 'success');
      }
      setShowModal(false);
    } catch (err: any) {
      addToast(err.detail || err.message || 'Error al guardar notaría', 'error');
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

  const handleDeleteNotaria = async (id: string, nombre: string) => {
    if (!confirm(`¿Confirmas que deseas inactivar/dar de baja la notaría "${nombre}"?`)) return;
    try {
      await deleteNotaria(id);
      addToast(`Notaría "${nombre}" procesada exitosamente`, 'success');
    } catch (err: any) {
      addToast(err.detail || err.message || 'Error al eliminar notaría', 'error');
    }
  };

  // Filtering
  const filteredNotarias = notarias.filter((n) => {
    if (filterActiva === 'ACTIVAS' && !n.activa) return false;
    if (filterActiva === 'INACTIVAS' && n.activa) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-full mx-auto fade-in">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shadow-md">
            <Building2 size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Catálogo Maestro de Notarías
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestión centralizada de notarías, contactos operativos y tiempos para PRAVIA OS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="h-10 px-5 rounded-xl bg-gold hover:bg-gold-light text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <Plus size={16} />
          <span>Registrar Notaría</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por número, nombre, notario o municipio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterActiva('TODAS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterActiva === 'TODAS' ? 'bg-gold text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Todas ({notarias.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterActiva('ACTIVAS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterActiva === 'ACTIVAS' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Activas ({notarias.filter(n => n.activa).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterActiva('INACTIVAS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterActiva === 'INACTIVAS' ? 'bg-slate-700 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Inactivas ({notarias.filter(n => !n.activa).length})
          </button>
        </div>
      </div>

      {/* NOTARIAS GRID / LIST */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
          <RefreshCw size={28} className="animate-spin text-gold mb-2" />
          <p className="text-xs font-semibold">Cargando catálogo de notarías...</p>
        </div>
      ) : filteredNotarias.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotarias.map((n) => (
            <div
              key={n.id}
              className={`bg-slate-900/90 border rounded-2xl p-5 space-y-4 shadow-xl transition-all relative overflow-hidden flex flex-col justify-between ${
                n.predeterminada 
                  ? 'border-gold shadow-gold/10' 
                  : n.activa 
                    ? 'border-white/10 hover:border-gold/40' 
                    : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="space-y-3">
                
                {/* CARD HEADER */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold font-extrabold font-mono text-sm shrink-0">
                      {n.numero_notaria ? `No. ${n.numero_notaria}` : 'N/A'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-white">{n.nombre}</h3>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-gold" />
                        {n.municipio}, {n.entidad_federativa}
                      </p>
                    </div>
                  </div>

                  {n.predeterminada && (
                    <span className="px-2.5 py-1 rounded-full bg-gold/20 text-gold text-[10px] font-extrabold border border-gold/40 flex items-center gap-1 shadow-sm shrink-0">
                      <Star size={11} className="fill-gold" /> Predeterminada
                    </span>
                  )}
                </div>

                {/* NOTARIO TITULAR */}
                {n.notario_titular && (
                  <div className="p-2.5 bg-slate-950/70 rounded-xl border border-white/5 text-xs flex items-center gap-2">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Notario Titular:</span>
                      <span className="font-bold text-slate-200">{n.notario_titular}</span>
                    </div>
                  </div>
                )}

                {/* CONTACT DETAILS */}
                <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                  {n.telefono && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400" />
                      <span>{n.telefono}</span>
                    </div>
                  )}
                  {n.correo_general && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={13} className="text-slate-400" />
                      <span className="truncate">{n.correo_general}</span>
                    </div>
                  )}
                </div>

                {/* CONTACTOS OPERATIVOS COUNT */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10 text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users size={13} className="text-gold" />
                    {n.contactos?.length || 0} contacto(s) operativo(s)
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-sky-400 font-semibold">{n._count?.cotizaciones || 0} cotiz.</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{n._count?.expedientes || 0} exp.</span>
                  </div>
                </div>

              </div>

              {/* CARD ACTIONS */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2 mt-4">
                <div className="flex items-center gap-2">
                  {!n.predeterminada && n.activa && (
                    <button
                      type="button"
                      onClick={() => handleSetPredeterminada(n.id, n.nombre)}
                      className="px-2.5 py-1.5 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold text-xs font-bold border border-gold/30 transition-all flex items-center gap-1"
                    >
                      <Star size={12} /> Predeterminada
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(n)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                    title="Editar notaría"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNotaria(n.id, n.nombre)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-bold transition-all"
                    title="Inactivar o eliminar notaría"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/10 space-y-3">
          <Building2 size={40} className="mx-auto text-slate-600 mb-1" />
          <h3 className="text-base font-bold text-white">No se encontraron notarías</h3>
          <p className="text-xs text-slate-400">Intenta cambiar los filtros o registra una nueva notaría en el sistema.</p>
        </div>
      )}

      {/* MODAL: ALTA Y EDICIÓN COMPLETA DE NOTARÍA */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSubmitForm} className="bg-slate-900 border border-gold/40 rounded-2xl w-full max-w-3xl p-6 space-y-6 shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold font-bold">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingNotaria ? `Editar ${editingNotaria.nombre}` : 'Registrar Nueva Notaría'}
                  </h3>
                  <p className="text-xs text-slate-400">Catálogo Maestro reutilizable en PRAVIA OS</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* FORM TABS */}
            <div className="flex items-center border-b border-white/10 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setActiveFormTab('general')}
                className={`py-2.5 px-4 border-b-2 transition-all ${activeFormTab === 'general' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                1. Identificación
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('contacto')}
                className={`py-2.5 px-4 border-b-2 transition-all ${activeFormTab === 'contacto' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                2. Contacto General
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('contactos_operativos')}
                className={`py-2.5 px-4 border-b-2 transition-all ${activeFormTab === 'contactos_operativos' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                3. Contactos Operativos ({contactosForm.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('config')}
                className={`py-2.5 px-4 border-b-2 transition-all ${activeFormTab === 'config' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                4. Operación y Configuración
              </button>
            </div>

            {/* FORM BODY */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">

              {/* TAB 1: IDENTIFICACIÓN */}
              {activeFormTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Número de Notaría</label>
                      <input
                        type="text"
                        placeholder="Ej. 1"
                        value={form.numero_notaria}
                        onChange={(e) => setForm({ ...form, numero_notaria: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Nombre o Denominación Interna *</label>
                      <input
                        type="text"
                        placeholder="Ej. Notaría Pública No. 1"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-gold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nombre Completo del Notario Titular</label>
                    <input
                      type="text"
                      placeholder="Ej. Lic. Javier Concordia Ramos"
                      value={form.notario_titular}
                      onChange={(e) => setForm({ ...form, notario_titular: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Entidad Federativa</label>
                      <input
                        type="text"
                        value={form.entidad_federativa}
                        onChange={(e) => setForm({ ...form, entidad_federativa: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Municipio</label>
                      <input
                        type="text"
                        value={form.municipio}
                        onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Demarcación Notarial</label>
                      <input
                        type="text"
                        placeholder="Ej. Primer Distrito"
                        value={form.demarcacion}
                        onChange={(e) => setForm({ ...form, demarcacion: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Dirección Completa</label>
                    <input
                      type="text"
                      placeholder="Ej. Av. México No. 145 Sur, Centro"
                      value={form.direccion}
                      onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACTO GENERAL */}
              {activeFormTab === 'contacto' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Teléfono General</label>
                      <input
                        type="text"
                        placeholder="Ej. 311-212-4590"
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">WhatsApp</label>
                      <input
                        type="text"
                        placeholder="Ej. 311-102-3489"
                        value={form.whatsapp}
                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Correo Electrónico General</label>
                      <input
                        type="email"
                        placeholder="contacto@notaria1.mx"
                        value={form.correo_general}
                        onChange={(e) => setForm({ ...form, correo_general: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Correo para Proyectos y Escrituras</label>
                      <input
                        type="email"
                        placeholder="proyectos@notaria1.mx"
                        value={form.correo_proyectos}
                        onChange={(e) => setForm({ ...form, correo_proyectos: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Página Web / Portal (Opcional)</label>
                    <input
                      type="text"
                      placeholder="https://www.notaria1tepic.mx"
                      value={form.pagina_web}
                      onChange={(e) => setForm({ ...form, pagina_web: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: CONTACTOS OPERATIVOS MÚLTIPLES */}
              {activeFormTab === 'contactos_operativos' && (
                <div className="space-y-4">
                  
                  {/* ADD NEW CONTACT SUB-FORM */}
                  <div className="p-4 bg-slate-950 border border-white/10 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-gold uppercase tracking-wider block">
                      + Agregar Contacto Operativo Vinculado
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nombre completo..."
                        value={newContact.nombre}
                        onChange={(e) => setNewContact({ ...newContact, nombre: e.target.value })}
                        className="bg-slate-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-gold"
                      />
                      <select
                        value={newContact.cargo}
                        onChange={(e) => setNewContact({ ...newContact, cargo: e.target.value })}
                        className="bg-slate-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-gold cursor-pointer"
                      >
                        <option value="Abogado">Abogado / Proyectista</option>
                        <option value="Gestor">Gestor de Registro/Catastro</option>
                        <option value="Administración">Administración</option>
                        <option value="Contabilidad">Contabilidad / Facturación</option>
                        <option value="Recepción">Recepción</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Teléfono / WhatsApp..."
                        value={newContact.telefono}
                        onChange={(e) => setNewContact({ ...newContact, telefono: e.target.value })}
                        className="bg-slate-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-gold"
                      />
                      <input
                        type="email"
                        placeholder="Correo electrónico..."
                        value={newContact.correo}
                        onChange={(e) => setNewContact({ ...newContact, correo: e.target.value })}
                        className="bg-slate-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddContact}
                        className="px-3.5 py-1.5 bg-gold text-slate-950 font-bold text-xs rounded-lg shadow-sm"
                      >
                        Agregar Contacto
                      </button>
                    </div>
                  </div>

                  {/* LIST OF CONTACTS */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Contactos Operativos Registrados ({contactosForm.length})
                    </span>

                    {contactosForm.length > 0 ? (
                      contactosForm.map((c, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-white">{c.nombre} <span className="text-gold font-normal">({c.cargo})</span></p>
                            <p className="text-[11px] text-slate-400">{c.telefono || 'Sin teléfono'} • {c.correo || 'Sin correo'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(idx)}
                            className="text-rose-400 font-bold hover:text-rose-300 p-1"
                          >
                            ✕
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
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Horario y Días de Atención</label>
                      <input
                        type="text"
                        value={form.horario}
                        onChange={(e) => setForm({ ...form, horario: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Tiempo Estimado para Presupuesto</label>
                      <input
                        type="text"
                        value={form.tiempo_presupuesto}
                        onChange={(e) => setForm({ ...form, tiempo_presupuesto: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 border border-white/10 rounded-xl space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.predeterminada}
                        onChange={(e) => setForm({ ...form, predeterminada: e.target.checked })}
                        className="rounded border-white/20 bg-slate-900 text-gold focus:ring-gold"
                      />
                      <div>
                        <span className="font-bold text-gold block">Establecer como Notaría Predeterminada</span>
                        <span className="text-[11px] text-slate-400">Aparecerá preseleccionada automáticamente en nuevas cotizaciones.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-white/5">
                      <input
                        type="checkbox"
                        checked={form.activa}
                        onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                        className="rounded border-white/20 bg-slate-900 text-gold focus:ring-gold"
                      />
                      <div>
                        <span className="font-bold text-white block">Notaría Activa</span>
                        <span className="text-[11px] text-slate-400">Habilita esta notaría en los desplegables de Cotizaciones y Expedientes.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10 shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-400">
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 bg-gold text-slate-950 font-extrabold text-xs rounded-xl shadow-md">
                {editingNotaria ? 'Guardar Cambios' : 'Registrar Notaría'}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
