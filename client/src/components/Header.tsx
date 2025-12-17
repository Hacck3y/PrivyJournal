import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="header">
            <div className="header-content">
                <h1 className="logo">
                    <span className="logo-icon">📔</span>
                    Journal
                </h1>
                {user && (
                    <div className="user-info">
                        <span className="username">Hello, {user.username}</span>
                        <button onClick={handleLogout} className="btn btn-logout">
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
