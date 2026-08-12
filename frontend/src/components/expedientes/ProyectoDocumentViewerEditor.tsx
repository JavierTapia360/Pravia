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
    <div className="project-editor fixed inset-0 z-80 flex flex-col overflow-hidden">
      {/* BARRA DE NAVEGACIÓN SUPERIOR / TOPBAR INTEGRADA */}
      <div className="project-editor__toolbar">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary btn-md"
          >
            <ArrowLeft size={16} />
            Volver al Expediente
          </button>
          <div className="project-viewer-divider" />
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-gold" />
            <div>
              <h3 className="text-base font-bold text-slate-950">Visor de proyecto (.DOCX)</h3>
              <p className="text-[13px] text-slate-600">Vista previa del documento; las nuevas versiones se cargan desde un archivo real</p>
            </div>
          </div>
        </div>

        {/* HERRAMIENTAS: ZOOM, DESCARGA Y CARGA DE VERSIÓN */}
        <div className="flex items-center gap-3">
          {/* Controles de Zoom */}
          <div className="segmented-control">
            <button onClick={handleZoomOut} title="Alejar" className="icon-button">
              <ZoomOut size={15} />
            </button>
            <span className="project-viewer-zoom">{zoom}%</span>
            <button onClick={handleZoomIn} title="Acercar" className="icon-button">
              <ZoomIn size={15} />
            </button>
            <button onClick={handleResetZoom} title="Restablecer" className="icon-button">
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Descargar .docx */}
          <a
            href={`/api/expedientes/${expedienteId}/proyecto/versions/${versionId}/descargar`}
            download
            className="btn btn-secondary btn-md"
          >
            <Download size={14} />
            Descargar
          </a>

          {/* Cargar un .docx real como nueva versión */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="btn btn-primary btn-md"
          >
            <Upload size={15} />
            Cargar nueva versión
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL DEL DOCUMENTO CON CONSERVA DE ESTILOS */}
      <div className="project-editor__stage">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Cargando y renderizando formato notarial…</p>
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
        <div className="modal-backdrop fixed inset-0 z-90 flex items-center justify-center p-4">
          <div className="surface-card w-full max-w-md p-6 space-y-4 shadow-xl">
            <h4 className="text-lg font-bold text-slate-950 flex items-center gap-2">
              <Upload size={18} className="text-gold" />
              Cargar Nueva Versión
            </h4>
            <p className="text-sm text-slate-600">
              Selecciona el archivo .docx ya corregido. Se agregará al historial sin sobrescribir la versión anterior.
            </p>

            <div>
              <label className="input-label block mb-2">Archivo DOCX</label>
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setVersionFile(event.target.files?.[0] || null)}
                className="input-field w-full p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-amber-700 file:px-3 file:py-1.5 file:font-bold file:text-white"
              />
            </div>

            <div>
              <label className="input-label block mb-2">Nota / descripción de la versión</label>
              <textarea
                rows={3}
                value={notaVersion}
                onChange={(e) => setNotaVersion(e.target.value)}
                placeholder="Ejemplo: V4 — Proyecto corregido por abogado tras revisión de datos"
                className="input-field w-full p-3 text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowSaveModal(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleUploadNewVersion}
                disabled={saving || !versionFile}
                className="btn btn-primary disabled:opacity-50"
              >
                {saving ? 'Cargando versión…' : 'Confirmar y cargar nueva versión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
