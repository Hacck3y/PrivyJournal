import { useState, useEffect } from 'react';


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

interface EditNoteModalProps {
    isOpen: boolean;
    note: QuickNote | null;
    onClose: () => void;
    onSave: (id: number, updates: Partial<QuickNote>, currentTags: string) => Promise<void>;
}

const EditNoteModal = ({ isOpen, note, onClose, onSave }: EditNoteModalProps) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [type, setType] = useState<'text' | 'checklist'>('text');

    useEffect(() => {
        if (note) {
            setTitle(note.title || '');
            setContent(note.content || '');
            setType(note.type || 'text');
            try {
                const parsedTags = JSON.parse(note.tags || '[]');
                setTags(Array.isArray(parsedTags) ? parsedTags.join(', ') : '');
            } catch {
                setTags('');
            }
        }
    }, [note]);

    if (!isOpen || !note) return null;

    const handleSave = async () => {
        // Prepare tags array string logic if needed, but passing raw string to parent to handle or handling here
        // The parent expects 'currentTags' as string? Let's clarify interface. 
        // QuickNotes.tsx uses JSON.stringify for tags usually or server expects array?
        // Let's pass the raw string and let parent parse or we parse here.
        // Actually looking at QuickNotes handleAddNote:
        // const tagsArray = newTags.split(',').map(t => t.trim()).filter(t => t);
        // So we should probably pass the data needed.

        // Actually the onSave signature in props: (id, updates, currentTags)
        await onSave(note.id, { title, content, type }, tags);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content edit-note-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Note</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Note Title"
                            className="form-input"
                        />
                    </div>



                    <div className="form-group">
                        <label>Content</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Note content..."
                            className="form-textarea"
                            rows={8}
                        />
                    </div>

                    <div className="form-group">
                        <label>Tags (comma separated)</label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="work, idea, todo"
                            className="form-input"
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
                </div>
            </div>
            <style>{`
                .edit-note-modal {
                    width: 600px;
                    max-width: 95vw;
                }
                .type-toggle-modal {
                    display: flex;
                    background: var(--bg-input);
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-sm);
                    width: fit-content;
                    padding: 2px;
                }
                .type-toggle-modal button {
                    padding: 6px 16px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    border-radius: var(--radius-sm);
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }
                .type-toggle-modal button.active {
                    background: var(--bg-card);
                    color: var(--text-primary);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                .form-group {
                    margin-bottom: 16px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 6px;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                .form-input, .form-textarea {
                    width: 100%;
                    padding: 10px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                    background: var(--bg-input);
                    color: var(--text-primary);
                    font-family: inherit;
                }
                .form-textarea {
                    resize: vertical;
                    min-height: 100px;
                }
                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-primary);
                }
            `}</style>
        </div>
    );
};

export default EditNoteModal;
