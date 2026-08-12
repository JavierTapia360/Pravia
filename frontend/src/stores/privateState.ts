import { useExpedienteStore } from './expedienteStore';
import { useNotariasStore } from './notariasStore';
import { useProspectoStore } from './prospectoStore';

/** Elimina datos privados en memoria cuando termina o se invalida la sesión. */
export function clearPrivateState() {
  useExpedienteStore.setState({
    expedientes: [],
    selectedExpediente: null,
    loading: false,
    error: null,
    filters: { estatus: '', search: '' },
  });
  useNotariasStore.setState({ notarias: [], loading: false });
  useProspectoStore.setState({ prospectos: [], selectedProspecto: null, isLoading: false });
}
