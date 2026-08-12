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
    return <div className="timeline-empty">No hay eventos registrados.</div>;
  }

  return (
    <div className="timeline">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        
        return (
          <div key={event.id} className="timeline-item">
            {/* Timeline Line & Icon */}
            <div className="timeline-rail">
              <div className="timeline-icon" style={{
                background: `color-mix(in srgb, ${event.iconColor || 'var(--color-primary)'} 15%, transparent)`,
                color: event.iconColor || 'var(--color-primary)',
              }}>
                {event.icon}
              </div>
              {!isLast && (
                <div className="timeline-line" />
              )}
            </div>

            {/* Content */}
            <div className={`timeline-content ${isLast ? 'timeline-content--last' : ''}`}>
              <div className="timeline-heading">
                <div>
                  <h4>{event.title}</h4>
                  <div className="timeline-date">
                    {event.date}
                  </div>
                </div>
                {event.badge && <div>{event.badge}</div>}
              </div>
              
              {event.description && (
                <div className="timeline-description">
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
