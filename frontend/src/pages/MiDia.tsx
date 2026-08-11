import { useAuthStore } from '../App';
import { PenTool, FileText, Wallet, AlertTriangle, CheckCircle2, Circle, ArrowRight, Calendar, Flag, Clock } from 'lucide-react';
import { useState } from 'react';

// Mock Data
const metricas = [
  { label: 'Firmas próximas', valor: 3, icon: <PenTool size={24} />, color: 'var(--color-primary)' },
  { label: 'Tareas pendientes', valor: 5, icon: <FileText size={24} />, color: 'var(--color-info)' },
  { label: 'Pagos pendientes', valor: 2, icon: <Wallet size={24} />, color: 'var(--color-warning)' },
  { label: 'Riesgos altos', valor: 4, icon: <AlertTriangle size={24} />, color: 'var(--color-danger)' },
];

const atenciones = [
  { tipo: 'danger', mensaje: 'Firma López mañana — saldo pendiente $12,000', id: 1 },
  { tipo: 'warning', mensaje: 'Cotización Ramírez — sin seguimiento 5 días', id: 2 },
  { tipo: 'warning', mensaje: 'Exp. 2024-087 — falta predial actualizado', id: 3 },
  { tipo: 'info', mensaje: 'Mensaje pendiente de Notaría #47', id: 4 },
];

type NotaPrioridad = 'ALTA' | 'MEDIA' | 'BAJA';
type NotaEstatus = 'PENDIENTE' | 'COMPLETADA' | 'POSPUESTA';

interface Nota {
  id: number;
  texto: string;
  estatus: NotaEstatus;
  prioridad: NotaPrioridad;
  fecha_limite?: string;
}

const initialNotas: Nota[] = [
  { id: 1, texto: 'Hablar con cliente sobre modificación', estatus: 'PENDIENTE', prioridad: 'ALTA', fecha_limite: 'Hoy' },
  { id: 2, texto: 'Revisar avalúo del predio en Col. Roma', estatus: 'PENDIENTE', prioridad: 'MEDIA' },
  { id: 3, texto: 'Confirmar disponibilidad notaría viernes', estatus: 'COMPLETADA', prioridad: 'BAJA' },
];

export default function MiDia() {
  const user = useAuthStore((state) => state.user);
  const [notas, setNotas] = useState<Nota[]>(initialNotas);
  const [nuevaNota, setNuevaNota] = useState('');
  const [nuevaPrioridad, setNuevaPrioridad] = useState<NotaPrioridad>('MEDIA');

  const fechaHoy = new Date().toLocaleDateString('es-MX', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const toggleNotaEstatus = (id: number) => {
    setNotas(notas.map(n => {
      if (n.id === id) {
        return { ...n, estatus: n.estatus === 'COMPLETADA' ? 'PENDIENTE' : 'COMPLETADA' };
      }
      return n;
    }));
  };

  const posponerNota = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotas(notas.map(n => n.id === id ? { ...n, estatus: 'POSPUESTA' } : n));
  };

  const addNota = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && nuevaNota.trim()) {
      setNotas([{ 
        id: Date.now(), 
        texto: nuevaNota, 
        estatus: 'PENDIENTE',
        prioridad: nuevaPrioridad
      }, ...notas]);
      setNuevaNota('');
    }
  };

  const getPriorityColor = (prioridad: NotaPrioridad) => {
    if (prioridad === 'ALTA') return 'var(--color-danger)';
    if (prioridad === 'MEDIA') return 'var(--color-warning)';
    return 'var(--color-info)';
  };

  // Ordenar: PENDIENTES primero (por prioridad), luego POSPUESTAS, luego COMPLETADAS
  const notasOrdenadas = [...notas].sort((a, b) => {
    const statusWeight = { 'PENDIENTE': 0, 'POSPUESTA': 1, 'COMPLETADA': 2 };
    const priorityWeight = { 'ALTA': 0, 'MEDIA': 1, 'BAJA': 2 };
    
    if (statusWeight[a.estatus] !== statusWeight[b.estatus]) {
      return statusWeight[a.estatus] - statusWeight[b.estatus];
    }
    return priorityWeight[a.prioridad] - priorityWeight[b.prioridad];
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER MI DÍA */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>
          Buenos días, {user?.nombre || 'Usuario'}
        </h1>
        <p className="text-secondary" style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>
          {fechaHoy}
        </p>
      </div>

      {/* MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {metricas.map((m, i) => (
          <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ 
              width: 56, height: 56, 
              borderRadius: 'var(--radius-md)', 
              background: `color-mix(in srgb, ${m.color} 15%, transparent)`,
              color: m.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {m.icon}
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{m.valor}</div>
              <div className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
        
        {/* REQUIERE ATENCIÓN */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <AlertTriangle size={20} color="var(--color-warning)" />
              Requiere Atención
            </h2>
          </div>
          <div style={{ padding: 'var(--space-2) 0' }}>
            {atenciones.map((a) => (
              <div key={a.id} style={{ 
                padding: 'var(--space-4) var(--space-6)', 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-color)',
                cursor: 'pointer'
              }} className="hover-bg-tertiary">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: `var(--color-${a.tipo})` }}></div>
                  <span style={{ fontWeight: 500 }}>{a.mensaje}</span>
                </div>
                <ArrowRight size={18} className="text-muted" />
              </div>
            ))}
          </div>
          <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Ver todas las alertas</button>
          </div>
        </div>

        {/* TAREAS PERSONALES (Antes Notas) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <CheckCircle2 size={20} color="var(--color-primary)" />
            Tareas Personales
          </h2>
          
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <select 
              className="input-field" 
              style={{ width: '90px', padding: 'var(--space-2)', background: 'var(--bg-tertiary)' }}
              value={nuevaPrioridad}
              onChange={(e) => setNuevaPrioridad(e.target.value as NotaPrioridad)}
            >
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Nueva tarea (Enter)" 
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              onKeyDown={addNota}
              style={{ background: 'var(--bg-tertiary)', flex: 1 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', flex: 1, overflowY: 'auto' }}>
            {notasOrdenadas.map(n => {
              const isCompleted = n.estatus === 'COMPLETADA';
              const isPostponed = n.estatus === 'POSPUESTA';
              
              return (
                <div 
                  key={n.id} 
                  onClick={() => toggleNotaEstatus(n.id)}
                  style={{ 
                    display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    cursor: 'pointer',
                    opacity: isCompleted ? 0.5 : (isPostponed ? 0.7 : 1),
                    borderLeft: `3px solid ${getPriorityColor(n.prioridad)}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div style={{ marginTop: '2px', color: isCompleted ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ 
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        fontSize: '0.95rem',
                        display: 'block'
                      }}>
                        {n.texto}
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Flag size={12} color={getPriorityColor(n.prioridad)} /> {n.prioridad}
                        </span>
                        {n.fecha_limite && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <Calendar size={12} /> {n.fecha_limite}
                          </span>
                        )}
                        {isPostponed && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0 4px' }}>Pospuesta</span>
                        )}
                      </div>
                    </div>
                    
                    {!isCompleted && !isPostponed && (
                      <button 
                        className="btn-icon" 
                        title="Posponer"
                        onClick={(e) => posponerNota(n.id, e)}
                        style={{ padding: '4px' }}
                      >
                        <Clock size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
