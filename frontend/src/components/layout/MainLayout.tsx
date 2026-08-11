import { NavLink, Outlet } from 'react-router-dom';
import { 
  Home, Users, FileText, FolderOpen, Building2,
  UserSquare2, Files, Wallet, Calendar, 
  BarChart3, BrainCircuit, AlertTriangle, Settings, Search, Bell, Menu
} from 'lucide-react';
import { useAuthStore } from '../../App';
import { useState } from 'react';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { to: "/mi-dia", icon: <Home size={20} />, label: "Mi Día" },
    { to: "/prospectos", icon: <Users size={20} />, label: "Prospectos" },
    { to: "/cotizaciones", icon: <FileText size={20} />, label: "Cotizaciones" },
    { to: "/expedientes", icon: <FolderOpen size={20} />, label: "Expedientes" },
    { to: "/notarias", icon: <Building2 size={20} />, label: "Notarías" },
    { to: "/comparecientes", icon: <UserSquare2 size={20} />, label: "Comparecientes" },
    { to: "/finanzas", icon: <Wallet size={20} />, label: "Finanzas" },
    { to: "/agenda", icon: <Calendar size={20} />, label: "Agenda" },
    { to: "/reportes", icon: <BarChart3 size={20} />, label: "Reportes" },
    { to: "/inteligencia", icon: <BrainCircuit size={20} />, label: "Inteligencia" },
    { to: "/riesgos", icon: <AlertTriangle size={20} />, label: "Riesgos" },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* SIDEBAR */}
      <aside 
        className="glass-panel" 
        style={{ 
          width: sidebarCollapsed ? '72px' : '260px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          borderRadius: 0,
          borderRight: '1px solid var(--border-color)',
          borderTop: 'none', borderBottom: 'none', borderLeft: 'none',
          zIndex: 10
        }}
      >
        <div style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', borderBottom: '1px solid var(--border-color)' }}>
          {!sidebarCollapsed && (
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>PRAVIA <span style={{ color: 'var(--color-primary)' }}>OS</span></h1>
          )}
          <button className="btn-icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <Menu size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: 'var(--space-4) 0', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {navItems.map((item) => (
              <li key={item.to} style={{ margin: '0 var(--space-2) var(--space-1) var(--space-2)' }}>
                <NavLink 
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    textDecoration: 'none',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
                  })}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                  {!sidebarCollapsed && <span style={{ marginLeft: 'var(--space-3)' }}>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }} onClick={logout}>
            <Settings size={20} />
            {!sidebarCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* HEADER */}
        <header 
          className="glass-panel"
          style={{ 
            height: '72px', 
            borderRadius: 0,
            borderBottom: '1px solid var(--border-color)',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-6)',
            zIndex: 5
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar expedientes, clientes..." 
              className="input-field"
              style={{ paddingLeft: '40px', borderRadius: 'var(--radius-xl)', background: 'var(--bg-tertiary)' }}
            />
          </div>

          {/* Actions & User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <button className="btn-icon" style={{ position: 'relative' }}>
              <AlertTriangle size={20} color="var(--color-warning)" />
              <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, background: 'var(--color-danger)', borderRadius: '50%' }}></span>
            </button>
            <button className="btn-icon" style={{ position: 'relative' }}>
              <Bell size={20} />
            </button>
            
            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{ 
                width: 36, height: 36, 
                borderRadius: '50%', 
                background: 'var(--color-primary-dark)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '1rem'
              }}>
                {user?.nombre?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.nombre || 'Usuario'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.rol || 'Rol'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* OUTLET CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
          <Outlet />
        </main>

      </div>
    </div>
  );
}
