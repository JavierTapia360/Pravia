import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, RefreshCw } from 'lucide-react';
import { useExpedienteStore } from '../stores/expedienteStore';
import { ExpedientesMetrics } from '../components/expedientes/ExpedientesMetrics';
import { ExpedientesPanel } from '../components/expedientes/ExpedientesPanel';
import { ExpedienteCreateModal } from '../components/expedientes/ExpedienteCreateModal';
import { ExpedienteConvertModal } from '../components/expedientes/ExpedienteConvertModal';

export default function Expedientes() {
  const navigate = useNavigate();
  const { expedientes, loading, fetchExpedientes } = useExpedienteStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);

  useEffect(() => {
    fetchExpedientes();
  }, []);

  const handleOpenDetail = (id: string) => {
    navigate(`/expedientes/${id}`);
  };

  return (
    <div className="module-page expedientes-page fade-in">
      
      {/* HEADER PRINCIPAL DEL MÓDULO PRAVIA OS */}
      <div className="module-page-header">
        <div className="module-page-header__identity">
          <div className="module-page-header__icon">
            <Folder size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="module-title">Módulo de Expedientes</h1>
              <span className="badge badge-warning">
                PRAVIA OS
              </span>
            </div>
            <p className="module-description">
              Centro operativo principal para la administración de procesos jurídicos, notariales y financieros
            </p>
          </div>
        </div>

        <div className="module-actions">
          <button
            onClick={() => fetchExpedientes()}
            title="Recargar Expedientes"
            className="btn btn-secondary btn-md"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar Datos</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN SUPERIOR: METRICAS Y KPIS (DASHBOARD) */}
      <ExpedientesMetrics expedientes={expedientes} />

      {/* SECCIÓN INFERIOR REDISEÑADA: PANEL INDEPENDIENTE DE EXPEDIENTES */}
      <ExpedientesPanel
        expedientes={expedientes}
        loading={loading}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenConvert={() => setIsConvertOpen(true)}
        onOpenDetail={handleOpenDetail}
        onRefresh={() => fetchExpedientes()}
      />

      {/* MODALES INTERACTIVOS DE CREACIÓN Y CONVERSIÓN */}
      <ExpedienteCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <ExpedienteConvertModal
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
      />
    </div>
  );
}
