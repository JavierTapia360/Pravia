import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from './components/layout/MainLayout';
import { LoadingState } from './components/ui/AsyncState';

const MiDia = lazy(() => import('./pages/MiDia'));
const Prospectos = lazy(() => import('./pages/Prospectos'));
const Expedientes = lazy(() => import('./pages/Expedientes'));
const ExpedienteDetail = lazy(() => import('./pages/ExpedienteDetail'));
const Cotizaciones = lazy(() => import('./pages/Cotizaciones'));
const NotariasList = lazy(() => import('./pages/NotariasList'));
const ProyectoDocumentViewerPage = lazy(() =>
  import('./pages/ProyectoDocumentViewerPage').then(module => ({ default: module.ProyectoDocumentViewerPage }))
);
const Comparecientes = lazy(() => import('./pages/Comparecientes'));
const ComparecienteNuevo = lazy(() => import('./pages/ComparecienteNuevo'));
const ComparecienteDetail = lazy(() => import('./pages/ComparecienteDetail'));
const Finanzas = lazy(() => import('./pages/Finanzas'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Inteligencia = lazy(() => import('./pages/Inteligencia'));
const Riesgos = lazy(() => import('./pages/Riesgos'));
const Login = lazy(() => import('./pages/Login'));

// Zustand store for quick auth check (will build robustly later)
import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  login: (name: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: true, // Auto-authenticated in dev mode for direct module access
  user: { nombre: 'Administrador PRAVIA', rol: 'DIRECCION' },
  login: (name) => set({ isAuthenticated: true, user: { nombre: name, rol: 'ABOGADO' } }),
  logout: () => set({ isAuthenticated: false, user: null }),
}));

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

import { ToastContainer } from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 'var(--space-6)' }}><LoadingState label="Cargando módulo" rows={4} /></div>}>
          <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/mi-dia" replace />} />
            <Route path="mi-dia" element={<MiDia />} />
            <Route path="prospectos" element={<Prospectos />} />
            <Route path="expedientes" element={<Expedientes />} />
            <Route path="expedientes/:id" element={<ExpedienteDetail />} />
            <Route path="expedientes/:expedienteId/proyecto/:versionId" element={<ProyectoDocumentViewerPage />} />
            <Route path="cotizaciones" element={<Cotizaciones />} />
            <Route path="notarias" element={<NotariasList />} />
            {/* Feature Routes */}
            <Route path="comparecientes" element={<Comparecientes />} />
            <Route path="comparecientes/nuevo" element={<ComparecienteNuevo />} />
            <Route path="comparecientes/:id" element={<ComparecienteDetail />} />
            <Route path="finanzas" element={<Finanzas />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="inteligencia" element={<Inteligencia />} />
            <Route path="riesgos" element={<Riesgos />} />
          </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ToastContainer />
    </ErrorBoundary>
  );
}

export default App;
