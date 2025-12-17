import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onNewEntry: () => void;
    onSearchClick: () => void;
    onSettingsClick: () => void;
    streak?: { current: number; longest: number };
}

const Sidebar = ({ activeTab, onTabChange, onNewEntry, onSearchClick, onSettingsClick, streak }: SidebarProps) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="sidebar glass-panel">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    SecureJournal
                </div>
            </div>

            <nav className="sidebar-nav">
                {/* Streak Display */}
                {streak && streak.current > 0 && (
                    <div className="streak-display">
                        <span className="streak-icon">🔥</span>
                        <span className="streak-count">{streak.current}</span>
                        <span className="streak-label">day streak</span>
                    </div>
                )}

                {/* Search Button */}
                <button className="search-trigger" onClick={onSearchClick}>
                    <span>🔍</span>
                    Search entries...
                    <span className="shortcut">Ctrl+K</span>
                </button>

                <div className="sidebar-section">
                    <div className="sidebar-section-title">Menu</div>

                    <button
                        className={`nav-item ${activeTab === 'today' ? 'active' : ''}`}
                        onClick={() => onTabChange('today')}
                    >
                        <span className="icon">📅</span>
                        Today
                    </button>

                    <button
                        className={`nav-item ${activeTab === 'journals' ? 'active' : ''}`}
                        onClick={() => onTabChange('journals')}
                    >
                        <span className="icon">📔</span>
                        Journals
                    </button>

                    <button
                        className={`nav-item ${activeTab === 'habits' ? 'active' : ''}`}
                        onClick={() => onTabChange('habits')}
                    >
                        <span className="icon">🎯</span>
                        Habits
                    </button>

                    <button
                        className={`nav-item ${activeTab === 'notes' ? 'active' : ''}`}
                        onClick={() => onTabChange('notes')}
                    >
                        <span className="icon">📝</span>
                        Notes
                    </button>

                    <button
                        className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`}
                        onClick={() => onTabChange('insights')}
                    >
                        <span className="icon">✨</span>
                        Insights
                    </button>
                </div>

                <div className="sidebar-cta">
                    <button className="btn btn-new-entry" onClick={onNewEntry}>
                        <span>✍️</span>
                        Write Now
                    </button>
                </div>
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile-mini">
                    <div className="avatar-placeholder">{user?.username.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                        <div className="user-name">{user?.username}</div>
                        <div className="user-plan">Pro Member</div>
                    </div>
                </div>
                <button className="nav-item" onClick={() => navigate('/admin')}>
                    <span className="icon">🛡️</span>
                    Admin
                </button>
                <button className="nav-item" onClick={onSettingsClick}>
                    <span className="icon">⚙️</span>
                    Settings
                </button>
                <button className="nav-item signout" onClick={handleLogout}>
                    <span className="icon">🚪</span>
                    Sign Out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
