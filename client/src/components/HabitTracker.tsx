import { useState, useEffect } from 'react';
import api from '../api/api';
import ConfirmModal from './ConfirmModal';

interface Habit {
    id: number;
    name: string;
    icon: string;
    color: string;
    category: string;
    completed_today: boolean;
    streak: number;
    target_count: number;
    frequency_days: string; // JSON string
}

interface HabitHistory {
    date: string;
    completed: boolean;
}

const CATEGORIES = ['Health', 'Work', 'Learning', 'Mindfulness', 'General'];
const Frequencies = [
    { label: 'Every Day', value: [0, 1, 2, 3, 4, 5, 6] },
    { label: 'Weekdays', value: [1, 2, 3, 4, 5] },
    { label: 'Weekends', value: [0, 6] },
];

const HabitTracker = () => {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Form State
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState('General');
    const [newFrequency, setNewFrequency] = useState(Frequencies[0].value);
    const [selectedIcon, setSelectedIcon] = useState('✅');

    // Stats Modal State
    const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
    const [habitHistory, setHabitHistory] = useState<HabitHistory[]>([]);

    // Insights State
    const [view, setView] = useState<'list' | 'insights'>('list');
    const [insights, setInsights] = useState<any>(null);
    const [insightRange, setInsightRange] = useState('month');

    // Delete Confirmation
    const [showConfirm, setShowConfirm] = useState(false);
    const [habitToDelete, setHabitToDelete] = useState<number | null>(null);

    useEffect(() => {
        fetchHabits();
        if (view === 'insights') {
            fetchInsights();
        }
    }, [view, insightRange]);

    const fetchHabits = async () => {
        try {
            const response = await api.get('/habits');
            setHabits(response.data);
        } catch (error) {
            console.error('Error fetching habits:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (habitId: number) => {
        try {
            const response = await api.get(`/habits/${habitId}/history?days=30`);
            setHabitHistory(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const fetchInsights = async () => {
        try {
            const response = await api.get(`/habits/insights?range=${insightRange}`);
            setInsights(response.data);
        } catch (error) {
            console.error('Error fetching insights:', error);
        }
    };

    const handleAddHabit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            await api.post('/habits', {
                name: newName,
                category: newCategory,
                icon: selectedIcon,
                frequency_days: newFrequency
            });
            setNewName('');
            setShowAdd(false);
            fetchHabits();
        } catch (error) {
            console.error('Error adding habit:', error);
        }
    };

    const handleToggle = async (habitId: number) => {
        try {
            // Optimistic update
            setHabits(prev => prev.map(h =>
                h.id === habitId ? { ...h, completed_today: !h.completed_today, streak: h.completed_today ? h.streak : h.streak + 1 } : h
            ));

            await api.post(`/habits/${habitId}/toggle`, {});
            fetchHabits(); // Recalculate strict streak from backend
        } catch (error) {
            console.error('Error toggling habit:', error);
            fetchHabits(); // Revert
        }
    };

    const requestDelete = (habitId: number) => {
        setHabitToDelete(habitId);
        setShowConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!habitToDelete) return;
        try {
            await api.delete(`/habits/${habitToDelete}`);
            setSelectedHabitId(null);
            setShowConfirm(false);
            setHabitToDelete(null);
            fetchHabits();
        } catch (error) {
            console.error('Error deleting habit:', error);
        }
    };

    const openStats = (habit: Habit) => {
        setSelectedHabitId(habit.id);
        fetchHistory(habit.id);
    };

    // Group habits by category
    const groupedHabits = habits.reduce((acc, habit) => {
        const cat = habit.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(habit);
        return acc;
    }, {} as Record<string, Habit[]>);

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="habit-tracker">
            <div className="habit-header">
                <h3>🎯 Daily Habits</h3>
                <div className="header-actions">
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${view === 'list' ? 'active' : ''}`}
                            onClick={() => setView('list')}
                        >
                            List
                        </button>
                        <button
                            className={`toggle-btn ${view === 'insights' ? 'active' : ''}`}
                            onClick={() => setView('insights')}
                        >
                            Insights
                        </button>
                    </div>
                    {view === 'list' && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowAdd(!showAdd)}
                        >
                            {showAdd ? '✕ Close' : '+ New Habit'}
                        </button>
                    )}
                </div>
            </div>

            {view === 'insights' && insights && (
                <div className="habit-insights animate-slide-in">
                    <div className="insights-filters">
                        {(['today', 'week', 'month', 'year', 'all'] as const).map(range => (
                            <button
                                key={range}
                                className={`filter-btn ${insightRange === range ? 'active' : ''}`}
                                onClick={() => setInsightRange(range)}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">✅</div>
                            <div className="stat-value">{insights.totalCompletions}</div>
                            <div className="stat-label">Total Check-ins</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📅</div>
                            <div className="stat-value">{insights.bestDay}</div>
                            <div className="stat-label">Best Day</div>
                        </div>
                    </div>

                    <div className="insights-section">
                        <h4>🏆 Consistency Leaderboard</h4>
                        <div className="habit-leaderboard">
                            {insights.habitStats.map((stat: any, index: number) => (
                                <div key={stat.id} className="leaderboard-item">
                                    <div className="rank">{index + 1}</div>
                                    <div className="habit-info">
                                        <span className="habit-icon">{stat.icon}</span>
                                        <span className="habit-name">{stat.name}</span>
                                    </div>
                                    <div className="habit-score">
                                        <div className="score-bar-bg">
                                            <div
                                                className="score-bar-fill"
                                                style={{ width: `${stat.rate}%` }}
                                            ></div>
                                        </div>
                                        <span className="score-text">{stat.rate}% ({stat.completionCount})</span>
                                    </div>
                                </div>
                            ))}
                            {insights.habitStats.length === 0 && <p className="text-muted">No habits tracked yet.</p>}
                        </div>
                    </div>
                </div>
            )}

            {view === 'list' && showAdd && (
                <form onSubmit={handleAddHabit} className="habit-add-form animate-slide-down">
                    <div className="form-row">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Habit name (e.g., Read 30 mins)"
                            className="habit-input"
                            autoFocus
                        />
                        <select
                            value={selectedIcon}
                            onChange={e => setSelectedIcon(e.target.value)}
                            className="icon-select"
                        >
                            <option value="✅">✅</option>
                            <option value="💧">💧</option>
                            <option value="🏃">🏃</option>
                            <option value="📚">📚</option>
                            <option value="🧘">🧘</option>
                            <option value="💊">💊</option>
                            <option value="💰">💰</option>
                            <option value="🧹">🧹</option>
                        </select>
                    </div>

                    <div className="form-row">
                        <label>Category:</label>
                        <select
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            className="category-select"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="form-row">
                        <label>Frequency:</label>
                        <div className="frequency-options">
                            {Frequencies.map((f, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className={`freq-btn ${JSON.stringify(newFrequency) === JSON.stringify(f.value) ? 'active' : ''}`}
                                    onClick={() => setNewFrequency(f.value)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary full-width">Start Tracking</button>
                </form>
            )}

            {view === 'list' && Object.keys(groupedHabits).length === 0 ? (
                <div className="habit-empty">
                    <p>No habits yet. Start small!</p>
                </div>
            ) : (
                <div className="habit-groups">
                    {Object.entries(groupedHabits).map(([category, categoryHabits]) => (
                        <div key={category} className="habit-category">
                            <h4 className="category-title">{category}</h4>
                            <div className="habit-list stagger-children">
                                {categoryHabits.map(habit => (
                                    <div key={habit.id} className="habit-card">
                                        <div className="habit-main">
                                            <button
                                                className={`habit-check ${habit.completed_today ? 'checked' : ''}`}
                                                onClick={() => handleToggle(habit.id)}
                                            >
                                                {habit.completed_today ? '✓' : ''}
                                            </button>
                                            <div className="habit-info" onClick={() => openStats(habit)}>
                                                <span className="habit-name">{habit.icon} {habit.name}</span>
                                                <div className="habit-meta">
                                                    <span className="fire-streak">🔥 {habit.streak}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Mini Heatmap Visualization (Placeholder for now, simplified) */}
                                        <div className="mini-heatmap" title="Consistency this week">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`heatmap-dot ${i > 2 ? 'filled' : ''}`}></div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats Modal */}
            {selectedHabitId && (
                <div className="modal-overlay" onClick={() => setSelectedHabitId(null)}>
                    <div className="modal-content habit-stats-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Habit Stats</h3>
                            <button className="modal-close" onClick={() => setSelectedHabitId(null)}>×</button>
                        </div>
                        <div className="stats-content">
                            {/* Calendar Visualization would go here */}
                            <div className="calendar-grid">
                                {habitHistory.map((day, i) => (
                                    <div
                                        key={i}
                                        className={`calendar-day ${day.completed ? 'completed' : ''}`}
                                        title={day.date}
                                    >
                                        {day.completed ? '✓' : ''}
                                    </div>
                                ))}
                            </div>
                            <div className="stats-summary">
                                <div>Total: <strong>{habitHistory.filter(h => h.completed).length}</strong></div>
                                <div>Last 30 Days</div>
                            </div>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    requestDelete(selectedHabitId!);
                                    // Don't close modal here immediately, confirm first.
                                    // Actually requestDelete opens confirmation, so we just wait.
                                    // But ConfirmModal is z-indexed? 
                                    // We might want to close stats modal if we delete.
                                    // Yes, requestDelete sets showConfirm.
                                }}
                                style={{ marginTop: 20 }}
                            >
                                Delete Habit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Habit"
                message="Are you sure you want to delete this habit? This cannot be undone."
                confirmText="Delete"
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowConfirm(false)}
            />

            <style>{`
                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .view-toggle {
                    display: flex;
                    background: var(--bg-secondary);
                    padding: 4px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                }
                .toggle-btn {
                    padding: 4px 12px;
                    border: none;
                    background: none;
                    font-size: 0.85rem;
                    cursor: pointer;
                    border-radius: var(--radius-sm);
                    color: var(--text-secondary);
                }
                .toggle-btn.active {
                    background: var(--bg-card);
                    color: var(--text-primary);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }

                .insights-filters {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                .filter-btn {
                    padding: 4px 12px;
                    border: 1px solid var(--border-primary);
                    background: var(--bg-card);
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    transition: all 0.2s;
                }
                .filter-btn:hover {
                    background: var(--bg-hover);
                }
                .filter-btn.active {
                    background: var(--accent-primary);
                    color: white;
                    border-color: var(--accent-primary);
                }
                
                /* Insights Styles */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .stat-card {
                    background: var(--bg-card);
                    padding: 16px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                    text-align: center;
                }
                .stat-icon { font-size: 24px; margin-bottom: 8px; }
                .stat-value { font-size: 24px; font-weight: bold; color: var(--text-primary); }
                .stat-label { font-size: 0.85rem; color: var(--text-muted); }

                .habit-leaderboard {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .leaderboard-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: var(--bg-card);
                    padding: 12px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                }
                .rank {
                    width: 24px;
                    height: 24px;
                    background: var(--bg-secondary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 0.8rem;
                }
                .leaderboard-item:nth-child(1) .rank { background: #FFD700; color: #000; }
                .leaderboard-item:nth-child(2) .rank { background: #C0C0C0; color: #000; }
                .leaderboard-item:nth-child(3) .rank { background: #CD7F32; color: #000; }

                .habit-info { flex: 1; display: flex; gap: 8px; align-items: center; }
                .habit-score { width: 150px; text-align: right; }
                .score-bar-bg {
                    height: 6px;
                    background: var(--bg-secondary);
                    border-radius: 3px;
                    margin-bottom: 4px;
                    overflow: hidden;
                }
                .score-bar-fill {
                    height: 100%;
                    background: var(--accent-primary);
                }
                .score-text { font-size: 0.8rem; color: var(--text-muted); }

                .habit-groups {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .category-title {
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-muted);
                    margin-bottom: 12px;
                    border-bottom: 1px solid var(--border-primary);
                    padding-bottom: 4px;
                }
                .habit-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 12px;
                }
                .habit-card {
                    background: var(--bg-card);
                    padding: 16px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .habit-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .habit-main {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .habit-check {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 2px solid var(--border-secondary);
                    background: none;
                    color: white;
                    font-size: 1.2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .habit-check:hover {
                    border-color: var(--accent-primary);
                }
                .habit-check.checked {
                    background: var(--accent-primary);
                    border-color: var(--accent-primary);
                    animation: checkBounce 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
                }
                .habit-info {
                    cursor: pointer;
                }
                .habit-name {
                    font-weight: 600;
                    display: block;
                }
                .habit-meta {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .mini-heatmap {
                    display: flex;
                    gap: 3px;
                }
                .heatmap-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 2px;
                    background: var(--bg-secondary);
                }
                .heatmap-dot.filled {
                    background: var(--accent-primary);
                    opacity: 0.6;
                }
                
                /* Form Styles */
                .habit-add-form {
                    background: var(--bg-secondary);
                    padding: 20px;
                    border-radius: var(--radius-md);
                    margin-bottom: 30px;
                    border: 1px solid var(--border-primary);
                }
                .form-row {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 16px;
                    align-items: center;
                }
                .form-row label {
                    min-width: 80px;
                    font-weight: 500;
                }
                .habit-input {
                    flex: 1;
                    padding: 10px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                    background: var(--bg-input);
                    color: var(--text-primary);
                }
                .icon-select, .category-select {
                    padding: 10px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-primary);
                    background: var(--bg-input);
                    color: var(--text-primary);
                }
                .frequency-options {
                    display: flex;
                    gap: 8px;
                }
                .freq-btn {
                    padding: 6px 12px;
                    border-radius: 20px;
                    border: 1px solid var(--border-primary);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-size: 0.85rem;
                }
                .freq-btn.active {
                    background: var(--accent-primary);
                    color: white;
                    border-color: var(--accent-primary);
                }
                .full-width {
                    width: 100%;
                }

                /* Stats Modal */
                .habit-stats-modal {
                    width: 400px;
                    max-width: 90%;
                }
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 6px;
                    margin: 20px 0;
                }
                .calendar-day {
                    aspect-ratio: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-secondary);
                    border-radius: 4px;
                    font-size: 0.8rem;
                }
                .calendar-day.completed {
                    background: var(--accent-muted);
                    color: var(--accent-primary);
                    font-weight: bold;
                }
            `}</style>
        </div>
    );
};

export default HabitTracker;
