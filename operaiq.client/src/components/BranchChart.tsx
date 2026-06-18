import { useState } from 'react';
import type { AiProjectTemplateDto } from '../api/projects';

interface BranchChartProps {
  projectName: string;
  budget?: number;
  durationDays?: number;
  template?: AiProjectTemplateDto | null;
  phases?: { name: string; durationDays?: number; tasks: string[] }[];
  compact?: boolean;
}

function formatBudget(val: number) {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
  if (val >= 1_000_000) return `${Math.round(val / 1_000_000)} triệu`;
  return val.toLocaleString('vi-VN');
}

export function BranchChart({ projectName, budget, durationDays, template, phases, compact = false }: BranchChartProps) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  const phaseList = phases ?? template?.phases ?? [];
  const budgetVal = budget ?? template?.estimatedBudget;
  const durationVal = durationDays ?? template?.estimatedDurationDays;

  // Colors for phases
  const phaseColors = ['#5ec47a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (phaseList.length === 0) {
    return (
      <div className="text-center py-4 text-secondary" style={{ fontSize: '13px' }}>
        <i className="bi bi-diagram-3 me-2" />
        Chưa có cấu trúc dự án
      </div>
    );
  }

  return (
    <div className="branch-chart" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Root Node */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a2a1e 0%, #2d4a35 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: compact ? '10px 18px' : '14px 24px',
          fontWeight: 700,
          fontSize: compact ? '13px' : '15px',
          textAlign: 'center',
          maxWidth: '320px',
          boxShadow: '0 4px 16px rgba(94,196,122,0.25)',
          border: '2px solid #5ec47a',
          position: 'relative',
          zIndex: 2
        }}>
          <i className="bi bi-folder-fill me-2" style={{ color: '#5ec47a' }} />
          {projectName}
          {(budgetVal || durationVal) && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px', fontSize: '11px', opacity: 0.85 }}>
              {budgetVal && (
                <span style={{ background: 'rgba(94,196,122,0.2)', padding: '2px 8px', borderRadius: '8px' }}>
                  <i className="bi bi-cash-coin me-1" />{formatBudget(budgetVal)} VND
                </span>
              )}
              {durationVal && (
                <span style={{ background: 'rgba(94,196,122,0.2)', padding: '2px 8px', borderRadius: '8px' }}>
                  <i className="bi bi-calendar-range me-1" />{durationVal} ngày
                </span>
              )}
            </div>
          )}
        </div>

        {/* Vertical connector from root */}
        <div style={{ width: '2px', height: '20px', background: 'linear-gradient(to bottom, #5ec47a, #d1fae5)', flexShrink: 0 }} />

        {/* Horizontal bar connecting phases */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: compact ? '12px' : '20px' }}>
          {/* Horizontal line */}
          {phaseList.length > 1 && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              height: '2px',
              width: `calc(100% - ${compact ? 48 : 80}px)`,
              background: 'linear-gradient(to right, #d1fae5, #5ec47a, #d1fae5)',
            }} />
          )}

          {phaseList.map((phase, pIdx) => {
            const color = phaseColors[pIdx % phaseColors.length];
            const isExpanded = expandedPhase === pIdx;
            const tasksToShow = compact ? phase.tasks.slice(0, 3) : phase.tasks;

            return (
              <div key={pIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: compact ? '120px' : '160px', maxWidth: compact ? '150px' : '200px' }}>
                {/* Vertical connector to phase */}
                <div style={{ width: '2px', height: '20px', background: color, opacity: 0.6 }} />

                {/* Phase node */}
                <div
                  onClick={() => setExpandedPhase(isExpanded ? null : pIdx)}
                  style={{
                    background: `${color}18`,
                    border: `2px solid ${color}`,
                    borderRadius: '10px',
                    padding: compact ? '6px 10px' : '10px 14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    width: '100%',
                    boxShadow: isExpanded ? `0 4px 12px ${color}40` : 'none',
                    transform: isExpanded ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: compact ? '11px' : '12px', color, lineHeight: 1.3, marginBottom: '4px' }}>
                    <i className="bi bi-diagram-2 me-1" />
                    {phase.name}
                  </div>
                  {phase.durationDays && (
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>
                      <i className="bi bi-clock me-1" />{phase.durationDays} ngày
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                    {phase.tasks.length} việc {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Task nodes */}
                {(isExpanded || !compact) && tasksToShow.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {tasksToShow.map((task, tIdx) => (
                      <div key={tIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <div style={{ width: '2px', height: '10px', background: `${color}60` }} />
                        <div style={{
                          background: 'white',
                          border: `1px solid ${color}50`,
                          borderRadius: '8px',
                          padding: compact ? '4px 8px' : '6px 10px',
                          fontSize: compact ? '10px' : '11px',
                          color: '#374151',
                          textAlign: 'center',
                          width: '100%',
                          lineHeight: 1.3,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word'
                        }}>
                          <i className="bi bi-check2-square me-1" style={{ color, fontSize: '10px' }} />
                          {task}
                        </div>
                      </div>
                    ))}
                    {compact && phase.tasks.length > 3 && !isExpanded && (
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                        +{phase.tasks.length - 3} việc khác
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
