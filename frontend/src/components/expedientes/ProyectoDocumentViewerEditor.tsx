import React, { useState, useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Upload, Download, FileText } from 'lucide-react';

interface Props {
  expedienteId: string;
  versionId: string;
  onClose: () => void;
}

export const ProyectoDocumentViewerEditor: React.FC<Props> = ({ expedienteId, versionId, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [notaVersion, setNotaVersion] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [versionFile, setVersionFile] = useState<File | null>(null);

  useEffect(() => {
    loadDocxFile();
  }, [expedienteId, versionId]);

  const loadDocxFile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/proyecto/versions/${versionId}/visualizar`);
      if (res.ok && containerRef.current) {
        const buffer = await res.arrayBuffer();
        containerRef.current.innerHTML = '';
        await renderAsync(buffer, containerRef.current, undefined, {
          className: 'docx-rendered-page',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false
        });
      }
    } catch (e) {
      console.error('Error al renderizar .docx:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, 50));
  const handleResetZoom = () => setZoom(100);

  const handleUploadNewVersion = async () => {
    if (!versionFile) {
      alert('Selecciona el archivo .docx real que deseas registrar como nueva versión.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', versionFile);
      formData.append('nota_version', notaVersion || `Nueva versión cargada: ${versionFile.name}`);

      const res = await fetch(`/api/expedientes/${expedienteId}/proyecto/upload`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setShowSaveModal(false);
        setVersionFile(null);
        alert('¡Nueva versión del proyecto cargada con éxito! La versión anterior fue conservada intacta.');
        onClose();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.detail || errorData.error || 'Error al cargar la nueva versión.');
      }
    } catch (e) {
      alert('Error de conexión al cargar la nueva versión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-80 bg-dark-bg flex flex-col overflow-hidden text-white">
      {/* BARRA DE NAVEGACIÓN SUPERIOR / TOPBAR INTEGRADA */}
      <div className="bg-dark-card border-b border-dark-border p-3.5 flex items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-xs font-bold text-muted hover:text-white bg-dark-bg/60 border border-dark-border px-3 py-1.5 rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
            Volver al Expediente
          </button>
          <div className="h-4 w-px bg-dark-border" />
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-gold" />
            <div>
              <h3 className="text-sm font-bold text-white">Visor de Proyecto (.DOCX)</h3>
              <p className="text-[10px] text-muted">Vista previa del documento; las nuevas versiones se cargan desde un archivo real</p>
            </div>
          </div>
        </div>

        {/* HERRAMIENTAS: ZOOM, DESCARGA Y CARGA DE VERSIÓN */}
        <div className="flex items-center gap-3">
          {/* Controles de Zoom */}
          <div className="flex items-center gap-1 bg-dark-bg border border-dark-border rounded-xl p-1">
            <button onClick={handleZoomOut} title="Alejar" className="p-1 text-muted hover:text-white rounded-lg">
              <ZoomOut size={15} />
            </button>
            <span className="text-xs font-bold px-2 text-gold">{zoom}%</span>
            <button onClick={handleZoomIn} title="Acercar" className="p-1 text-muted hover:text-white rounded-lg">
              <ZoomIn size={15} />
            </button>
            <button onClick={handleResetZoom} title="Restablecer" className="p-1 text-muted hover:text-white rounded-lg">
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Descargar .docx */}
          <a
            href={`/api/expedientes/${expedienteId}/proyecto/versions/${versionId}/descargar`}
            download
            className="flex items-center gap-1.5 bg-dark-bg hover:bg-dark-border text-gold border border-gold/30 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
          >
            <Download size={14} />
            Descargar
          </a>

          {/* Cargar un .docx real como nueva versión */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 bg-gold hover:bg-gold-light text-dark-bg font-extrabold text-xs px-4 py-1.5 rounded-xl shadow-lg shadow-gold/10 transition-all"
          >
            <Upload size={15} />
            Cargar Nueva Versión
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL DEL DOCUMENTO CON CONSERVA DE ESTILOS */}
      <div className="flex-1 overflow-auto p-6 bg-stone-900/90 flex justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-muted">Cargando y renderizando formato notarial...</p>
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-150 w-full max-w-4xl"
          >
            <div
              ref={containerRef}
              className="bg-white text-black p-10 rounded shadow-2xl min-h-[1100px] font-serif text-sm leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* MODAL PARA CARGAR NUEVA VERSIÓN */}
      {showSaveModal && (
        <div className="fixed inset-0 z-90 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Upload size={18} className="text-gold" />
              Cargar Nueva Versión
            </h4>
            <p className="text-xs text-muted">
              Selecciona el archivo .docx ya corregido. Se agregará al historial sin sobrescribir la versión anterior.
            </p>

            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-2">Archivo DOCX</label>
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setVersionFile(event.target.files?.[0] || null)}
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-white file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-3 file:py-1.5 file:font-bold file:text-dark-bg"
              />
            </div>

            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-2">Nota / Descripción de la Versión</label>
              <textarea
                rows={3}
                value={notaVersion}
                onChange={(e) => setNotaVersion(e.target.value)}
                placeholder="Ejemplo: V4 — Proyecto corregido por abogado tras revisión de datos"
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-xs font-semibold text-muted hover:text-white">
                Cancelar
              </button>
              <button
                onClick={handleUploadNewVersion}
                disabled={saving || !versionFile}
                className="bg-gold text-dark-bg font-extrabold text-xs px-4 py-2 rounded-xl disabled:opacity-50 transition-all"
              >
                {saving ? 'Cargando Versión...' : 'Confirmar y Cargar Nueva Versión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
