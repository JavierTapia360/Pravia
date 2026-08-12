export type AssistantEntityType = 'expediente' | 'compareciente' | 'cotizacion' | 'notaria';

export interface GlobalAssistantContext {
  route: string;
  module: string;
  entity_type?: AssistantEntityType;
  entity_id?: string;
  selected_ids: string[];
}

const MODULES: Array<{ prefix: string; module: string; entityType?: AssistantEntityType }> = [
  { prefix: '/expedientes', module: 'expedientes', entityType: 'expediente' },
  { prefix: '/comparecientes', module: 'comparecientes', entityType: 'compareciente' },
  { prefix: '/cotizaciones', module: 'cotizaciones', entityType: 'cotizacion' },
  { prefix: '/notarias', module: 'notarias', entityType: 'notaria' },
  { prefix: '/agenda', module: 'agenda' }, { prefix: '/finanzas', module: 'finanzas' },
  { prefix: '/riesgos', module: 'cumplimiento' }, { prefix: '/mi-dia', module: 'mi_dia' },
];

export function buildAssistantContext(pathname: string, selectedIds: string[] = []): GlobalAssistantContext {
  const match = MODULES.find((candidate) => pathname === candidate.prefix || pathname.startsWith(`${candidate.prefix}/`));
  const segment = match?.entityType ? pathname.slice(match.prefix.length + 1).split('/')[0] : '';
  const hasConcreteId = Boolean(segment && !['nuevo', 'new'].includes(segment.toLocaleLowerCase('es-MX')));
  return {
    route: pathname,
    module: match?.module || 'pravia_os',
    ...(match?.entityType && hasConcreteId ? { entity_type: match.entityType, entity_id: decodeURIComponent(segment) } : {}),
    selected_ids: selectedIds.slice(0, 25),
  };
}
