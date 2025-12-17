import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Sidebar from '../components/Sidebar';
import SearchModal from '../components/SearchModal';
import TagInput from '../components/TagInput';
import MoodSelector from '../components/MoodSelector';
import ExportModal from '../components/ExportModal';
import ImportModal from '../components/ImportModal';
import InsightsPanel from '../components/InsightsPanel';
import TemplatesModal from '../components/TemplatesModal';
import ConfirmModal from '../components/ConfirmModal';
import HabitTracker from '../components/HabitTracker';
import QuickNotes from '../components/QuickNotes';
import SettingsModal from '../components/SettingsModal';
import api from '../api/api';

interface Entry {
    id: number;
    entry_date: string;
    content: string;
    tags: string[];
    mood: number | null;
    created_at: string;
}

// Large collection of reflection prompts
const allPrompts = [
    "What's one thing you're grateful for today?",
    "Describe a moment that made you smile recently.",
    "What's been on your mind lately?",
    "What would make today a great day?",
    "Reflect on a challenge you overcame this week.",
    "What's something new you learned recently?",
    "Write about someone who inspires you.",
    "What are you most proud of this week?",
    "Describe your perfect day in detail.",
    "What's a goal you're working towards?",
    "Write about a memory that always makes you happy.",
    "What would you tell your younger self?",
    "What are three things that went well today?",
    "What's something you'd like to improve about yourself?",
    "Describe a place where you feel most at peace.",
    "What's a lesson life has taught you recently?",
    "Who has had the biggest impact on your life?",
    "What are you looking forward to?",
    "Write about a book, movie, or song that moved you.",
    "What does success mean to you?",
    "Describe a moment when you felt truly alive.",
    "What fears are holding you back?",
    "What makes you feel most creative?",
    "Write about a relationship you cherish.",
    "What are your core values?",
    "Describe a risk you took that paid off.",
    "What brings you the most joy?",
    "Write about a time you showed courage.",
    "What habits would you like to build?",
    "Describe your ideal future self."
];

import { useAuth } from '../context/AuthContext';

const JournalPage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('today');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [content, setContent] = useState('');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showPreview, setShowPreview] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [attachments, setAttachments] = useState<{ name: string, data: string, type: string }[]>([]);
    const [showSearch, setShowSearch] = useState(false);
    const [currentTags, setCurrentTags] = useState<string[]>([]);
    const [currentMood, setCurrentMood] = useState<number | null>(null);
    const [showExport, setShowExport] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [streak, setStreak] = useState({ current: 0, longest: 0 });
    const [showTemplates, setShowTemplates] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [isViewMode, setIsViewMode] = useState(true); // true = preview, false = edit
    const [journalPage, setJournalPage] = useState(1);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerValue, setDatePickerValue] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef(content);
    const selectedDateRef = useRef(selectedDate);

    // Random prompt on each page load
    const [todayPrompt] = useState(() =>
        allPrompts[Math.floor(Math.random() * allPrompts.length)]
    );

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
        if (diffDays >= 365) return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
        return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    };

    // Keep refs updated
    useEffect(() => {
        contentRef.current = content;
    }, [content]);

    useEffect(() => {
        selectedDateRef.current = selectedDate;
    }, [selectedDate]);

    useEffect(() => {
        fetchRecentEntries();
        fetchStreak();
    }, []);

    // Keyboard shortcut for search (Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Warn before closing tab with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    useEffect(() => {
        if (isEditing) {
            fetchEntry(selectedDate);
        }
    }, [selectedDate, isEditing]);

    // Auto-save every 10 seconds
    const autoSave = useCallback(async () => {
        if (!isEditing || !hasUnsavedChanges || saving) return;

        try {
            await api.post('/entries', {
                date: formatDate(selectedDateRef.current),
                content: contentRef.current
            });
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }, [isEditing, hasUnsavedChanges, saving]);

    useEffect(() => {
        if (!isEditing) return;

        const interval = setInterval(() => {
            autoSave();
        }, 10000); // Auto-save every 10 seconds

        return () => clearInterval(interval);
    }, [isEditing, autoSave]);

    // Track changes
    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        setHasUnsavedChanges(true);
    };

    const fetchRecentEntries = async () => {
        setLoading(true);
        try {
            const response = await api.get('/entries/dates');
            const dates: string[] = response.data;

            const recentEntries: Entry[] = [];
            for (const date of dates.slice(-10).reverse()) {
                try {
                    const entryResponse = await api.get(`/entries/${date}`);
                    recentEntries.push(entryResponse.data);
                } catch {
                    // Entry might not exist
                }
            }
            setEntries(recentEntries);
        } catch (error) {
            console.error('Error fetching entries:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEntry = async (date: Date) => {
        setLoading(true);
        try {
            const response = await api.get(`/entries/${formatDate(date)}`);
            setContent(response.data.content || '');
            setCurrentTags(response.data.tags || []);
            setCurrentMood(response.data.mood || null);
            setHasUnsavedChanges(false);
        } catch {
            setContent('');
            setCurrentTags([]);
            setCurrentMood(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchStreak = async () => {
        try {
            const response = await api.get('/streak');
            setStreak(response.data);
        } catch (error) {
            console.error('Error fetching streak:', error);
        }
    };

    const saveEntry = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await api.post('/entries', {
                date: formatDate(selectedDate),
                content,
                tags: currentTags,
                mood: currentMood
            });
            setMessage({ type: 'success', text: 'Entry saved successfully!' });
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            fetchRecentEntries();
            fetchStreak();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Error saving entry:', error);
            setMessage({ type: 'error', text: 'Failed to save entry' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEntry = () => {
        const deleteAction = async () => {
            try {
                await api.delete(`/entries/${formatDate(selectedDate)}`);
                setMessage({ type: 'success', text: 'Entry deleted successfully!' });
                setIsEditing(false);
                setContent('');
                setCurrentTags([]);
                setCurrentMood(null);
                fetchRecentEntries();
                fetchStreak();
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } catch (error) {
                console.error('Error deleting entry:', error);
                setMessage({ type: 'error', text: 'Failed to delete entry' });
            }
        };
        // Hack: Attach a name property or just rely on function name if possible, 
        // but typically anonymous functions or closures are hard to name check reliably after state update.
        // Better approach: Add a state for `confirmType` but to minimize changes I'll use a named function reference.
        setPendingAction(() => deleteAction);
        setShowConfirm(true);
    };

    // Helper to confirm if there are unsaved changes
    const confirmIfUnsaved = (action: () => void) => {
        if (hasUnsavedChanges) {
            setPendingAction(() => action);
            setShowConfirm(true);
        } else {
            action();
        }
    };

    const handleConfirmDiscard = () => {
        if (pendingAction) {
            pendingAction();
        }
        setShowConfirm(false);
        setPendingAction(null);
        setHasUnsavedChanges(false);
    };

    const handleCancelDiscard = () => {
        setShowConfirm(false);
        setPendingAction(null);
    };

    const handleNewEntry = () => {
        const doNewEntry = () => {
            setSelectedDate(new Date());
            setContent('');
            setCurrentTags([]);
            setCurrentMood(null);
            setIsEditing(true);
            setIsViewMode(false); // Start in edit mode for new entries
            setActiveTab('today');
            setHasUnsavedChanges(false);
        };

        if (isEditing && hasUnsavedChanges) {
            confirmIfUnsaved(doNewEntry);
        } else {
            doNewEntry();
        }
    };

    const handleReflectNow = () => {
        setContent(`> ${todayPrompt}\n\n`);
        setSelectedDate(new Date());
        setIsEditing(true);
        setIsViewMode(false); // Start in edit mode
        setHasUnsavedChanges(true);
    };

    const handleEntryClick = (entry: Entry) => {
        const doEntryClick = () => {
            setSelectedDate(new Date(entry.entry_date));
            setContent(entry.content);
            setCurrentTags(entry.tags || []);
            setCurrentMood(entry.mood || null);
            setIsEditing(true);
            setIsViewMode(true); // Open in preview mode
            setHasUnsavedChanges(false);
        };

        if (isEditing && hasUnsavedChanges) {
            confirmIfUnsaved(doEntryClick);
        } else {
            doEntryClick();
        }
    };

    const handleBack = () => {
        const doBack = () => {
            setIsEditing(false);
            setHasUnsavedChanges(false);
        };

        if (hasUnsavedChanges) {
            confirmIfUnsaved(doBack);
        } else {
            doBack();
        }
    };

    const handleTabChange = (tab: string) => {
        const doTabChange = () => {
            setActiveTab(tab);
            if (isEditing) {
                setIsEditing(false);
            }
        };

        if (isEditing && hasUnsavedChanges) {
            confirmIfUnsaved(doTabChange);
        } else {
            doTabChange();
        }
    };

    const handleGoToDate = () => {
        if (datePickerValue) {
            const date = new Date(datePickerValue);
            setSelectedDate(date);
            setShowDatePicker(false);
            setDatePickerValue('');
            // Try to fetch the entry for this date
            setIsEditing(true);
            setIsViewMode(true);
        }
    };

    // Handle image/video upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                const id = `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                // Store attachment separately
                setAttachments(prev => [...prev, { name: id, data: base64, type: file.type }]);

                // Add a simple placeholder in content
                const isImage = file.type.startsWith('image/');
                const placeholder = isImage ? `\n![${file.name}](${id})\n` : `\n[Video: ${file.name}](${id})\n`;

                setContent(prev => prev + placeholder);
                setHasUnsavedChanges(true);
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Custom markdown components to render attachments
    const markdownComponents = {
        img: ({ src, alt }: { src?: string; alt?: string }) => {
            // Check if it's an attachment reference
            const attachment = attachments.find(a => a.name === src);
            if (attachment) {
                return <img src={attachment.data} alt={alt || ''} style={{ maxWidth: '100%', borderRadius: '8px' }} />;
            }
            return <img src={src} alt={alt || ''} style={{ maxWidth: '100%', borderRadius: '8px' }} />;
        }
    };

    // Insert markdown formatting
    const insertFormatting = (prefix: string, suffix: string = '') => {
        const textarea = document.querySelector('.entry-textarea') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = content.substring(start, end);
        const newText = content.substring(0, start) + prefix + selected + suffix + content.substring(end);

        setContent(newText);
        setHasUnsavedChanges(true);

        // Restore cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        }, 0);
    };

    const getEntryTitle = (content: string) => {
        const firstLine = content.split('\n')[0].replace(/^[#>*\-\s]+/, '').slice(0, 60);
        return firstLine || 'Untitled Entry';
    };

    const getEntryExcerpt = (content: string) => {
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('>'));
        return lines.slice(0, 2).join(' ').slice(0, 150) + '...';
    };

    // Find entry from 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoDateStr = formatDate(oneYearAgo);
    const onThisDayEntry = entries.find(e => e.entry_date === oneYearAgoDateStr);

    return (
        <div className="app-layout">
            <Sidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onNewEntry={handleNewEntry}
                onSearchClick={() => setShowSearch(true)}
                onSettingsClick={() => setShowSettings(true)}
                streak={streak}
            />

            <SearchModal
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                onSelectEntry={handleEntryClick}
            />

            <ExportModal
                isOpen={showExport}
                onClose={() => setShowExport(false)}
            />

            <ImportModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                onImportSuccess={() => {
                    fetchRecentEntries();
                    fetchStreak();
                    // trigger refresh of other components if needed
                    setShowImport(false);
                    setMessage({ type: 'success', text: 'Data imported successfully!' });
                    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                }}
            />

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onExportClick={() => {
                    setShowSettings(false);
                    setShowExport(true);
                }}
                onImportClick={() => {
                    setShowSettings(false);
                    setShowImport(true);
                }}
            />

            <TemplatesModal
                isOpen={showTemplates}
                onClose={() => setShowTemplates(false)}
                onSelectTemplate={(templateContent) => {
                    setContent(templateContent);
                    setHasUnsavedChanges(true);
                }}
            />

            <ConfirmModal
                isOpen={showConfirm}
                title={pendingAction?.name === 'deleteAction' ? "Delete Entry" : "Unsaved Changes"}
                message={pendingAction?.name === 'deleteAction' ? "Are you sure you want to delete this entry? This cannot be undone." : "You have unsaved changes. Are you sure you want to leave without saving?"}
                confirmText={pendingAction?.name === 'deleteAction' ? "Delete" : "Discard Changes"}
                cancelText={pendingAction?.name === 'deleteAction' ? "Cancel" : "Keep Editing"}
                onConfirm={handleConfirmDiscard}
                onCancel={handleCancelDiscard}
            />

            <main className="main-content">
                {isEditing ? (
                    // Entry Editor View
                    <div className="entry-editor">
                        <div className="entry-editor-header">
                            <button className="btn btn-ghost" onClick={handleBack}>
                                ← Back
                            </button>
                            <span className="entry-editor-date">
                                {selectedDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                            <div className="editor-actions">
                                {isViewMode ? (
                                    <>
                                        <button
                                            className="btn btn-danger"
                                            onClick={handleDeleteEntry}
                                        >
                                            🗑️ Delete
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setIsViewMode(false)}
                                        >
                                            ✏️ Edit
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {lastSaved && (
                                            <span className="auto-save-status">
                                                {hasUnsavedChanges ? '• Unsaved changes' : `✓ Saved ${lastSaved.toLocaleTimeString()}`}
                                            </span>
                                        )}
                                        <button
                                            className="btn btn-primary"
                                            onClick={saveEntry}
                                            disabled={saving}
                                        >
                                            {saving ? 'Saving...' : 'Save Entry'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {message.text && (
                            <div className={`alert alert-${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        {isViewMode ? (
                            /* View Mode - Just preview */
                            <div className="editor-container view-mode">
                                <div className="markdown-preview">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={markdownComponents}
                                    >
                                        {content || '*No content yet...*'}
                                    </ReactMarkdown>
                                </div>
                                {currentTags.length > 0 && (
                                    <div className="view-tags">
                                        {currentTags.map(tag => (
                                            <span key={tag} className="tag-badge">#{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Edit Mode - Full editor */
                            <>
                                {/* Tags Input */}
                                <TagInput tags={currentTags} onChange={setCurrentTags} />

                                {/* Mood Selector */}
                                <MoodSelector mood={currentMood} onChange={setCurrentMood} />

                                {/* Formatting Toolbar */}
                                <div className="editor-toolbar">
                                    <button className="toolbar-btn" onClick={() => insertFormatting('# ')} title="Heading 1">
                                        H1
                                    </button>
                                    <button className="toolbar-btn" onClick={() => insertFormatting('## ')} title="Heading 2">
                                        H2
                                    </button>
                                    <button className="toolbar-btn" onClick={() => insertFormatting('### ')} title="Heading 3">
                                        H3
                                    </button>
                                    <div className="toolbar-divider"></div>
                                    <button className="toolbar-btn" onClick={() => insertFormatting('**', '**')} title="Bold">
                                        <strong>B</strong>
                                    </button>
                                    <button className="toolbar-btn" onClick={() => insertFormatting('*', '*')} title="Italic">
                                        <em>I</em>
                                    </button>
                                    <button className="toolbar-btn" onClick={() => insertFormatting('~~', '~~')} title="Strikethrough">
                                        <s>S</s>
                                    </button>
                                    <div className="toolbar-divider"></div>
                                    <button className="toolbar-btn" onClick={() => insertFormatting('> ')} title="Quote">
                                        ❝
                                    </button>
                                    <button className="toolbar-btn" onClick={() => insertFormatting('\n---\n')} title="Horizontal Rule">
                                        ―
                                    </button>
                                    <button className="toolbar-btn" onClick={() => insertFormatting('- ')} title="List">
                                        •
                                    </button>
                                    <button className="toolbar-btn" onClick={() => insertFormatting('`', '`')} title="Code">
                                        {'</>'}
                                    </button>
                                    <div className="toolbar-divider"></div>
                                    <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Add Image/Video">
                                        📷
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/*,video/*"
                                        multiple
                                        style={{ display: 'none' }}
                                    />
                                    <button className="toolbar-btn" onClick={() => setShowTemplates(true)} title="Use Template">
                                        📝
                                    </button>
                                    <div className="toolbar-spacer"></div>
                                    <button
                                        className={`toolbar-btn preview-toggle ${showPreview ? 'active' : ''}`}
                                        onClick={() => setShowPreview(!showPreview)}
                                    >
                                        {showPreview ? '✏️ Edit' : '👁️ Preview'}
                                    </button>
                                </div>

                                {/* Editor / Preview - Full screen toggle */}
                                <div className="editor-container">
                                    {!showPreview ? (
                                        <textarea
                                            className="entry-textarea"
                                            value={content}
                                            onChange={(e) => handleContentChange(e.target.value)}
                                            placeholder="Start writing your thoughts...

Formatting tips:
# Heading 1
## Heading 2
### Heading 3
> Quote
--- (horizontal line)
**bold** *italic*
- bullet point"
                                        />
                                    ) : (
                                        <div className="markdown-preview">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={markdownComponents}
                                            >
                                                {content || '*Nothing to preview yet...*'}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ) : activeTab === 'habits' ? (
                    <div className="view-container">
                        <h2>🎯 Habit Tracker</h2>
                        <HabitTracker />
                    </div>
                ) : activeTab === 'notes' ? (
                    <div className="view-container">
                        <h2>📝 Quick Notes</h2>
                        <QuickNotes />
                    </div>
                ) : activeTab === 'insights' ? (
                    // Insights View
                    <InsightsPanel
                        onDateClick={(dateStr) => {
                            setSelectedDate(new Date(dateStr));
                            setIsEditing(true);
                            setIsViewMode(true);
                        }}
                    />
                ) : activeTab === 'journals' ? (
                    // Journals View - All entries with pagination
                    <div className="journals-view">
                        <div className="journals-header">
                            <h2>📔 All Journals</h2>
                            <div className="date-picker-section">
                                {showDatePicker ? (
                                    <div className="date-picker-input">
                                        <input
                                            type="date"
                                            value={datePickerValue}
                                            onChange={(e) => setDatePickerValue(e.target.value)}
                                            className="date-input"
                                        />
                                        <button className="btn btn-primary btn-sm" onClick={handleGoToDate}>
                                            Go
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setShowDatePicker(false)}>
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button className="btn btn-ghost" onClick={() => setShowDatePicker(true)}>
                                        📅 Go to Date
                                    </button>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                                <p>Loading entries...</p>
                            </div>
                        ) : entries.length > 0 ? (
                            <>
                                <div className="entry-list journals-grid stagger-children">
                                    {entries.slice((journalPage - 1) * 10, journalPage * 10).map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="entry-card glass-card animate-hover-lift"
                                            onClick={() => handleEntryClick(entry)}
                                        >
                                            <div className="entry-card-content">
                                                <span className="entry-date-badge">
                                                    {formatDisplayDate(entry.entry_date)}
                                                </span>
                                                <h3 className="entry-title">{getEntryTitle(entry.content)}</h3>
                                                <p className="entry-excerpt">{getEntryExcerpt(entry.content)}</p>
                                                {entry.tags && entry.tags.length > 0 && (
                                                    <div className="entry-card-tags">
                                                        {entry.tags.slice(0, 3).map(tag => (
                                                            <span key={tag} className="tag-badge small">#{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div className="pagination">
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => setJournalPage(p => Math.max(1, p - 1))}
                                        disabled={journalPage === 1}
                                    >
                                        ← Previous
                                    </button>
                                    <span className="pagination-info">
                                        Page {journalPage} of {Math.ceil(entries.length / 10)}
                                    </span>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => setJournalPage(p => Math.min(Math.ceil(entries.length / 10), p + 1))}
                                        disabled={journalPage >= Math.ceil(entries.length / 10)}
                                    >
                                        Next →
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="prompt-card" style={{ textAlign: 'center' }}>
                                <p className="prompt-text">No entries yet. Start your journaling journey!</p>
                                <button className="btn btn-primary" onClick={handleNewEntry}>
                                    Write Your First Entry
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    // Dashboard View
                    <>
                        <header className="main-header stagger-children">
                            <h1 className="gradient-text animate-slide-in">
                                Hey {user?.username} 👋
                            </h1>
                            <p className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
                                {new Date().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </p>
                        </header>

                        {/* Quick Stats Row */}
                        <div className="stats-row animate-slide-up" style={{ animationDelay: '0.2s', display: 'flex', gap: '20px', marginBottom: '32px' }}>
                            <div className="glass-card stat-mini" style={{ flex: 1, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div className="stat-icon" style={{ fontSize: '2rem' }}>🔥</div>
                                <div>
                                    <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{streak.current}</div>
                                    <div className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Day Streak</div>
                                </div>
                            </div>
                            <div className="glass-card stat-mini" style={{ flex: 1, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div className="stat-icon" style={{ fontSize: '2rem' }}>📝</div>
                                <div>
                                    <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{entries.length}</div>
                                    <div className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Entries</div>
                                </div>
                            </div>
                        </div>

                        {/* Today's Prompt */}
                        <section className="dashboard-section animate-slide-up" style={{ animationDelay: '0.3s' }}>
                            <div className="section-header">
                                <h2 className="section-title">
                                    <span className="icon">💭</span>
                                    Daily Reflection
                                </h2>
                            </div>
                            <div className="prompt-card glass-card">
                                <p className="prompt-text" style={{ fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '24px' }}>
                                    "{todayPrompt}"
                                </p>
                                <button className="btn btn-primary btn-large" onClick={handleReflectNow}>
                                    Write Response
                                </button>
                            </div>
                        </section>


                        <div className="dashboard-grid">
                            {/* Removed Habits and Notes from here */}
                        </div>

                        {/* On This Day */}
                        {onThisDayEntry && (
                            <section className="dashboard-section animate-slide-up" style={{ animationDelay: '0.4s' }}>
                                <div className="section-header">
                                    <h2 className="section-title">
                                        <span className="icon">🕰️</span>
                                        On This Day
                                    </h2>
                                </div>
                                <div className="entry-card glass-card animate-hover-lift" onClick={() => handleEntryClick(onThisDayEntry)}>
                                    <div className="entry-card-content">
                                        <span className="entry-date-badge highlight">
                                            ✨ 1 year ago
                                        </span>
                                        <h3 className="entry-title">{getEntryTitle(onThisDayEntry.content)}</h3>
                                        <p className="entry-excerpt">{getEntryExcerpt(onThisDayEntry.content)}</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Recent Entries */}
                        <section className="dashboard-section animate-slide-up" style={{ animationDelay: '0.5s' }}>
                            <div className="section-header">
                                <h2 className="section-title">
                                    <span className="icon">📚</span>
                                    Recent Entries
                                </h2>
                                <button className="btn btn-link" onClick={() => setActiveTab('journals')}>
                                    View All
                                </button>
                            </div>

                            {loading ? (
                                <div className="loading-container">
                                    <div className="loading-spinner"></div>
                                    <p>Loading entries...</p>
                                </div>
                            ) : entries.length > 0 ? (
                                <div className="entry-list stagger-children">
                                    {entries.slice(0, 3).map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="entry-card glass-card animate-hover-lift"
                                            onClick={() => handleEntryClick(entry)}
                                        >
                                            <div className="entry-card-content">
                                                <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span className="entry-date-badge">
                                                        {getRelativeTime(entry.entry_date)}
                                                    </span>
                                                    {entry.mood && (
                                                        <span className="mood-badge">
                                                            {['😢', '😔', '😐', '😊', '🤩'][entry.mood - 1]}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="entry-title">{getEntryTitle(entry.content)}</h3>
                                                <p className="entry-excerpt">{getEntryExcerpt(entry.content)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="prompt-card glass-card" style={{ textAlign: 'center' }}>
                                    <p className="prompt-text">No entries yet. Start your journaling journey today!</p>
                                    <button className="btn btn-primary" onClick={handleNewEntry}>
                                        Write Your First Entry
                                    </button>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
};

export default JournalPage;
