import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, Download, Loader2, Eye, X } from 'lucide-react';
import { api } from '../../services/api';
import { useToastStore } from '../../stores/toastStore';

interface Documento {
  id: string;
  nombre_original: string;
  tipo: string;
  categoria: string;
  mime_type: string;
  size_bytes: number;
  fecha_carga: string;
  subido_por: { nombre: string };
}

interface Props {
  prospectoId: string;
}

const TIPOS_DOC = ['Identificación Oficial (INE/Pasaporte)', 'Predial', 'Escritura / Título de Propiedad', 'Acta de Nacimiento', 'CURP', 'RFC', 'Acta de Matrimonio', 'Poder Notarial', 'Otro'];

export function DocumentosTab({ prospectoId }: Props) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadData, setUploadData] = useState<{ file: File | null; tipo: string; observaciones: string }>({
    file: null,
    tipo: '',
    observaciones: ''
  });

  const fetchDocumentos = async () => {
    setIsLoading(true);
    try {
      const data = await api.get(`/prospectos/${prospectoId}/documentos`);
      setDocumentos(data);
    } catch (error) {
      toast.add('Error al cargar documentos.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentos();
  }, [prospectoId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadData(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleUpload = async () => {
    if (!uploadData.file || !uploadData.tipo) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('archivo', uploadData.file);
      formData.append('tipo', uploadData.tipo);
      formData.append('observaciones', uploadData.observaciones);
      formData.append('prospecto_id', prospectoId);
      
      // We will hardcode user_id for now until we have real auth
      const fakeUser = await api.get('/prospectos').then(res => res[0]?.atendido_por?.id || '8127559a-e44f-4f44-97de-cbebc68d7cd3').catch(() => '8127559a-e44f-4f44-97de-cbebc68d7cd3');
      formData.append('user_id', fakeUser); 

      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/documentos`, {
        method: 'POST',
        body: formData,
      });

      toast.add('Documento subido correctamente.', 'success');
      setUploadData({ file: null, tipo: '', observaciones: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocumentos();
    } catch (error) {
      toast.add('Error al subir documento.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreview = async (doc: Documento) => {
    try {
      const { url } = await api.get(`/documentos/${doc.id}/url`);
      window.open(url, '_blank');
    } catch (error) {
      toast.add('No se pudo generar el enlace del documento.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;
    try {
      await api.delete(`/documentos/${id}`);
      toast.add('Documento eliminado.', 'info');
      setDocumentos(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      toast.add('Error al eliminar el documento.', 'error');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Upload Zone */}
      <div className="glass-card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nuevo Documento</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div>
            <select className="input-field" value={uploadData.tipo} onChange={e => setUploadData(p => ({ ...p, tipo: e.target.value }))}>
              <option value="">Seleccionar Tipo...</option>
              {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
             <input type="text" className="input-field" placeholder="Observaciones (opcional)" value={uploadData.observaciones} onChange={e => setUploadData(p => ({ ...p, observaciones: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="input-field" 
            style={{ flex: 1, padding: '4px' }}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          {uploadData.file && (
            <button className="btn-icon" onClick={() => { setUploadData(p => ({...p, file: null})); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
              <X size={16} />
            </button>
          )}
          <button 
            className="btn btn-primary" 
            onClick={handleUpload} 
            disabled={!uploadData.file || !uploadData.tipo || isUploading}
            style={{ minWidth: '120px' }}
          >
            {isUploading ? <><Loader2 size={16} className="spin" /> Subiendo</> : <><Upload size={16} /> Subir</>}
          </button>
        </div>
      </div>

      {/* List */}
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>Documentos Adjuntos ({documentos.length})</div>
        
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando documentos...</div>
        ) : documentos.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
            No hay documentos cargados en este prospecto.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {documentos.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{doc.tipo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.nombre_original}</span>
                      <span>•</span>
                      <span>{formatSize(doc.size_bytes)}</span>
                      <span>•</span>
                      <span>{new Date(doc.fecha_carga).toLocaleDateString('es-MX')} por {doc.subido_por?.nombre}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  <button className="btn-icon" onClick={() => handlePreview(doc)} title="Ver / Descargar">
                    <Eye size={16} />
                  </button>
                  <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(doc.id)} title="Eliminar">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
