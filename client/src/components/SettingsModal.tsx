import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExportClick: () => void;
    onImportClick: () => void;
}

const SettingsModal = ({ isOpen, onClose, onExportClick, onImportClick }: SettingsModalProps) => {
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'appearance' | 'data' | 'community'>('appearance');
    const [feedback, setFeedback] = useState('');

    if (!isOpen) return null;

    const handleFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, send to backend
        alert('Improvement idea received! Thanks for helping us build Journiv.');
        setFeedback('');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>⚙️ Settings</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="settings-layout">
                    {/* Sidebar Tabs */}
                    <div className="settings-sidebar">
                        <button
                            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('appearance')}
                        >
                            <span className="icon">🎨</span> Appearance
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
                            onClick={() => setActiveTab('data')}
                        >
                            <span className="icon">💾</span> Data & Backup
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'community' ? 'active' : ''}`}
                            onClick={() => setActiveTab('community')}
                        >
                            <span className="icon">💬</span> Community
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="settings-content">

                        {/* APPEARANCE TAB */}
                        {activeTab === 'appearance' && (
                            <div className="settings-section">
                                <h3>App Appearance</h3>
                                <p className="section-desc">Customize how Journiv looks on your device.</p>

                                <div className="theme-toggle-card">
                                    <div className="theme-info">
                                        <strong>Dark Mode</strong>
                                        <p>{theme === 'dark' ? 'On' : 'Off'}</p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={theme === 'dark'}
                                            onChange={toggleTheme} // Toggles between dark/light
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                                <p className="hint-text">
                                    Toggle to switch between the cozy Dark theme and the crisp Light theme.
                                </p>
                            </div>
                        )}

                        {/* DATA TAB */}
                        {activeTab === 'data' && (
                            <div className="settings-section">
                                <h3>Data Management</h3>
                                <p className="section-desc">Manage your journal data. Keep it safe or move it elsewhere.</p>

                                <div className="data-action-card">
                                    <div className="data-info">
                                        <strong>Export Data</strong>
                                        <p>Download your journal, habits, and notes as JSON, PDF, or Markdown.</p>
                                    </div>
                                    <button className="btn btn-secondary" onClick={onExportClick}>
                                        Export...
                                    </button>
                                </div>

                                <div className="data-action-card">
                                    <div className="data-info">
                                        <strong>Import Backup</strong>
                                        <p>Restore your data from a previously created JSON backup.</p>
                                    </div>
                                    <button className="btn btn-secondary" onClick={onImportClick}>
                                        Import...
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* COMMUNITY TAB */}
                        {activeTab === 'community' && (
                            <div className="settings-section">
                                <h3>Community & Feedback</h3>
                                <p className="section-desc">Join the conversation and help shape the future of Journiv.</p>

                                <div className="community-links">
                                    <a
                                        href="https://discord.gg/jeybpEbkzC" // Replace with actual link if user provides one, else placeholder
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="discord-btn"
                                    >
                                        <span className="icon">🎮</span> Join our Discord Server
                                    </a>
                                </div>

                                <div className="feedback-form-container">
                                    <h4>Send Feedback</h4>
                                    <form onSubmit={handleFeedbackSubmit}>
                                        <textarea
                                            className="feedback-input"
                                            placeholder="Found a bug? Have a feature idea? Let us know..."
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            rows={4}
                                        />
                                        <button className="btn btn-primary" type="submit" disabled={!feedback.trim()}>
                                            Send Feedback
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            <style>{`
                .settings-modal {
                    max-width: 700px;
                    width: 90%;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    padding: 0;
                    overflow: hidden;
                }
                .settings-modal .modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border-secondary);
                }
                .settings-layout {
                    display: flex;
                    flex: 1;
                    min-height: 400px;
                }
                .settings-sidebar {
                    width: 200px;
                    background: var(--bg-secondary);
                    border-right: 1px solid var(--border-secondary);
                    padding: 20px 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .settings-tab {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    border: none;
                    background: none;
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                }
                .settings-tab:hover {
                    background: var(--bg-card-hover);
                    color: var(--text-primary);
                }
                .settings-tab.active {
                    background: var(--accent-muted);
                    color: var(--accent-primary);
                    font-weight: 500;
                }
                .settings-content {
                    flex: 1;
                    padding: 30px;
                    overflow-y: auto;
                    background: var(--bg-card);
                }
                .settings-section h3 {
                    margin-top: 0;
                    font-size: 1.4rem;
                }
                .section-desc {
                    color: var(--text-secondary);
                    margin-bottom: 24px;
                }
                
                /* Data Cards */
                .data-action-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-md);
                    margin-bottom: 16px;
                    background: var(--bg-secondary);
                }
                .data-info strong {
                    display: block;
                    margin-bottom: 4px;
                }
                .data-info p {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin: 0;
                    max-width: 300px;
                }

                /* Theme Toggle */
                .theme-toggle-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                }
                .hint-text {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    margin-top: 10px;
                }

                /* Toggle Switch */
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 28px;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                }
                input:checked + .slider {
                    background-color: var(--accent-primary);
                }
                input:focus + .slider {
                    box-shadow: 0 0 1px var(--accent-primary);
                }
                input:checked + .slider:before {
                    transform: translateX(22px);
                }
                .slider.round {
                    border-radius: 34px;
                }
                .slider.round:before {
                    border-radius: 50%;
                }

                /* Community */
                .community-links {
                    margin-bottom: 30px;
                }
                .discord-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: #5865F2;
                    color: white;
                    padding: 12px 20px;
                    border-radius: var(--radius-md);
                    text-decoration: none;
                    font-weight: 500;
                    transition: transform 0.2s;
                }
                .discord-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(88, 101, 242, 0.3);
                }
                .feedback-form-container {
                    background: var(--bg-secondary);
                    padding: 20px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                }
                .feedback-form-container h4 {
                    margin-top: 0;
                    margin-bottom: 12px;
                }
                .feedback-input {
                    width: 100%;
                    padding: 12px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                    background: var(--bg-input);
                    color: var(--text-primary);
                    margin-bottom: 12px;
                    resize: vertical;
                }
            `}</style>
        </div>
    );
};

export default SettingsModal;
