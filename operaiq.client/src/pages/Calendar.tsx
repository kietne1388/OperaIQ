import { useEffect, useState } from 'react';
import { tasksApi } from '../api/tasks';
import { type TaskDto } from '../types';

export function Calendar() {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    // In a real app we'd fetch by date range, but here we fetch 'my' tasks
    tasksApi.my()
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Calendar logic
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 
  
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const today = new Date();

  // Helper to format Date to YYYY-MM-DD
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'Critical': return { bg: '#fee2e2', text: '#dc2626' };
      case 'High': return { bg: '#ffedd5', text: '#ea580c' };
      case 'Medium': return { bg: '#fef3c7', text: '#d97706' };
      default: return { bg: '#e0e7ff', text: '#4f46e5' };
    }
  };

  return (
    <div className="container-fluid py-2 d-flex flex-column" style={{ height: '100%', gap: '16px' }}>
      {/* ── Header ── */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-2">
        <div>
          <h2 className="fw-bold m-0" style={{ fontSize: '24px' }}>Lịch trình</h2>
          <p className="text-secondary m-0 mt-1" style={{ fontSize: '14px' }}>Theo dõi deadline và các sự kiện quan trọng</p>
        </div>
        
        <div className="d-flex gap-3 align-items-center bg-white p-2 rounded-pill shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
          <button className="btn btn-sm btn-light rounded-circle" onClick={prevMonth} style={{ width: '32px', height: '32px', padding: 0 }}>
            <i className="bi bi-chevron-left" />
          </button>
          <span className="fw-bold" style={{ minWidth: '130px', textAlign: 'center', fontSize: '15px' }}>
            Tháng {currentMonth.getMonth() + 1}, {currentMonth.getFullYear()}
          </span>
          <button className="btn btn-sm btn-light rounded-circle" onClick={nextMonth} style={{ width: '32px', height: '32px', padding: 0 }}>
            <i className="bi bi-chevron-right" />
          </button>
          <button 
            className="btn btn-sm fw-semibold ms-2 rounded-pill" 
            onClick={() => setCurrentMonth(new Date())}
            style={{ background: '#f3f4f6', color: '#374151', padding: '4px 16px', fontSize: '13px' }}
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* ── Calendar Grid ── */}
      <div className="bg-white rounded-4 shadow-sm d-flex flex-column flex-grow-1" style={{ border: '1px solid rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {/* Days Header */}
        <div className="d-flex border-bottom" style={{ background: '#fafafa' }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, i) => (
            <div key={day} className="flex-grow-1 py-3 text-center fw-semibold text-secondary" style={{ width: '14.28%', fontSize: '13px', borderRight: i < 6 ? '1px solid #f0f0f0' : 'none' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        {loading ? (
          <div className="d-flex flex-grow-1 align-items-center justify-content-center">
            <div className="spinner-border text-primary" />
          </div>
        ) : (
          <div className="d-flex flex-wrap flex-grow-1" style={{ alignContent: 'flex-start' }}>
            {/* Empty offset days */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 border-end border-bottom" style={{ width: '14.28%', minHeight: '120px', background: '#fafafa', opacity: 0.5 }} />
            ))}
            
            {/* Actual days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatYMD(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
              
              // Find tasks for this day (checking if due date starts with YYYY-MM-DD)
              const dayTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(dateStr));
              
              const isToday = day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();

              return (
                <div key={day} className="p-2 border-end border-bottom d-flex flex-column" style={{ width: '14.28%', minHeight: '120px' }}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span 
                      className={`d-flex align-items-center justify-content-center fw-semibold rounded-circle ${isToday ? 'bg-primary text-white shadow-sm' : ''}`}
                      style={{ width: '28px', height: '28px', fontSize: '13px', color: isToday ? 'white' : '#4b5563' }}
                    >
                      {day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="badge rounded-pill bg-light text-secondary" style={{ fontSize: '11px' }}>{dayTasks.length} việc</span>
                    )}
                  </div>
                  
                  <div className="d-flex flex-column gap-1 flex-grow-1" style={{ overflowY: 'auto', maxHeight: '100px' }}>
                    {dayTasks.map(task => {
                      const colors = getPriorityColor(task.priority);
                      return (
                        <div 
                          key={task.id} 
                          className="px-2 py-1 rounded-2 text-truncate" 
                          style={{ background: colors.bg, color: colors.text, fontSize: '11px', fontWeight: 500, borderLeft: `3px solid ${colors.text}`, cursor: 'pointer' }}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {/* Fill remaining cells to complete the grid if needed */}
            {Array.from({ length: (42 - (startOffset + daysInMonth)) % 7 }).map((_, i) => (
              <div key={`empty-end-${i}`} className="p-2 border-end border-bottom" style={{ width: '14.28%', minHeight: '120px', background: '#fafafa', opacity: 0.5 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
