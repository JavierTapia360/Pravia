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
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto fade-in">
      
      {/* HEADER PRINCIPAL DEL MÓDULO PRAVIA OS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shadow-md">
            <Folder size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Módulo de Expedientes</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                PRAVIA OS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Centro operativo principal para la administración de procesos jurídicos, notariales y financieros
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => fetchExpedientes()}
            title="Recargar Expedientes"
            className="h-10 px-3.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-gold/30 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
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
