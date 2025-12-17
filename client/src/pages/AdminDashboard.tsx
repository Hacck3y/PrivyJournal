import { useState, useEffect } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';

interface SystemStats {
    users: number;
    entries: number;
    habits: number;
    notes: number;
    storageMB: string;
}

interface User {
    id: number;
    username: string;
    entry_count: number;
    note_count: number;
    last_active: string | null;
}

const AdminDashboard = () => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, usersRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/users')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
        } catch (error: any) {
            console.error('Error fetching admin data:', error);
            if (error.response?.status === 403) {
                setAccessDenied(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        try {
            await api.delete(`/admin/users/${userId}`);
            // Refresh data
            fetchData();
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    if (loading) {
        return (
            <div className="admin-container" style={{ padding: '40px', textAlign: 'center' }}>
                <div className="loading-spinner"></div>
                <p>Loading Admin Dashboard...</p>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="admin-container glass-panel animate-fade-in" style={{ padding: '60px', textAlign: 'center', maxWidth: '500px', margin: '100px auto', borderRadius: 'var(--radius-xl)' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚫</div>
                <h1 style={{ marginBottom: '16px' }}>Access Denied</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>You are not an admin. Only authorized users can access this page.</p>
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                    ← Go Back Home
                </button>
            </div>
        );
    }

    return (
        <div className="admin-dashboard animate-fade-in" style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <header className="admin-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="gradient-text">Admin Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>System Overview & User Management</p>
                </div>
                <button className="btn btn-secondary" onClick={() => navigate('/')}>
                    ← Back to App
                </button>
            </header>

            {/* Stats Grid */}
            <div className="stats-grid stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <div className="stat-card glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div className="stat-icon" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>👥</div>
                    <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.users}</div>
                    <div className="stat-label" style={{ color: 'var(--text-secondary)' }}>Total Users</div>
                </div>
                <div className="stat-card glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div className="stat-icon" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📝</div>
                    <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.entries}</div>
                    <div className="stat-label" style={{ color: 'var(--text-secondary)' }}>Total Entries</div>
                </div>
                <div className="stat-card glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div className="stat-icon" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💾</div>
                    <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.storageMB} <span style={{ fontSize: '1rem' }}>MB</span></div>
                    <div className="stat-label" style={{ color: 'var(--text-secondary)' }}>Data Stored</div>
                </div>

            </div>

            {/* Users Table */}
            <section className="users-section glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                <h2 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>User Management</h2>

                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>ID</th>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Username</th>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Entries</th>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Notes</th>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Last Active</th>
                                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                                    <td style={{ padding: '16px 12px' }}>#{user.id}</td>
                                    <td style={{ padding: '16px 12px', fontWeight: '600' }}>{user.username}</td>
                                    <td style={{ padding: '16px 12px' }}>{user.entry_count}</td>
                                    <td style={{ padding: '16px 12px' }}>{user.note_count}</td>
                                    <td style={{ padding: '16px 12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        {user.last_active ? new Date(user.last_active).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                        {deleteConfirm === user.id ? (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => setDeleteConfirm(null)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                className="btn btn-ghost"
                                                style={{ color: 'var(--error)' }}
                                                onClick={() => setDeleteConfirm(user.id)}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default AdminDashboard;
