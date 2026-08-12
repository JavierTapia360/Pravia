import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'table' | 'cards';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  label?: string;
}

export function ViewModeToggle({ value, onChange, label = 'Vista del catálogo' }: ViewModeToggleProps) {
  return (
    <div className="segmented-control shrink-0" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={value === 'table'}
        className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 ${
          value === 'table' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'
        }`}
      >
        <List size={16} aria-hidden="true" />
        Tabla
      </button>
      <button
        type="button"
        onClick={() => onChange('cards')}
        aria-pressed={value === 'cards'}
        className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 ${
          value === 'cards' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'
        }`}
      >
        <LayoutGrid size={16} aria-hidden="true" />
        Tarjetas
      </button>
    </div>
  );
}
