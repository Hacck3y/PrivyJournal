interface MoodSelectorProps {
    mood: number | null;
    onChange: (mood: number | null) => void;
}

const moods = [
    { value: 1, emoji: '😢', label: 'Terrible' },
    { value: 2, emoji: '😔', label: 'Bad' },
    { value: 3, emoji: '😐', label: 'Okay' },
    { value: 4, emoji: '😊', label: 'Good' },
    { value: 5, emoji: '🤩', label: 'Amazing' }
];

const MoodSelector = ({ mood, onChange }: MoodSelectorProps) => {
    return (
        <div className="mood-selector">
            <span className="mood-label">How are you feeling?</span>
            <div className="mood-options">
                {moods.map(m => (
                    <button
                        key={m.value}
                        type="button"
                        className={`mood-btn ${mood === m.value ? 'active' : ''}`}
                        onClick={() => onChange(mood === m.value ? null : m.value)}
                        title={m.label}
                    >
                        <span className="mood-emoji">{m.emoji}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MoodSelector;
