import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Download, FileText, Search, ShieldCheck, Cpu } from 'lucide-react';
import { api } from '../services/api';

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
      const metaData = await api.get(`/expedientes/${expedienteId}/proyecto`);
      const allVersions = [metaData.vigente, ...(metaData.historial || [])].filter(Boolean);
      const v = allVersions.find((x: any) => x.id === versionId);
      if (v) setVersionInfo(v);

      // 2. Transmitir el archivo binario .docx y renderizarlo con docx-preview
      const res = await api.response(`/expedientes/${expedienteId}/proyecto/versions/${versionId}/visualizar`);
      if (containerRef.current) {
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
  const handleDownload = async () => {
    const blob = await api.blob(`/expedientes/${expedienteId}/proyecto/versions/${versionId}/descargar`);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = versionInfo?.nombre_original || 'proyecto.docx';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col p-6 space-y-6">
      {/* BARRA SUPERIOR DE ENCABEZADO Y ACCIONES */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/expedientes/${expedienteId}?tab=proyecto`)}
            className="flex items-center gap-2 text-xs font-bold text-white bg-gold/10 hover:bg-gold/20 border border-gold/30 px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft size={16} className="text-gold" />
            Volver al expediente 0005-2026
          </button>

          <div className="h-6 w-px bg-dark-border" />

          <div>
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-gold" />
              <h1 className="text-base font-extrabold text-white">
                Visor de Proyecto de Escritura e IA
              </h1>
              {versionInfo && (
                <span className="text-xs font-black text-gold bg-gold/10 px-2.5 py-0.5 rounded-full border border-gold/30 uppercase">
                  Versión {versionInfo.version_numero}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
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
              className="bg-dark-bg border border-dark-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:border-gold focus:outline-none w-52"
            />
          </div>

          {/* Controles de Zoom */}
          <div className="flex items-center gap-1 bg-dark-bg border border-dark-border rounded-xl p-1">
            <button type="button" onClick={handleZoomOut} title="Alejar" className="p-1.5 text-muted hover:text-white rounded-lg">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-bold px-2 text-gold">{zoom}%</span>
            <button type="button" onClick={handleZoomIn} title="Acercar" className="p-1.5 text-muted hover:text-white rounded-lg">
              <ZoomIn size={16} />
            </button>
            <button type="button" onClick={handleResetZoom} title="Restablecer" className="p-1.5 text-muted hover:text-white rounded-lg">
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Botón Descargar .docx */}
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="flex items-center gap-2 bg-gold hover:bg-gold-light text-dark-bg font-extrabold text-xs px-4 py-2 rounded-xl shadow-lg shadow-gold/10 transition-all"
          >
            <Download size={16} />
            Descargar .docx
          </button>
        </div>
      </div>

      {/* ÁREA DE LECTURA Y VISUALIZACIÓN DE PÁGINAS NOTARIALES */}
      <div className="flex-1 bg-stone-950/80 border border-dark-border rounded-2xl p-8 flex justify-center overflow-auto shadow-2xl min-h-[800px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-muted">Cargando y procesando estructura del instrumento notarial...</p>
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
