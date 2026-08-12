import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Download, FileText, Search } from 'lucide-react';

export const ProyectoDocumentViewerPage: React.FC = () => {
  const { expedienteId, versionId } = useParams<{ expedienteId: string; versionId: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [versionInfo, setVersionInfo] = useState<any>(null);

  useEffect(() => {
    if (expedienteId && versionId) {
      loadDocxFile();
    }
  }, [expedienteId, versionId]);

  const loadDocxFile = async () => {
    setLoading(true);
    try {
      // 1. Obtener metadatos del proyecto
      const metaRes = await fetch(`/api/expedientes/${expedienteId}/proyecto`);
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        const v = metaData.versiones?.find((x: any) => x.id === versionId);
        if (v) setVersionInfo(v);
      }

      // 2. Transmitir el archivo binario .docx y renderizarlo con docx-preview
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
      console.error('Error al renderizar archivo .docx:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, 50));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className="module-page project-viewer-page">
      {/* BARRA SUPERIOR DE ENCABEZADO Y ACCIONES */}
      <div className="surface-card project-viewer-toolbar">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/expedientes/${expedienteId}?tab=proyecto`)}
            className="btn btn-secondary btn-md"
          >
            <ArrowLeft size={16} className="text-gold" />
            Volver al expediente
          </button>

          <div className="project-viewer-divider" />

          <div>
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-gold" />
              <h1 className="text-xl font-bold text-slate-950">
                Visor de Proyecto de Escritura e IA
              </h1>
              {versionInfo && (
                <span className="text-xs font-black text-gold bg-gold/10 px-2.5 py-0.5 rounded-full border border-gold/30 uppercase">
                  Versión {versionInfo.version_numero}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-slate-600">
              {versionInfo?.nota_version || 'Preservación de Formato Notarial — Renderizado Fiel (Opción A: Visor)'}
            </p>
          </div>
        </div>

        {/* HERRAMIENTAS: ZOOM, BÚSQUEDA Y DESCARGA */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Búsqueda dentro del documento */}
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-muted" />
            <input
              type="text"
              placeholder="Buscar en el proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field project-viewer-search"
            />
          </div>

          {/* Controles de Zoom */}
          <div className="segmented-control">
            <button type="button" onClick={handleZoomOut} title="Alejar" className="icon-button">
              <ZoomOut size={16} />
            </button>
            <span className="project-viewer-zoom">{zoom}%</span>
            <button type="button" onClick={handleZoomIn} title="Acercar" className="icon-button">
              <ZoomIn size={16} />
            </button>
            <button type="button" onClick={handleResetZoom} title="Restablecer" className="icon-button">
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Botón Descargar .docx */}
          <a
            href={`/api/expedientes/${expedienteId}/proyecto/versions/${versionId}/descargar`}
            download
            className="btn btn-primary btn-md"
          >
            <Download size={16} />
            Descargar .docx
          </a>
        </div>
      </div>

      {/* ÁREA DE LECTURA Y VISUALIZACIÓN DE PÁGINAS NOTARIALES */}
      <div className="project-document-stage">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Cargando y procesando estructura del instrumento notarial…</p>
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-150 w-full max-w-4xl"
          >
            <div
              ref={containerRef}
              className="bg-white text-black p-10 rounded-xl shadow-2xl min-h-[1100px] outline-none font-serif text-sm leading-relaxed"
            />
          </div>
        )}
      </div>
    </div>
  );
};
