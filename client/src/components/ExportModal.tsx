import { useState } from 'react';
import api from '../api/api';

interface Entry {
    id: number;
    entry_date: string;
    content: string;
    tags: string[];
    mood: number | null;
}

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExportModal = ({ isOpen, onClose }: ExportModalProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getMoodEmoji = (mood: number | null) => {
        const moods: Record<number, string> = { 1: '😢', 2: '😔', 3: '😐', 4: '😊', 5: '🤩' };
        return mood ? moods[mood] : '';
    };

    const exportAsPDF = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get('/export');
            const { entries } = response.data;

            // Create HTML content for PDF
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Journiv Export</title>
    <style>
        body {
            font-family: 'Georgia', serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.8;
            color: #333;
        }
        h1 {
            text-align: center;
            color: #4f6bff;
            border-bottom: 2px solid #4f6bff;
            padding-bottom: 20px;
            margin-bottom: 40px;
        }
        .entry {
            margin-bottom: 40px;
            page-break-inside: avoid;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
        }
        .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .entry-date {
            font-size: 1.2em;
            font-weight: bold;
            color: #4f6bff;
        }
        .entry-mood {
            font-size: 1.5em;
        }
        .entry-tags {
            margin-bottom: 10px;
        }
        .tag {
            display: inline-block;
            background: #e8eeff;
            color: #4f6bff;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 0.85em;
            margin-right: 5px;
        }
        .entry-content {
            white-space: pre-wrap;
        }
        .footer {
            text-align: center;
            color: #999;
            font-size: 0.9em;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <h1>📔 My Journal</h1>
    ${entries.map((entry: Entry) => `
        <div class="entry">
            <div class="entry-header">
                <span class="entry-date">${formatDate(entry.entry_date)}</span>
                <span class="entry-mood">${getMoodEmoji(entry.mood)}</span>
            </div>
            ${entry.tags.length > 0 ? `
                <div class="entry-tags">
                    ${entry.tags.map((tag: string) => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="entry-content">${entry.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
    `).join('')}
    <div class="footer">
        Exported from Journiv on ${new Date().toLocaleDateString()}
    </div>
</body>
</html>`;

            // Open in new window and trigger print
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            }

            onClose();
        } catch (err) {
            console.error('Export error:', err);
            setError('Failed to export entries');
        } finally {
            setLoading(false);
        }
    };

    const exportAsMarkdown = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get('/export');
            const { entries } = response.data;

            // Create Markdown content
            let markdown = `# 📔 My Journal\n\nExported from Journiv on ${new Date().toLocaleDateString()}\n\n---\n\n`;

            entries.forEach((entry: Entry) => {
                markdown += `## ${formatDate(entry.entry_date)} ${getMoodEmoji(entry.mood)}\n\n`;

                if (entry.tags.length > 0) {
                    markdown += `**Tags:** ${entry.tags.map((t: string) => `#${t}`).join(' ')}\n\n`;
                }

                markdown += entry.content + '\n\n---\n\n';
            });

            // Download as file
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `journiv-export-${new Date().toISOString().split('T')[0]}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            onClose();
        } catch (err) {
            console.error('Export error:', err);
            setError('Failed to export entries');
        } finally {
            setLoading(false);
        }
    };

    const exportAsJSON = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get('/data/export');
            const data = response.data;

            // Download as JSON file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `journiv-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            onClose();
        } catch (err) {
            console.error('Export error:', err);
            setError('Failed to export data');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📥 Export Entries</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <p className="modal-description">
                        Export all your journal entries to save a backup or print them.
                    </p>

                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="export-options">
                        <button
                            className="export-btn"
                            onClick={exportAsPDF}
                            disabled={loading}
                        >
                            <span className="export-icon">📄</span>
                            <span className="export-label">Export as PDF</span>
                            <span className="export-desc">Print-ready format</span>
                        </button>

                        <button
                            className="export-btn"
                            onClick={exportAsMarkdown}
                            disabled={loading}
                        >
                            <span className="export-icon">📝</span>
                            <span className="export-label">Export as Markdown</span>
                            <span className="export-desc">Plain text format</span>
                        </button>
                    </div>

                    <div className="export-separator" style={{ margin: '20px 0', borderTop: '1px solid #eee' }}></div>

                    <button
                        className="export-btn backup-btn"
                        onClick={exportAsJSON}
                        disabled={loading}
                        style={{ background: '#f8f9fa', border: '1px solid #dee2e6', width: '100%', display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <span className="export-icon" style={{ fontSize: '24px' }}>💾</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="export-label" style={{ color: '#333', fontWeight: 'bold' }}>Backup Data (JSON)</span>
                            <span className="export-desc" style={{ color: '#666', fontSize: '13px' }}>Full backup for restoring later</span>
                        </div>
                    </button>

                    {loading && (
                        <div className="export-loading">
                            <div className="loading-spinner"></div>
                            <p>Preparing export...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
