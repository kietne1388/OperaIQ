import React, { useState, useRef, useEffect } from 'react';
import { aiChatApi, ChatMessageDto } from '../api/aiChat';
import { api } from '../api/client';

const FloatingChatbox: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessageDto[]>([]);
    const [input, setInput] = useState('');
    const [model, setModel] = useState('gemini-2.5-flash');
    const [chatMode, setChatMode] = useState<'search' | 'report'>('search');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const toggleChat = () => setIsOpen(!isOpen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleDownload = async (url: string, filename: string) => {
        try {
            setIsDownloading(true);
            const response = await api.get(url, { responseType: 'blob' });
            
            let ext = '.csv';
            if (url.includes('docx') || url.includes('word')) ext = '.doc';
            else if (url.includes('excel') || url.includes('xlsx') || url.includes('csv')) ext = '.xls';

            const blob = new Blob([response.data], { type: response.headers['content-type'] as string });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `${filename.replace(/\s+/g, '_')}${ext}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download error:', error);
            alert('Không thể tải tệp báo cáo. Có thể bạn không có quyền truy cập thông tin này.');
        } finally {
            setIsDownloading(false);
        }
    };

    const parseBoldInline = (text: string): React.ReactNode[] => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
            }
            // Inline links inside a line (e.g. plain text portions)
            return part as unknown as React.ReactNode;
        });
    };

    // Render a single file download card for report links
    const renderFileCard = (text: string, url: string, key: string) => {
        const isExcel = url.includes('excel') || url.includes('xlsx');
        return (
            <div
                key={key}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    margin: '8px 0',
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    border: `1px solid ${isExcel ? '#bbf7d0' : '#bfdbfe'}`,
                    borderRadius: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
                    minWidth: '220px',
                    color: '#1e293b'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: isExcel ? '#d1fae5' : '#dbeafe',
                        color: isExcel ? '#059669' : '#2563eb',
                        fontSize: '20px',
                        flexShrink: 0
                    }}>
                        <i className={isExcel ? 'bi bi-file-earmark-excel-fill' : 'bi bi-file-earmark-word-fill'}></i>
                    </div>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {text}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className={isExcel ? 'bi bi-file-earmark-spreadsheet' : 'bi bi-file-earmark-richtext'}></i>
                            {isExcel ? 'Excel (.xlsx)' : 'Word (.docx)'}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => handleDownload(url, text)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '7px 12px',
                        border: 'none',
                        borderRadius: '7px',
                        backgroundColor: isExcel ? '#059669' : '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        outline: 'none'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                    <i className="bi bi-cloud-arrow-down-fill"></i>
                    Tải file báo cáo
                </button>
            </div>
        );
    };

    const renderMessageContent = (content: string, isAi: boolean) => {
        if (!isAi) {
            // User messages: plain text
            return <span>{content}</span>;
        }

        // AI messages: parse markdown line by line, also handle inline [text](url) links
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let listBuffer: React.ReactNode[] = [];
        let orderedBuffer: React.ReactNode[] = [];
        let fileCards: React.ReactNode[] = [];

        const flushBullets = () => {
            if (listBuffer.length > 0) {
                elements.push(
                    <ul key={`ul-${elements.length}`} style={{ paddingLeft: '18px', marginBottom: '6px', marginTop: '4px' }}>
                        {listBuffer}
                    </ul>
                );
                listBuffer = [];
            }
        };
        const flushOrdered = () => {
            if (orderedBuffer.length > 0) {
                elements.push(
                    <ol key={`ol-${elements.length}`} style={{ paddingLeft: '18px', marginBottom: '6px', marginTop: '4px' }}>
                        {orderedBuffer}
                    </ol>
                );
                orderedBuffer = [];
            }
        };
        const flushFileCards = () => {
            if (fileCards.length > 0) {
                elements.push(<div key={`cards-${elements.length}`}>{fileCards}</div>);
                fileCards = [];
            }
        };

        // Extract all markdown links from a text and render inline
        const renderInlineLinks = (text: string, keyPrefix: string): React.ReactNode => {
            const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
            const parts: React.ReactNode[] = [];
            let last = 0;
            let m;
            while ((m = linkRegex.exec(text)) !== null) {
                if (m.index > last) {
                    parts.push(...parseBoldInline(text.substring(last, m.index)));
                }
                const linkText = m[1];
                const linkUrl = m[2];
                if (linkUrl.startsWith('/api/reports/')) {
                    fileCards.push(renderFileCard(linkText, linkUrl, `${keyPrefix}-fc-${m.index}`));
                } else {
                    parts.push(
                        <a key={`${keyPrefix}-a-${m.index}`} href={linkUrl} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#10b981', textDecoration: 'underline', fontWeight: 600 }}>
                            {linkText}
                        </a>
                    );
                }
                last = linkRegex.lastIndex;
            }
            if (last < text.length) {
                parts.push(...parseBoldInline(text.substring(last)));
            }
            return parts.length > 0 ? <>{parts}</> : null;
        };

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            const key = `line-${idx}`;

            // Check if the entire line is a standalone link (file card)
            const standaloneLink = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (standaloneLink) {
                flushBullets(); flushOrdered();
                const linkText = standaloneLink[1];
                const linkUrl = standaloneLink[2];
                if (linkUrl.startsWith('/api/reports/')) {
                    fileCards.push(renderFileCard(linkText, linkUrl, key));
                    return;
                }
            }

            // Heading levels
            if (/^#{3,}\s/.test(trimmed)) {
                flushBullets(); flushOrdered(); flushFileCards();
                elements.push(
                    <div key={key} style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3D5A45', marginTop: '10px', marginBottom: '4px' }}>
                        {parseBoldInline(trimmed.replace(/^#{1,6}\s*/, ''))}
                    </div>
                );
                return;
            }
            if (/^#{1,2}\s/.test(trimmed)) {
                flushBullets(); flushOrdered(); flushFileCards();
                elements.push(
                    <div key={key} style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', marginTop: '10px', marginBottom: '4px' }}>
                        {parseBoldInline(trimmed.replace(/^#{1,2}\s*/, ''))}
                    </div>
                );
                return;
            }

            // Bullet list
            if (/^[-*]\s/.test(trimmed)) {
                flushOrdered(); flushFileCards();
                const lineContent = trimmed.replace(/^[-*]\s/, '');
                listBuffer.push(
                    <li key={key} style={{ marginBottom: '3px', lineHeight: 1.5, fontSize: '0.88rem', color: '#334155' }}>
                        {renderInlineLinks(lineContent, key)}
                    </li>
                );
                return;
            }

            // Numbered list
            const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
            if (orderedMatch) {
                flushBullets(); flushFileCards();
                orderedBuffer.push(
                    <li key={key} style={{ marginBottom: '3px', lineHeight: 1.5, fontSize: '0.88rem', color: '#334155' }}>
                        {renderInlineLinks(orderedMatch[2], key)}
                    </li>
                );
                return;
            }

            // Empty line = paragraph break
            if (trimmed === '') {
                flushBullets(); flushOrdered(); flushFileCards();
                elements.push(<div key={key} style={{ height: '5px' }} />);
                return;
            }

            // Regular line
            flushBullets(); flushOrdered(); flushFileCards();
            elements.push(
                <p key={key} style={{ margin: '2px 0 4px', lineHeight: 1.55, fontSize: '0.88rem', color: '#212529' }}>
                    {renderInlineLinks(trimmed, key)}
                </p>
            );
        });

        flushBullets();
        flushOrdered();
        flushFileCards();

        return elements.length > 0 ? <div style={{ width: '100%' }}>{elements}</div> : <span>{content}</span>;
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessageDto = { role: 'user', content: input };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await aiChatApi.chat({
                modelProvider: 'gemini',
                selectedModel: model,
                chatMode: chatMode,
                messages: updatedMessages
            });

            const aiMsg: ChatMessageDto = { role: 'model', content: response.response };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat API Error:', error);
            setMessages(prev => [...prev, { role: 'model', content: 'Có lỗi xảy ra khi gửi tin nhắn đến AI. Vui lòng kiểm tra kết nối mạng và thử lại.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            {isOpen && (
                <div style={styles.chatWindow}>
                    <div style={styles.header}>
                        <div style={styles.headerTitle}>
                            <i className="bi bi-robot" style={{ marginRight: '8px' }}></i>
                            OperaIQ AI
                        </div>
                        <button onClick={toggleChat} style={styles.closeBtn}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div style={styles.modeTabs}>
                        <button
                            onClick={() => setChatMode('search')}
                            style={{
                                ...styles.modeTab,
                                ...(chatMode === 'search' ? styles.activeModeTab : styles.inactiveModeTab)
                            }}
                        >
                            <i className="bi bi-search"></i>
                            Tìm kiếm
                        </button>
                        <button
                            onClick={() => setChatMode('report')}
                            style={{
                                ...styles.modeTab,
                                ...(chatMode === 'report' ? styles.activeModeTab : styles.inactiveModeTab)
                            }}
                        >
                            <i className="bi bi-file-earmark-bar-graph"></i>
                            Báo cáo
                        </button>
                    </div>

                    <div style={styles.messageArea}>
                        {messages.length === 0 && (
                            <div style={styles.emptyState}>
                                {chatMode === 'search' ? (
                                    <>
                                        <i className="bi bi-search" style={{ fontSize: '28px', color: 'var(--accent-green)', display: 'block', marginBottom: '8px' }}></i>
                                        Xin chào! Bạn đang ở chế độ <strong>Tìm kiếm</strong>. Hãy hỏi tôi về thông tin nhân sự, danh sách công việc, tiến độ hoặc ngân sách của dự án.
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-file-earmark-bar-graph" style={{ fontSize: '28px', color: 'var(--accent-green)', display: 'block', marginBottom: '8px' }}></i>
                                        Xin chào! Bạn đang ở chế độ <strong>Báo cáo</strong>. Tôi hỗ trợ tra cứu các tệp tin báo cáo và tạo liên kết xuất báo cáo nhanh dưới dạng Excel/Word.
                                    </>
                                )}
                            </div>
                        )}
                        {messages.map((msg, idx) => {
                            const isAi = msg.role === 'model' || msg.role === 'assistant';
                            return (
                                <div key={idx} style={{
                                    ...styles.messageBubble,
                                    ...(isAi ? styles.aiBubble : styles.userBubble),
                                    // AI markdown messages look better with slightly more padding
                                    ...(isAi ? { padding: '10px 14px', maxWidth: '92%' } : {})
                                }}>
                                    {renderMessageContent(msg.content, isAi)}
                                </div>
                            );
                        })}
                        {isLoading && (
                            <div style={{ ...styles.messageBubble, ...styles.aiBubble, fontStyle: 'italic' }}>
                                Đang xử lý...
                            </div>
                        )}
                        {isDownloading && (
                            <div style={{ ...styles.messageBubble, ...styles.aiBubble, fontStyle: 'italic' }}>
                                <i className="bi bi-download me-2 animate-pulse"></i>
                                Đang tải file báo cáo về máy...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div style={styles.inputArea}>
                        <input
                            type="text"
                            placeholder={chatMode === 'search' ? "Tìm nhân viên, công việc, ngân sách..." : "Yêu cầu báo cáo, xuất file..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            style={styles.input}
                        />
                        <button onClick={handleSend} style={styles.sendBtn} disabled={isLoading || !input.trim()}>
                            <i className="bi bi-send-fill"></i>
                        </button>
                    </div>

                    <div style={styles.settingsPanel}>
                        <span style={styles.modelLabel}>Mô hình:</span>
                        <select value={model} onChange={(e) => setModel(e.target.value)} style={styles.select}>
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Miễn phí, nhanh)</option>
                            <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B (Miễn phí, nhẹ)</option>
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Miễn phí)</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Miễn phí, thông minh)</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Trả phí, mạnh nhất)</option>
                        </select>
                    </div>
                </div>
            )}
            {!isOpen && (
                <button onClick={toggleChat} style={styles.fab}>
                    <i className="bi bi-chat-dots-fill" style={{ fontSize: '24px' }}></i>
                </button>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    fab: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent-green, #3D5A45)',
        color: 'white',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'transform 0.2s',
    },
    chatWindow: {
        width: '380px',
        height: '550px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
    },
    header: {
        backgroundColor: 'var(--accent-green, #3D5A45)',
        color: '#fff',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 'bold',
        fontSize: '1.1rem',
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '1.2rem',
    },
    modeTabs: {
        display: 'flex',
        backgroundColor: '#f1f5f9',
        padding: '4px',
        borderBottom: '1px solid #e2e8f0',
        gap: '4px',
    },
    modeTab: {
        flex: 1,
        padding: '8px 12px',
        fontSize: '0.85rem',
        fontWeight: '600',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
    },
    activeModeTab: {
        backgroundColor: '#fff',
        color: 'var(--accent-green, #3D5A45)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    inactiveModeTab: {
        backgroundColor: 'transparent',
        color: '#64748b',
    },
    settingsPanel: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e9ecef',
        gap: '8px',
    },
    modelLabel: {
        fontSize: '0.85rem',
        color: '#64748b',
        fontWeight: '500',
    },
    select: {
        flex: 1,
        padding: '6px 10px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '0.85rem',
        outline: 'none',
        backgroundColor: '#fff',
        color: '#334155',
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        transition: 'border-color 0.2s',
    },
    messageArea: {
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: '#fafbfc',
    },
    emptyState: {
        textAlign: 'center',
        color: '#6c757d',
        marginTop: 'auto',
        marginBottom: 'auto',
        fontSize: '0.9rem',
        padding: '0 20px',
        lineHeight: '1.5',
    },
    messageBubble: {
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: '12px',
        lineHeight: 1.4,
        wordWrap: 'break-word',
        fontSize: '0.95rem',
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: 'var(--accent-green, #3D5A45)',
        color: '#fff',
        borderBottomRightRadius: '2px',
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#e9ecef',
        color: '#212529',
        borderBottomLeftRadius: '2px',
    },
    inputArea: {
        display: 'flex',
        padding: '12px',
        borderTop: '1px solid #e9ecef',
        backgroundColor: '#fff',
        gap: '8px',
    },
    input: {
        flex: 1,
        padding: '10px 16px',
        border: '1px solid #ced4da',
        borderRadius: '20px',
        outline: 'none',
        fontSize: '0.95rem',
    },
    sendBtn: {
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent-green, #3D5A45)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    }
};

export default FloatingChatbox;
