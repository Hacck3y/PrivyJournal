import { useState, useEffect, useRef } from 'react';
import api from '../api/api';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
}

const TagInput = ({ tags, onChange }: TagInputProps) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAllTags();
    }, []);

    const fetchAllTags = async () => {
        try {
            const response = await api.get('/tags');
            setAllTags(response.data);
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    };

    const handleInputChange = (value: string) => {
        setInputValue(value);

        if (value.trim()) {
            const filtered = allTags.filter(
                tag => tag.toLowerCase().includes(value.toLowerCase()) && !tags.includes(tag)
            );
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const addTag = (tag: string) => {
        const cleanTag = tag.replace(/^#/, '').trim().toLowerCase();
        if (cleanTag && !tags.includes(cleanTag)) {
            onChange([...tags, cleanTag]);
        }
        setInputValue('');
        setSuggestions([]);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    return (
        <div className="tag-input-wrapper">
            <div className="tag-input-container">
                {tags.map(tag => (
                    <span key={tag} className="tag-badge">
                        #{tag}
                        <button
                            type="button"
                            className="tag-remove"
                            onClick={() => removeTag(tag)}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    className="tag-input"
                    placeholder={tags.length === 0 ? "Add tags (e.g., work, ideas)" : ""}
                    value={inputValue}
                    onChange={e => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputValue && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="tag-suggestions">
                    {suggestions.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            className="tag-suggestion"
                            onClick={() => addTag(tag)}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagInput;
