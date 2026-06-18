import { useState, type FormEvent } from 'react';
import { projectsApi, type AiProjectTemplateDto } from '../api/projects';
import { getApiError } from '../api/client';
import { BranchChart } from './BranchChart';

interface AiProjectWizardProps {
  onClose: () => void;
  onSuccess: (projectId: string) => void;
}

type WizardStep = 'input' | 'generating' | 'review' | 'submitting' | 'done';

export function AiProjectWizard({ onClose, onSuccess }: AiProjectWizardProps) {
  const [step, setStep] = useState<WizardStep>('input');
  const [problemInput, setProblemInput] = useState('');
  const [template, setTemplate] = useState<AiProjectTemplateDto | null>(null);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'chart'>('list');

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!problemInput.trim()) return;
    setError('');
    setStep('generating');
    try {
      const result = await projectsApi.aiGenerate(problemInput);
      setTemplate(result);
      setProjectName(result.name);
      setStep('review');
    } catch (err) {
      setError(getApiError(err, 'Không thể tạo kế hoạch AI. Vui lòng thử lại.'));
      setStep('input');
    }
  };

  const handleSubmitToDirector = async () => {
    if (!template) return;
    setStep('submitting');
    try {
      const projectDto = {
        name: projectName || template.name,
        description: template.description,
        budget: template.estimatedBudget,
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + template.estimatedDurationDays * 86400000).toISOString(),
        createdById: '00000000-0000-0000-0000-000000000000',
      };
      const result = await projectsApi.createFromAi(projectDto, template);
      // Auto submit to director
      await projectsApi.submitToDirector(result.projectId);
      setStep('done');
      setTimeout(() => onSuccess(result.projectId), 1500);
    } catch (err) {
      setError(getApiError(err, 'Không thể tạo dự án. Vui lòng thử lại.'));
      setStep('review');
    }
  };

  const formatBudget = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ VND`;
    if (val >= 1_000_000) return `${Math.round(val / 1_000_000)} triệu VND`;
    return `${val.toLocaleString('vi-VN')} VND`;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white', borderRadius: '20px',
        width: '100%', maxWidth: step === 'review' ? '860px' : '560px',
        maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        animation: 'slideUp 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a2a1e 0%, #2d4a35 100%)',
          color: 'white', padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '20px 20px 0 0', flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <i className="bi bi-stars" style={{ fontSize: '22px', color: '#5ec47a' }} />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Tạo Dự án với AI</h2>
            </div>
            <div style={{ fontSize: '13px', opacity: 0.75 }}>
              {step === 'input' && 'Bước 1/3 – Mô tả vấn đề dự án'}
              {step === 'generating' && 'Đang xử lý…'}
              {step === 'review' && 'Bước 2/3 – Xem xét kế hoạch AI'}
              {step === 'submitting' && 'Đang tạo và gửi duyệt…'}
              {step === 'done' && 'Hoàn tất!'}
            </div>
          </div>
          {step !== 'generating' && step !== 'submitting' && step !== 'done' && (
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
              width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', transition: 'background 0.2s'
            }}>×</button>
          )}
        </div>

        {/* Steps indicator */}
        {(step === 'input' || step === 'review') && (
          <div style={{ display: 'flex', padding: '16px 24px 0', gap: '8px', flexShrink: 0 }}>
            {[
              { key: 'input', label: 'Nhập vấn đề', icon: 'bi-pencil-square' },
              { key: 'review', label: 'Xem xét AI', icon: 'bi-eye' },
              { key: 'done', label: 'Gửi duyệt', icon: 'bi-send' }
            ].map((s, i) => {
              const isActive = s.key === step || (step === 'review' && s.key === 'input');
              const isDone = step === 'review' && s.key === 'input';
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: isDone ? '#5ec47a' : isActive ? '#1a2a1e' : '#e5e7eb',
                    color: isDone || isActive ? 'white' : '#9ca3af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, flexShrink: 0
                  }}>
                    {isDone ? <i className="bi bi-check-lg" /> : i + 1}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: isActive ? 600 : 400, color: isActive ? '#111827' : '#6b7280' }}>
                    {s.label}
                  </span>
                  {i < 2 && <div style={{ flex: 1, height: '2px', background: i === 0 && step === 'review' ? '#5ec47a' : '#e5e7eb', borderRadius: '1px' }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
              <i className="bi bi-exclamation-triangle me-2" />{error}
            </div>
          )}

          {/* STEP 1: Input */}
          {step === 'input' && (
            <form onSubmit={handleGenerate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: '#111827' }}>
                  <i className="bi bi-lightbulb me-2" style={{ color: '#5ec47a' }} />
                  Mô tả vấn đề / yêu cầu dự án của bạn
                </label>
                <textarea
                  value={problemInput}
                  onChange={e => setProblemInput(e.target.value)}
                  placeholder="Ví dụ: Chúng tôi cần nâng cấp dây chuyền sản xuất để tăng công suất 30%, giảm lỗi sản phẩm và tối ưu chi phí nhân công..."
                  required
                  style={{
                    width: '100%', minHeight: '160px', borderRadius: '12px',
                    border: '2px solid #e5e7eb', padding: '14px',
                    fontSize: '14px', lineHeight: 1.6, resize: 'vertical',
                    fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = '#5ec47a'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                  Mô tả càng chi tiết, AI sẽ tạo kế hoạch càng chính xác
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px',
                marginBottom: '20px', fontSize: '13px', color: '#166534'
              }}>
                <strong><i className="bi bi-info-circle me-2" />AI sẽ tạo cho bạn:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: 1.8 }}>
                  <li>Tên và mô tả dự án</li>
                  <li>Ngân sách ước tính (VND)</li>
                  <li>Thời gian thực hiện</li>
                  <li>Kế hoạch chi tiết theo từng giai đoạn</li>
                </ul>
              </div>

              <button type="submit" style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #5ec47a, #3da860)',
                color: 'white', border: 'none', fontWeight: 700,
                fontSize: '15px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <i className="bi bi-stars" /> Tạo kế hoạch với AI
              </button>
            </form>
          )}

          {/* STEP: Generating */}
          {step === 'generating' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  border: '4px solid #d1fae5', borderTopColor: '#5ec47a',
                  animation: 'spin 1s linear infinite', margin: '0 auto'
                }} />
                <i className="bi bi-stars" style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)', fontSize: '28px', color: '#5ec47a'
                }} />
              </div>
              <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: '8px' }}>AI đang phân tích…</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Đang tạo kế hoạch dự án tối ưu từ mô tả của bạn</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
                {['Phân tích yêu cầu', 'Lên kế hoạch giai đoạn', 'Ước tính ngân sách'].map((t, i) => (
                  <div key={i} style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
                    borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 500
                  }}>{t}</div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Review */}
          {step === 'review' && template && (
            <div>
              {/* Project Name editable */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '6px', display: 'block' }}>
                  Tên dự án (có thể chỉnh sửa)
                </label>
                <input
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  style={{
                    width: '100%', borderRadius: '10px', border: '2px solid #e5e7eb',
                    padding: '10px 14px', fontSize: '14px', fontWeight: 600,
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#5ec47a'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>
                    <i className="bi bi-cash-coin me-1" />Ngân sách
                  </div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}>
                    {formatBudget(template.estimatedBudget)}
                  </div>
                </div>
                <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#1d4ed8', marginBottom: '4px' }}>
                    <i className="bi bi-calendar-range me-1" />Thời gian
                  </div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}>
                    {template.estimatedDurationDays} ngày
                  </div>
                </div>
                <div style={{ background: '#fef9c3', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>
                    <i className="bi bi-diagram-3 me-1" />Giai đoạn
                  </div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '14px' }}>
                    {template.phases.length} giai đoạn
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{
                background: '#f9fafb', borderRadius: '10px', padding: '14px',
                fontSize: '13px', color: '#374151', lineHeight: 1.6, marginBottom: '20px',
                border: '1px solid #e5e7eb'
              }}>
                <i className="bi bi-card-text me-2" style={{ color: '#5ec47a' }} />
                {template.description}
              </div>

              {/* Tabs: List vs Chart */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['list', 'chart'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    background: activeTab === tab ? '#1a2a1e' : '#f3f4f6',
                    color: activeTab === tab ? 'white' : '#374151',
                    transition: 'all 0.2s'
                  }}>
                    <i className={`bi ${tab === 'list' ? 'bi-list-ul' : 'bi-diagram-3'} me-1`} />
                    {tab === 'list' ? 'Danh sách' : 'Biểu đồ nhánh'}
                  </button>
                ))}
              </div>

              {/* List view */}
              {activeTab === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {template.phases.map((phase, i) => (
                    <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{
                        background: '#f9fafb', padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '8px',
                          background: ['#dcfce7', '#dbeafe', '#fef9c3', '#fce7f3'][i % 4],
                          color: ['#166534', '#1d4ed8', '#92400e', '#9d174d'][i % 4],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '13px', flexShrink: 0
                        }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{phase.name}</div>
                          {phase.durationDays && (
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                              <i className="bi bi-clock me-1" />{phase.durationDays} ngày · {phase.tasks.length} công việc
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {phase.tasks.map((task, ti) => (
                          <div key={ti} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#374151' }}>
                            <i className="bi bi-check2-square mt-1" style={{ color: '#5ec47a', flexShrink: 0, fontSize: '12px' }} />
                            <span style={{ lineHeight: 1.5 }}>{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Chart view */}
              {activeTab === 'chart' && (
                <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                  <BranchChart
                    projectName={projectName || template.name}
                    template={template}
                    compact={true}
                  />
                </div>
              )}

              {/* Warning */}
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
                padding: '12px 16px', marginTop: '20px', fontSize: '13px', color: '#92400e'
              }}>
                <i className="bi bi-info-circle me-2" />
                Sau khi gửi, Giám đốc sẽ nhận thông báo để xem xét và duyệt dự án. Bạn sẽ được thông báo kết quả.
              </div>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: '#dcfce7', margin: '0 auto 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '36px', color: '#16a34a',
                animation: 'bounceIn 0.5s ease'
              }}>
                <i className="bi bi-check-circle-fill" />
              </div>
              <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Đã gửi thành công!</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Dự án đã được gửi tới Giám đốc để xem xét. Bạn sẽ nhận thông báo sớm.
              </p>
            </div>
          )}

          {/* STEP: Submitting */}
          {step === 'submitting' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                border: '4px solid #d1fae5', borderTopColor: '#5ec47a',
                animation: 'spin 1s linear infinite', margin: '0 auto 16px'
              }} />
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Đang tạo dự án và gửi cho Giám đốc…</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'input' || step === 'review') && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #f3f4f6',
            display: 'flex', gap: '12px', justifyContent: 'flex-end', flexShrink: 0
          }}>
            {step === 'review' && (
              <button onClick={() => { setStep('input'); setTemplate(null); }} style={{
                padding: '10px 20px', borderRadius: '10px', border: '1px solid #e5e7eb',
                background: 'white', color: '#374151', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer'
              }}>
                <i className="bi bi-arrow-left me-2" />Tạo lại
              </button>
            )}
            {step === 'review' && (
              <button onClick={handleSubmitToDirector} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #5ec47a, #3da860)',
                color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <i className="bi bi-send" />Gửi Giám đốc duyệt
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { transform: scale(0); } 70% { transform: scale(1.1); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}
