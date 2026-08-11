import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
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
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const RecoverAccess = lazy(() => import('./pages/RecoverAccess'));
import { useAuthStore } from './stores/authStore';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { status, user } = useAuthStore();
  if (status === 'checking') return <div style={{ padding: 'var(--space-6)' }}><LoadingState label="Verificando sesión" rows={3} /></div>;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  if (user?.requires_password_change) return <Navigate to="/cambiar-contrasena" replace />;
  return children;
};

const AuthenticatedRoute = ({ children }: { children: JSX.Element }) => {
  const status = useAuthStore((state) => state.status);
  if (status === 'checking') return <div style={{ padding: 'var(--space-6)' }}><LoadingState label="Verificando sesión" rows={3} /></div>;
  return status === 'authenticated' ? children : <Navigate to="/login" replace />;
};

const PermissionRoute = ({ permission, children }: { permission: string; children: JSX.Element }) => {
  const allowed = useAuthStore((state) => state.hasPermission(permission));
  return allowed ? children : <Navigate to="/mi-dia" replace />;
};

import { ToastContainer } from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PwaStatus } from './components/pwa/PwaStatus';

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  useEffect(() => { void initialize(); }, [initialize]);
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 'var(--space-6)' }}><LoadingState label="Cargando módulo" rows={4} /></div>}>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-acceso" element={<RecoverAccess />} />
          <Route path="/cambiar-contrasena" element={<AuthenticatedRoute><ChangePassword /></AuthenticatedRoute>} />
          
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
            <Route path="prospectos" element={<PermissionRoute permission="prospectos.read"><Prospectos /></PermissionRoute>} />
            <Route path="expedientes" element={<PermissionRoute permission="expedientes.read"><Expedientes /></PermissionRoute>} />
            <Route path="expedientes/:id" element={<PermissionRoute permission="expedientes.read"><ExpedienteDetail /></PermissionRoute>} />
            <Route path="expedientes/:expedienteId/proyecto/:versionId" element={<PermissionRoute permission="expedientes.read"><ProyectoDocumentViewerPage /></PermissionRoute>} />
            <Route path="cotizaciones" element={<PermissionRoute permission="cotizaciones.read"><Cotizaciones /></PermissionRoute>} />
            <Route path="notarias" element={<PermissionRoute permission="notarias.read"><NotariasList /></PermissionRoute>} />
            {/* Feature Routes */}
            <Route path="comparecientes" element={<PermissionRoute permission="comparecientes.read"><Comparecientes /></PermissionRoute>} />
            <Route path="comparecientes/nuevo" element={<PermissionRoute permission="comparecientes.write"><ComparecienteNuevo /></PermissionRoute>} />
            <Route path="comparecientes/:id" element={<PermissionRoute permission="comparecientes.read"><ComparecienteDetail /></PermissionRoute>} />
            <Route path="finanzas" element={<PermissionRoute permission="finanzas.read"><Finanzas /></PermissionRoute>} />
            <Route path="agenda" element={<PermissionRoute permission="agenda.read"><Agenda /></PermissionRoute>} />
            <Route path="reportes" element={<PermissionRoute permission="reportes.read"><Reportes /></PermissionRoute>} />
            <Route path="inteligencia" element={<PermissionRoute permission="ia.read"><Inteligencia /></PermissionRoute>} />
            <Route path="riesgos" element={<PermissionRoute permission="cumplimiento.read"><Riesgos /></PermissionRoute>} />
            <Route path="configuracion/usuarios" element={<PermissionRoute permission="usuarios.manage"><Usuarios /></PermissionRoute>} />
          </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ToastContainer />
      <PwaStatus />
    </ErrorBoundary>
  );
}

export default App;
