import { useState, useRef } from 'react';
import api from '../api/api';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
}

interface ConflictSummary {
    entries: number;
    habits: number;
    quickNotes: number;
}

const ImportModal = ({ isOpen, onClose, onImportSuccess }: ImportModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<'upload' | 'analyze' | 'confirm'>('upload');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [conflicts, setConflicts] = useState<ConflictSummary | null>(null);
    const [importData, setImportData] = useState<any>(null);
    const [overwriteOptions, setOverwriteOptions] = useState({
        entries: false,
        habits: false,
        quickNotes: false
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setLoading(true);
        setError('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);

                // key validation
                if (!json.data || !json.version) {
                    throw new Error('Invalid backup file format');
                }

                setImportData(json.data);

                // Check conflicts
                const response = await api.post('/data/import/check', { data: json.data });
                setConflicts(response.data.conflicts);
                setStep('confirm');

                // Reset options
                setOverwriteOptions({ entries: false, habits: false, quickNotes: false });
            } catch (err) {
                console.error('Analysis error:', err);
                setError('Failed to analyze file. Invalid format or server error.');
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!importData) return;

        setLoading(true);
        setError('');

        try {
            await api.post('/data/import/execute', {
                data: importData,
                overwriteOptions
            });
            onImportSuccess();
            onClose();
            // Reset state
            setStep('upload');
            setFile(null);
            setImportData(null);
        } catch (err) {
            console.error('Import error:', err);
            setError('Failed to import data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOptionChange = (key: keyof typeof overwriteOptions) => {
        setOverwriteOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📥 Import Backup</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {step === 'upload' && (
                        <div className="import-upload-step">
                            <p className="modal-description">
                                Restore your journal from a JSON backup file.
                            </p>

                            <div
                                className="file-drop-area"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <span className="file-icon">📄</span>
                                {file ? (
                                    <span className="file-name">{file.name}</span>
                                ) : (
                                    <span>Click to select backup file</span>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept=".json"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {error && <div className="alert alert-error">{error}</div>}

                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                                <button
                                    className="btn btn-primary"
                                    disabled={!file || loading}
                                    onClick={handleAnalyze}
                                >
                                    {loading ? 'Analyzing...' : 'Next'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'confirm' && conflicts && (
                        <div className="import-confirm-step">
                            <p className="modal-description">
                                Analysis complete. Found <strong>{importData.entries.length}</strong> entries,
                                <strong>{importData.habits.length}</strong> habits, and
                                <strong>{importData.quickNotes.length}</strong> notes.
                            </p>

                            <div className="conflict-summary">
                                <h3>⚠️ Conflicts Found</h3>
                                <p>Some items match existing data. Select which ones to overwrite:</p>

                                <div className="conflict-list">
                                    <label className={`checkbox-option ${conflicts.entries === 0 ? 'disabled' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={overwriteOptions.entries}
                                            onChange={() => handleOptionChange('entries')}
                                            disabled={conflicts.entries === 0}
                                        />
                                        <div className="option-info">
                                            <strong>Entries</strong>
                                            <span>{conflicts.entries} conflicts</span>
                                        </div>
                                    </label>

                                    <label className={`checkbox-option ${conflicts.habits === 0 ? 'disabled' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={overwriteOptions.habits}
                                            onChange={() => handleOptionChange('habits')}
                                            disabled={conflicts.habits === 0}
                                        />
                                        <div className="option-info">
                                            <strong>Habits</strong>
                                            <span>{conflicts.habits} conflicts</span>
                                        </div>
                                    </label>

                                    <label className={`checkbox-option ${conflicts.quickNotes === 0 ? 'disabled' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={overwriteOptions.quickNotes}
                                            onChange={() => handleOptionChange('quickNotes')}
                                            disabled={conflicts.quickNotes === 0}
                                        />
                                        <div className="option-info">
                                            <strong>Quick Notes</strong>
                                            <span>{conflicts.quickNotes} conflicts</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <p className="hint-text" style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                                Unchecked items will be skipped if they conflict. New items are always added.
                            </p>

                            {error && <div className="alert alert-error">{error}</div>}

                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setStep('upload')}>Back</button>
                                <button
                                    className="btn btn-primary"
                                    disabled={loading}
                                    onClick={handleImport}
                                >
                                    {loading ? 'Importing...' : 'Start Import'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .file-drop-area {
                    border: 2px dashed #e2e8f0;
                    border-radius: 8px;
                    padding: 40px;
                    text-align: center;
                    cursor: pointer;
                    margin: 20px 0;
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }
                .file-drop-area:hover {
                    border-color: #4f6bff;
                    background: #f8faff;
                }
                .file-icon {
                    font-size: 2em;
                }
                .conflict-summary {
                    background: #fff4e5;
                    border: 1px solid #ffcc80;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                }
                .conflict-summary h3 {
                    margin: 0 0 10px 0;
                    color: #d84315;
                    font-size: 1.1em;
                }
                .conflict-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-top: 10px;
                }
                .checkbox-option {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    cursor: pointer;
                    background: white;
                }
                .checkbox-option:hover:not(.disabled) {
                    background: #f8f9fa;
                }
                .checkbox-option.disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background: #f5f5f5;
                }
                .checkbox-option input {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                .option-info {
                    display: flex;
                    justify-content: space-between;
                    flex: 1;
                    align-items: center;
                }
                .option-info span {
                    font-size: 0.9em;
                    color: #666;
                    background: #eee;
                    padding: 2px 8px;
                    border-radius: 12px;
                }
            `}</style>
        </div>
    );
};

export default ImportModal;
