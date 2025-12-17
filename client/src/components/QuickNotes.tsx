import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import api from '../api/api';
import EditNoteModal from './EditNoteModal';
import ConfirmModal from './ConfirmModal';

interface QuickNote {
    id: number;
    title: string;
    content: string;
    color: string;
    pinned: number;
    tags: string; // JSON string
    type: 'text' | 'checklist';
    position: number;
    created_at: string;
}

const QuickNotes = () => {
    const [notes, setNotes] = useState<QuickNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [selectedType, setSelectedType] = useState<'text' | 'checklist'>('checklist');
    const [newTags, setNewTags] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdd, setShowAdd] = useState(false);

    // Modal States
    const [editingNote, setEditingNote] = useState<QuickNote | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; noteId: number | null }>({
        isOpen: false,
        noteId: null
    });

    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const response = await api.get('/notes');
            setNotes(response.data);
        } catch (error) {
            console.error('Error fetching notes:', error);
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        const tagsArray = newTags.split(',').map(t => t.trim()).filter(t => t);

        try {
            await api.post('/notes', {
                title: newTitle,
                content: newNote,
                type: selectedType,
                tags: tagsArray
            });
            setNewNote('');
            setNewTitle('');
            setNewTags('');
            setShowAdd(false);
            fetchNotes();
        } catch (error) {
            console.error('Error adding note:', error);
        }
    };

    const handleUpdateNote = async (noteId: number, updates: Partial<QuickNote>, tagsString: string) => {
        try {
            const tagsArray = tagsString.split(',').map(t => t.trim()).filter(t => t);
            await api.put(`/notes/${noteId}`, {
                ...updates,
                tags: tagsArray
            });
            setEditingNote(null);
            fetchNotes();
        } catch (error) {
            console.error('Error updating note:', error);
        }
    };

    const confirmDelete = (noteId: number) => {
        setDeleteConfirm({ isOpen: true, noteId });
    };

    const handleDeleteNote = async () => {
        if (!deleteConfirm.noteId) return;
        try {
            await api.delete(`/notes/${deleteConfirm.noteId}`);
            setDeleteConfirm({ isOpen: false, noteId: null });
            fetchNotes();
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleTogglePin = async (e: React.MouseEvent, noteId: number) => {
        e.stopPropagation();
        try {
            await api.post(`/notes/${noteId}/pin`, {});
            fetchNotes();
        } catch (error) {
            console.error('Error toggling pin:', error);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(notes);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setNotes(items); // Optimistic UI update

        const noteIds = items.map(n => n.id);

        try {
            await api.put('/notes/reorder', { noteIds });
        } catch (error) {
            console.error('Error reordering notes:', error);
            fetchNotes(); // Revert on error
        }
    };

    const handleChecklistToggle = async (e: React.MouseEvent, note: QuickNote, index: number) => {
        e.stopPropagation();
        const lines = note.content.split('\n');
        const line = lines[index];
        if (!line) return;

        const isChecked = line.includes('[x]');
        const newLine = isChecked ? line.replace('[x]', '[ ]') : line.replace('[ ]', '[x]');
        lines[index] = newLine;
        const newContent = lines.join('\n');

        const updatedNote = { ...note, content: newContent };
        setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n));

        try {
            await api.put(`/notes/${note.id}`, {
                title: note.title,
                content: newContent,
                tags: note.tags ? JSON.parse(note.tags) : []
            });
        } catch (error) {
            console.error('Error updating checklist:', error);
            fetchNotes();
        }
    };

    const renderNoteContent = (note: QuickNote) => {
        if (note.type === 'checklist') {
            const lines = note.content.split('\n');
            const displayLines = lines.slice(0, 8);
            const hasMore = lines.length > 8;

            return (
                <div className="checklist-preview">
                    {displayLines.map((line, i) => {
                        const isChecked = line.trim().startsWith('[x]');
                        if (!line.trim().match(/^\[[ x]\]/)) return <div key={i} className="checklist-text">{line}</div>;

                        return (
                            <div key={i} className="checklist-item" onClick={(e) => {
                                e.stopPropagation();
                                handleChecklistToggle(e, note, i);
                            }}>
                                <span className={`checklist-box ${isChecked ? 'checked' : ''}`}>
                                    {isChecked ? '✓' : ''}
                                </span>
                                <span className={`checklist-content ${isChecked ? 'checked-text' : ''}`}>
                                    {line.replace(/^\[[ x]\] /, '')}
                                </span>
                            </div>
                        );
                    })}
                    {hasMore && <div className="more-items">... +{lines.length - 8} more</div>}
                </div>
            );
        }
        return (
            <div className="markdown-preview">
                <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>
        );
    };

    // Filter Logic
    const filteredNotes = notes.filter(note => {
        const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (note.tags && note.tags.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
    });

    return (
        <div className="quick-notes">
            <div className="notes-header-row">
                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <button
                    className="btn btn-primary add-btn"
                    onClick={() => setShowAdd(!showAdd)}
                >
                    {showAdd ? '✕ Close' : '+ New Note'}
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleAddNote} className="note-add-form animate-slide-down">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Title (optional)..."
                        className="note-title-input"
                        autoFocus
                    />

                    <input
                        type="text"
                        className="tags-input"
                        placeholder="Tags (comma separated)..."
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                    />

                    <textarea
                        ref={inputRef}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="- Item 1\n- Item 2"
                        className="note-input"
                        rows={3}
                    />

                    <div className="note-form-footer">
                        <button type="submit" className="btn btn-primary btn-sm">Save Note</button>
                    </div>
                </form>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="notes-grid" direction="horizontal">
                    {(provided) => (
                        <div
                            className="notes-grid"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {filteredNotes.length === 0 ? (
                                <p className="notes-empty">
                                    {searchQuery ? 'No matching notes found.' : 'No notes yet. Add one above!'}
                                </p>
                            ) : (
                                filteredNotes.map((note, index) => (
                                    <Draggable key={note.id} draggableId={String(note.id)} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`note-card ${note.pinned ? 'pinned' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                                                style={{ ...provided.draggableProps.style }}
                                                onClick={() => setEditingNote(note)}
                                            >
                                                <div className="note-header">
                                                    <div className="note-title-text">{note.title || 'Untitled'}</div>
                                                    <div className="note-actions">
                                                        <button
                                                            className="icon-btn pin-btn"
                                                            onClick={(e) => handleTogglePin(e, note.id)}
                                                            title={note.pinned ? 'Unpin' : 'Pin'}
                                                        >
                                                            {note.pinned ? '📌' : '📍'}
                                                        </button>
                                                        <button
                                                            className="icon-btn delete-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                confirmDelete(note.id);
                                                            }}
                                                            title="Delete"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="note-content-preview">
                                                    {renderNoteContent(note)}
                                                </div>

                                                {note.tags && note.tags !== '[]' && (
                                                    <div className="note-tags">
                                                        {JSON.parse(note.tags).map((tag: string, i: number) => (
                                                            <span key={i} className="note-tag">#{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Draggable>
                                ))
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {/* Modals */}
            <EditNoteModal
                isOpen={!!editingNote}
                note={editingNote}
                onClose={() => setEditingNote(null)}
                onSave={handleUpdateNote}
            />

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="Delete Note"
                message="Are you sure you want to delete this note? This action cannot be undone."
                confirmText="Delete"
                onConfirm={handleDeleteNote}
                onCancel={() => setDeleteConfirm({ isOpen: false, noteId: null })}
            />

            <style>{`
                .quick-notes {
                    position: relative;
                }
                .notes-header-row {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .search-bar {
                    flex: 1;
                    position: relative;
                }
                .search-bar input {
                    width: 100%;
                    padding: 12px 12px 12px 40px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                    background: var(--bg-card); /* Lighter background for search */
                    color: var(--text-primary);
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .search-bar input:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 2px var(--primary-light);
                }
                .search-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    opacity: 0.5;
                }
                
                .note-add-form {
                    background: var(--bg-card);
                    padding: 20px;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-primary);
                    margin-bottom: 24px;
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .animate-slide-down {
                    animation: slideDown 0.3s ease-out;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .note-title-input, .tags-input, .note-input {
                    width: 100%;
                    padding: 12px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                    background: var(--bg-input); /* Needs such var or use bg-secondary */
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    font-size: 0.95rem;
                    transition: border-color 0.2s;
                }
                .note-title-input:focus, .tags-input:focus, .note-input:focus {
                    border-color: var(--primary);
                    outline: none;
                }
                .note-title-input {
                    font-weight: 600;
                }
                .tags-input {
                    font-size: 0.85rem;
                }
                .note-input {
                    min-height: 80px;
                    resize: vertical;
                    font-family: inherit;
                }

                .notes-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    align-items: flex-start; 
                }
                .note-card {
                    width: 260px;
                    height: auto;
                    min-height: 0;
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    cursor: grab;
                    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
                    position: relative;
                }
                .note-card:hover {
                    box-shadow: var(--shadow-md);
                    transform: translateY(-2px);
                    border-color: var(--border-hover);
                }
                .note-card.dragging {
                    box-shadow: var(--shadow-lg);
                    transform: scale(1.05);
                    z-index: 10;
                    opacity: 0.9;
                    cursor: grabbing;
                }
                .note-card.pinned {
                    border-left: 3px solid var(--primary);
                    background: linear-gradient(to bottom right, var(--bg-card), var(--bg-active));
                }

                .note-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 8px; 
                }
                .note-title-text {
                    font-weight: 600;
                    font-size: 0.95rem;
                    color: var(--text-primary);
                    flex: 1;
                    padding-right: 8px;
                    word-break: break-word;
                }
                .note-actions {
                    display: flex;
                    gap: 2px;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .note-card:hover .note-actions {
                    opacity: 1;
                }
                .icon-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 2px 4px;
                    border-radius: 4px;
                    font-size: 1rem;
                    color: var(--text-muted);
                    transition: all 0.2s;
                }
                .icon-btn:hover {
                    background: var(--bg-hover);
                    color: var(--text-primary);
                }
                .delete-btn:hover {
                    color: var(--danger);
                }

                .note-content-preview {
                    flex: 1;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    overflow: hidden;
                    line-height: 1.4;
                }
                .markdown-preview p {
                    margin: 0;
                }

                /* Compact Checklist Styles */
                .checklist-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    padding: 2px 0;
                    cursor: pointer;
                    border-radius: 3px;
                }
                .checklist-item:hover {
                    background: var(--bg-hover);
                }
                .checklist-box {
                    width: 16px;
                    height: 16px;
                    border: 1.5px solid var(--text-muted);
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: white;
                    flex-shrink: 0;
                    margin-top: 2px;
                    transition: all 0.2s;
                }
                .checklist-box.checked {
                    background: var(--primary);
                    border-color: var(--primary);
                }
                .checklist-content {
                    color: var(--text-primary);
                    word-break: break-word;
                }
                .checked-text {
                    text-decoration: line-through;
                    color: var(--text-muted);
                    opacity: 0.7;
                }
                .checklist-text {
                    margin-bottom: 4px; 
                    font-style: italic;
                }
                .more-items {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-top: 4px;
                }

                .note-tags {
                    margin-top: 12px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .note-tag {
                    font-size: 0.75rem;
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    padding: 2px 8px;
                    border-radius: 12px;
                }
                
                .notes-empty {
                    width: 100%;
                    text-align: center;
                    padding: 40px;
                    color: var(--text-muted);
                }
            `}</style>
        </div>
    );
};

export default QuickNotes;
