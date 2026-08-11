import React, { useState, useEffect } from 'react';
import { X, Search, Link2, UserCheck, Building2, CheckCircle } from 'lucide-react';
import { comparecientesService } from '../../services/comparecientes.service';

interface ModalVincularComparecienteProps {
  isOpen: boolean;
  expedienteId: string;
  expedienteFolio?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalVincularCompareciente: React.FC<ModalVincularComparecienteProps> = ({
  isOpen,
  expedienteId,
  expedienteFolio,
  onClose,
  onSuccess,
}) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [selectedCompareciente, setSelectedCompareciente] = useState<any>(null);
  const [catalogos, setCatalogos] = useState<{ caracteresCompareciente: any[]; caracteresRepresentacion: any[] }>({
    caracteresCompareciente: [],
    caracteresRepresentacion: [],
  });

  const [caracterId, setCaracterId] = useState('');
  const [formaComparecencia, setFormaComparecencia] = useState('PROPIO_DERECHO');
  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCatalogos();
      fetchMaster();
    }
  }, [isOpen]);

  const loadCatalogos = async () => {
    try {
      const res = await comparecientesService.obtenerCatalogos();
      if (res?.success) {
        setCatalogos(res.data);
        if (res.data.caracteresCompareciente?.length > 0) {
          setCaracterId(res.data.caracteresCompareciente[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMaster = async () => {
    setLoadingSearch(true);
    try {
      const res = await comparecientesService.listarMaster({ search, limit: 15 });
      setResults(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMaster();
  };

  const handleVincular = async () => {
    if (!selectedCompareciente || !caracterId) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await comparecientesService.vincularAExpediente({
        expediente_id: expedienteId,
        compareciente_id: selectedCompareciente.id,
        caracter_id: caracterId,
        forma_comparecencia: formaComparecencia,
        observaciones,
      });

      if (res?.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(res?.error || 'No se pudo vincular la persona');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al vincular con el expediente');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-gold-500" />
              Vincular Persona a Expediente {expedienteFolio ? `(${expedienteFolio})` : ''}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selecciona una Persona de la base maestra y define su Carácter Notarial
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {errorMsg}
            </div>
          )}

          {/* 1. Buscador */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por Nombre, Razón Social, CURP, RFC o Teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl"
            >
              Buscar
            </button>
          </form>

          {/* 2. Lista de Personas */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resultados del Catálogo Maestro ({results.length})</p>
            {loadingSearch ? (
              <p className="text-xs text-slate-400 py-4 text-center">Cargando catálogo...</p>
            ) : results.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No se encontraron personas con ese criterio.</p>
            ) : (
              results.map((c) => {
                const isSelected = selectedCompareciente?.id === c.id;
                const isFisica = c.tipo_persona === 'FISICA';
                const nombre = isFisica
                  ? (c.personaFisica?.nombre_completo_calculado || c.nombre_busqueda)
                  : (c.personaMoral?.razon_social || c.nombre_busqueda);

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCompareciente(c)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-gold-500 bg-gold-50/20 dark:bg-gold-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isFisica ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      }`}>
                        {isFisica ? <UserCheck className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{nombre}</p>
                        <p className="text-[10px] text-slate-500">
                          {isFisica ? `CURP: ${c.personaFisica?.curp || 'N/D'}` : `RFC: ${c.personaMoral?.rfc || 'N/D'}`}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-gold-500" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 3. Selección de Carácter Notarial y Comparecencia */}
          {selectedCompareciente && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Definir Rol de: <span className="text-gold-600 dark:text-gold-400 font-extrabold">
                  {selectedCompareciente.personaFisica?.nombre_completo_calculado || selectedCompareciente.personaMoral?.razon_social || selectedCompareciente.nombre_busqueda}
                </span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Carácter Jurídico Notarial *</label>
                  <select
                    value={caracterId}
                    onChange={(e) => setCaracterId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {catalogos.caracteresCompareciente.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.nombre} ({car.clave})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Forma de Comparecencia</label>
                  <select
                    value={formaComparecencia}
                    onChange={(e) => setFormaComparecencia(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="PROPIO_DERECHO">Por su propio derecho</option>
                    <option value="EN_REPRESENTACION_PERSONA_MORAL">En representación de Persona Moral</option>
                    <option value="EN_REPRESENTACION_PERSONA_FISICA">En representación de Persona Física (Apoderado)</option>
                    <option value="CARACTER_INSTITUCIONAL">Carácter Institucional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ObservacionesNotariales (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Firmante en sustitución por poder Notaría 4"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800">
            Cancelar
          </button>
          <button
            onClick={handleVincular}
            disabled={!selectedCompareciente || !caracterId || submitting}
            className="px-5 py-2 text-xs font-bold text-slate-900 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 rounded-xl transition-all shadow"
          >
            {submitting ? 'Viculando...' : 'Confirmar Vinculación Notarial'}
          </button>
        </div>

      </div>
    </div>
  );
};
