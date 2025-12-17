import { useState, useEffect, useCallback } from 'react';
import api from '../api/api';

interface Entry {
    id: number;
    entry_date: string;
    content: string;
    tags: string[];
    mood: number | null;
    created_at: string;
}

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectEntry: (entry: Entry) => void;
}

const SearchModal = ({ isOpen, onClose, onSelectEntry }: SearchModalProps) => {
    const [query, setQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [results, setResults] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch all tags on mount
    useEffect(() => {
        if (isOpen) {
            fetchTags();
        }
    }, [isOpen]);

    // Search when query or tags change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query || selectedTags.length > 0) {
                performSearch();
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, selectedTags]);

    // Handle keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (!isOpen) {
                    // This would need to be lifted to parent
                }
            }
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const fetchTags = async () => {
        try {
            const response = await api.get('/tags');
            setAllTags(response.data);
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    };

    const performSearch = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));

            const response = await api.get(`/search?${params.toString()}`);
            setResults(response.data);
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setLoading(false);
        }
    }, [query, selectedTags]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getExcerpt = (content: string, maxLength = 100) => {
        const text = content.replace(/[#>*\-`]/g, '').trim();
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    if (!isOpen) return null;

    return (
        <div className="search-modal-overlay" onClick={onClose}>
            <div className="search-modal" onClick={e => e.stopPropagation()}>
                <div className="search-header">
                    <div className="search-input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search entries..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                        />
                        <kbd className="search-shortcut">ESC</kbd>
                    </div>
                </div>

                {allTags.length > 0 && (
                    <div className="search-tags">
                        <span className="search-tags-label">Filter by tags:</span>
                        <div className="search-tags-list">
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    className={`search-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                                    onClick={() => toggleTag(tag)}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="search-results">
                    {loading ? (
                        <div className="search-loading">
                            <div className="loading-spinner"></div>
                            <p>Searching...</p>
                        </div>
                    ) : results.length > 0 ? (
                        results.map(entry => (
                            <div
                                key={entry.id}
                                className="search-result-item"
                                onClick={() => {
                                    onSelectEntry(entry);
                                    onClose();
                                }}
                            >
                                <div className="search-result-date">{formatDate(entry.entry_date)}</div>
                                <div className="search-result-content">{getExcerpt(entry.content)}</div>
                                {entry.tags.length > 0 && (
                                    <div className="search-result-tags">
                                        {entry.tags.map(tag => (
                                            <span key={tag} className="tag-badge">#{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : query || selectedTags.length > 0 ? (
                        <div className="search-empty">
                            <p>No entries found</p>
                        </div>
                    ) : (
                        <div className="search-empty">
                            <p>Start typing to search your entries</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchModal;
