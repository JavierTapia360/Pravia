import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { isAppRole, navigationForRole, roleLabels } from '../../config/navigation';
import type { AppRole } from '../../config/navigation';
import { miDiaService } from '../../services/miDia.service';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [attentionCount, setAttentionCount] = useState(0);

  const navigation = useMemo(() => navigationForRole(user?.rol), [user?.rol]);
  const searchableItems = useMemo(() => navigation.flatMap((group) => group.items), [navigation]);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es-MX');
  const searchResults = normalizedQuery
    ? searchableItems.filter((item) => `${item.label} ${item.description}`.toLocaleLowerCase('es-MX').includes(normalizedQuery)).slice(0, 6)
    : searchableItems.slice(0, 5);
  const currentItem = [...searchableItems]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
  const currentGroup = navigation.find((group) => group.items.some((item) => item.to === currentItem?.to));
  const rawUserRole: unknown = user?.rol;
  const userRole: AppRole = isAppRole(rawUserRole) ? rawUserRole : 'RECEPCION';
  const userInitial = user?.nombre?.trim()?.charAt(0).toLocaleUpperCase('es-MX') || 'U';

  useEffect(() => {
    setMobileSidebarOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let active = true;
    miDiaService.getDashboard()
      .then((dashboard) => {
        if (active) setAttentionCount(Array.isArray(dashboard?.alertas) ? dashboard.alertas.length : 0);
      })
      .catch(() => {
        if (active) setAttentionCount(0);
      });
    return () => { active = false; };
  }, [location.pathname, user?.id]);

  const selectSearchResult = (to: string) => {
    navigate(to);
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar navegación"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside className={`app-sidebar${mobileSidebarOpen ? ' app-sidebar--mobile-open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-brand">
          <NavLink to="/mi-dia" className="brand-mark" aria-label="PRAVIA OS, ir a Mi Día">
            <span className="brand-symbol" aria-hidden="true">P</span>
            <span className="brand-copy">
              <strong>PRAVIA</strong>
              <small>OPERATIONS SYSTEM</small>
            </span>
          </NavLink>
          <button type="button" className="icon-button sidebar-mobile-close" onClick={() => setMobileSidebarOpen(false)} aria-label="Cerrar navegación">
            <X size={19} />
          </button>
        </div>

        <nav className="sidebar-navigation">
          {navigation.map((group) => (
            <section className="nav-group" key={group.label} aria-labelledby={`nav-${group.label}`}>
              <h2 id={`nav-${group.label}`} className="nav-group-label">{group.label}</h2>
              <ul>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="user-avatar" aria-hidden="true">{userInitial}</span>
            <span className="sidebar-user-copy">
              <strong>{user?.nombre || 'Usuario'}</strong>
              <small>{roleLabels[userRole]}</small>
            </span>
            <button type="button" className="icon-button" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? 'Expandir navegación' : 'Contraer navegación'}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            <span>{sidebarCollapsed ? 'Expandir' : 'Contraer navegación'}</span>
          </button>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <div className="topbar-context">
            <button type="button" className="icon-button topbar-menu" onClick={() => setMobileSidebarOpen(true)} aria-label="Abrir navegación">
              <Menu size={20} />
            </button>
            <div className="page-context">
              <span>{currentGroup?.label || 'PRAVIA OS'}</span>
              <strong>{currentItem?.label || 'Módulo operativo'}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="module-search">
              <Search size={17} aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                placeholder="Ir a un módulo…"
                aria-label="Buscar módulo"
                aria-expanded={searchOpen}
                aria-controls="module-search-results"
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
              />
              <kbd>⌘ K</kbd>
              {searchOpen && (
                <div className="module-search-results" id="module-search-results" role="listbox">
                  <div className="module-search-heading">Navegación rápida</div>
                  {searchResults.length ? searchResults.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button type="button" role="option" aria-selected="false" key={item.to} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSearchResult(item.to)}>
                        <span className="search-result-icon"><Icon size={17} /></span>
                        <span><strong>{item.label}</strong><small>{item.description}</small></span>
                      </button>
                    );
                  }) : <p className="module-search-empty">No hay módulos que coincidan.</p>}
                </div>
              )}
            </div>
            <button type="button" className="icon-button" onClick={() => navigate('/riesgos')} aria-label={attentionCount > 0 ? `Abrir riesgos y cumplimiento; ${attentionCount} alertas requieren atención` : 'Abrir riesgos y cumplimiento'} title={attentionCount > 0 ? `${attentionCount} alertas requieren atención` : 'Riesgos y cumplimiento'}>
              <AlertTriangle size={19} />
              {attentionCount > 0 && <span className="attention-dot" aria-hidden="true" />}
            </button>
            <button type="button" className="icon-button" onClick={() => navigate('/agenda')} aria-label="Abrir agenda y notificaciones" title="Agenda y notificaciones">
              <Bell size={19} />
            </button>
            <span className="topbar-avatar" aria-label={`${user?.nombre || 'Usuario'}, ${roleLabels[userRole]}`}>{userInitial}</span>
          </div>
        </header>

        <main id="main-content" className="app-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
