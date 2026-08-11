import React from 'react';

export interface TimelineEvent {
  id: string | number;
  date: string;
  title: string;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
  badge?: React.ReactNode;
}

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return <div className="text-muted" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>No hay eventos registrados.</div>;
  }

  return (
    <div style={{ padding: 'var(--space-4) 0' }}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        
        return (
          <div key={event.id} style={{ display: 'flex', gap: 'var(--space-4)', minHeight: '80px' }}>
            {/* Timeline Line & Icon */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px' }}>
              <div style={{ 
                width: '32px', height: '32px', 
                borderRadius: '50%', 
                background: `color-mix(in srgb, ${event.iconColor || 'var(--color-primary)'} 15%, transparent)`,
                color: event.iconColor || 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                zIndex: 2
              }}>
                {event.icon}
              </div>
              {!isLast && (
                <div style={{ 
                  width: '2px', 
                  flex: 1, 
                  background: 'var(--border-color)',
                  marginTop: '4px',
                  marginBottom: '4px'
                }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 'var(--space-6)', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{event.title}</h4>
                  <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px', marginBottom: 'var(--space-2)' }}>
                    {event.date}
                  </div>
                </div>
                {event.badge && <div>{event.badge}</div>}
              </div>
              
              {event.description && (
                <div style={{ 
                  background: 'var(--bg-tertiary)', 
                  padding: 'var(--space-3)', 
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)'
                }}>
                  {event.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
