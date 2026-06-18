import { useState } from 'react';

// Mock data for Documents since API doesn't exist yet
const MOCK_FOLDERS = [
  { id: 'f1', name: 'Tài liệu Công ty', files: 12, size: '24 MB', color: '#3b82f6' },
  { id: 'f2', name: 'Dự án Alpha', files: 8, size: '156 MB', color: '#10b981' },
  { id: 'f3', name: 'Thiết kế UI/UX', files: 45, size: '1.2 GB', color: '#8b5cf6' },
  { id: 'f4', name: 'Báo cáo Tài chính', files: 4, size: '2 MB', color: '#f59e0b' },
];

const MOCK_FILES = [
  { id: 'file1', name: 'Báo cáo Q3-2025.pdf', type: 'pdf', size: '2.4 MB', date: '20/10/2025' },
  { id: 'file2', name: 'Logo_OperaIQ_Final.png', type: 'image', size: '4.1 MB', date: '18/10/2025' },
  { id: 'file3', name: 'Kế hoạch Marketing.docx', type: 'word', size: '1.2 MB', date: '15/10/2025' },
  { id: 'file4', name: 'Dự toán thu chi 2026.xlsx', type: 'excel', size: '850 KB', date: '10/10/2025' },
  { id: 'file5', name: 'Hợp đồng mẫu.pdf', type: 'pdf', size: '1.8 MB', date: '05/10/2025' },
  { id: 'file6', name: 'Wireframes_V2.fig', type: 'design', size: '12 MB', date: '01/10/2025' },
];

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf': return { icon: 'bi-file-earmark-pdf-fill', color: '#ef4444' };
    case 'word': return { icon: 'bi-file-earmark-word-fill', color: '#3b82f6' };
    case 'excel': return { icon: 'bi-file-earmark-excel-fill', color: '#10b981' };
    case 'image': return { icon: 'bi-file-earmark-image-fill', color: '#8b5cf6' };
    default: return { icon: 'bi-file-earmark-fill', color: '#6b7280' };
  }
};

export function Documents() {
  const [activeTab, setActiveTab] = useState<'recent' | 'folders'>('recent');

  return (
    <div className="container-fluid py-2 d-flex flex-column" style={{ height: '100%', gap: '24px' }}>
      {/* ── Header ── */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <h2 className="fw-bold m-0" style={{ fontSize: '24px' }}>Tài liệu</h2>
          <p className="text-secondary m-0 mt-1" style={{ fontSize: '14px' }}>Quản lý tệp tin, chia sẻ và lưu trữ tập trung</p>
        </div>
        <div className="d-flex gap-3 align-items-center">
          <div className="position-relative">
            <i className="bi bi-search position-absolute text-secondary" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-control rounded-pill border-0 shadow-sm"
              placeholder="Tìm kiếm tài liệu..."
              style={{ paddingLeft: '36px', width: '280px', fontSize: '14px' }}
            />
          </div>
          <button className="btn rounded-pill fw-semibold text-white d-flex align-items-center gap-2 shadow-sm" style={{ background: 'var(--accent-green)', padding: '8px 20px', fontSize: '14px' }}>
            <i className="bi bi-cloud-arrow-up-fill" /> Tải lên
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="d-flex gap-4 border-bottom">
        <button 
          className={`btn p-0 pb-2 border-0 fw-semibold ${activeTab === 'recent' ? 'text-primary' : 'text-secondary'}`}
          style={{ 
            fontSize: '15px', 
            borderBottom: activeTab === 'recent' ? '2px solid var(--bs-primary)' : '2px solid transparent',
            borderRadius: 0,
            background: 'transparent'
          }}
          onClick={() => setActiveTab('recent')}
        >
          Mở gần đây
        </button>
        <button 
          className={`btn p-0 pb-2 border-0 fw-semibold ${activeTab === 'folders' ? 'text-primary' : 'text-secondary'}`}
          style={{ 
            fontSize: '15px', 
            borderBottom: activeTab === 'folders' ? '2px solid var(--bs-primary)' : '2px solid transparent',
            borderRadius: 0,
            background: 'transparent'
          }}
          onClick={() => setActiveTab('folders')}
        >
          Thư mục của tôi
        </button>
      </div>

      <div className="flex-grow-1" style={{ overflowY: 'auto', paddingBottom: '32px' }}>
        {/* ── Folders Section ── */}
        <div className="mb-5">
          <h3 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ fontSize: '16px', color: '#374151' }}>
            <i className="bi bi-folder2-open" /> Thư mục nổi bật
          </h3>
          <div className="row g-3">
            {MOCK_FOLDERS.map(folder => (
              <div key={folder.id} className="col-12 col-sm-6 col-xl-3">
                <div 
                  className="bg-white rounded-4 p-3 shadow-sm d-flex align-items-center gap-3"
                  style={{ border: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-3" 
                    style={{ width: '48px', height: '48px', background: `${folder.color}15`, color: folder.color }}
                  >
                    <i className="bi bi-folder-fill" style={{ fontSize: '24px' }} />
                  </div>
                  <div>
                    <div className="fw-semibold" style={{ fontSize: '14px', color: '#111827' }}>{folder.name}</div>
                    <div className="text-secondary" style={{ fontSize: '12px' }}>{folder.files} tệp · {folder.size}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Files Section ── */}
        <div>
          <h3 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ fontSize: '16px', color: '#374151' }}>
            <i className="bi bi-file-earmark-text" /> {activeTab === 'recent' ? 'Tệp mở gần đây' : 'Tất cả tệp'}
          </h3>
          
          <div className="bg-white rounded-4 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            {/* Table Header */}
            <div className="d-flex align-items-center p-3 border-bottom text-secondary fw-semibold" style={{ fontSize: '13px', background: '#fafafa' }}>
              <div style={{ flex: '0 0 45%' }}>Tên tài liệu</div>
              <div style={{ flex: '0 0 20%' }}>Ngày sửa</div>
              <div style={{ flex: '0 0 15%' }}>Kích thước</div>
              <div style={{ flex: '0 0 20%', textAlign: 'right' }}>Thao tác</div>
            </div>
            
            {/* Table Body */}
            <div>
              {MOCK_FILES.map((file, index) => {
                const meta = getFileIcon(file.type);
                return (
                  <div 
                    key={file.id} 
                    className="d-flex align-items-center p-3 border-bottom"
                    style={{ fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s', borderBottom: index === MOCK_FILES.length - 1 ? 'none' : '' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <div className="d-flex align-items-center gap-3" style={{ flex: '0 0 45%' }}>
                      <i className={`bi ${meta.icon}`} style={{ fontSize: '20px', color: meta.color }} />
                      <span className="fw-medium text-truncate" style={{ color: '#1f2937' }}>{file.name}</span>
                    </div>
                    <div className="text-secondary" style={{ flex: '0 0 20%' }}>{file.date}</div>
                    <div className="text-secondary" style={{ flex: '0 0 15%' }}>{file.size}</div>
                    <div className="d-flex justify-content-end gap-2" style={{ flex: '0 0 20%' }}>
                      <button className="btn btn-sm btn-light rounded-circle" style={{ width: '32px', height: '32px', padding: 0 }} title="Tải xuống">
                        <i className="bi bi-download" />
                      </button>
                      <button className="btn btn-sm btn-light rounded-circle" style={{ width: '32px', height: '32px', padding: 0 }} title="Chia sẻ">
                        <i className="bi bi-share" />
                      </button>
                      <button className="btn btn-sm btn-light rounded-circle" style={{ width: '32px', height: '32px', padding: 0 }} title="Thêm">
                        <i className="bi bi-three-dots-vertical" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
