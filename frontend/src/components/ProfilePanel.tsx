import './ProfilePanel.css';
import { useEffect, useState } from 'react';

export type ProfileForm = {
    name: string;
    email?: string;
    role: string;
};

interface ProfilePanelProps {
    open: boolean;
    userName?: string;
    userEmail?: string;
    userRole?: string | null;
    onClose: () => void;
    onSave: (payload: { name?: string; role?: string }) => Promise<void> | void;
}

export function ProfilePanel({ open, userName, userEmail, userRole, onClose, onSave }: ProfilePanelProps) {
    const [name, setName] = useState(userName || '');
    const [role, setRole] = useState(userRole || 'student');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setName(userName || '');
        setRole(userRole || 'student');
        setError('');
    }, [userName, userRole, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await onSave({ name: name.trim() || undefined, role: role || undefined });
            onClose();
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err?.message;
            setError(detail || 'Could not save right now. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`profile-panel-backdrop ${open ? 'open' : ''}`} onClick={onClose}>
            <div className={`profile-panel ${open ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="profile-panel__header">
                    <div>
                        <p className="eyebrow">Account</p>
                        <h3>Profile</h3>
                        <p className="muted">Set how you want us to address you and who you’re browsing for.</p>
                    </div>
                    <button className="ghost" onClick={onClose}>✕</button>
                </div>

                <form className="profile-panel__body" onSubmit={handleSubmit}>
                    <label className="field">
                        <span>Name</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                        />
                    </label>

                    <label className="field">
                        <span>Email</span>
                        <input type="email" value={userEmail || ''} disabled placeholder="Not available" />
                    </label>

                    <div className="field">
                        <span>Role</span>
                        <div className="pill-group">
                            {['student', 'parent'].map((option) => (
                                <button
                                    type="button"
                                    key={option}
                                    className={`pill ${role === option ? 'active' : ''}`}
                                    onClick={() => setRole(option)}
                                >
                                    {option === 'student' ? 'Student' : 'Parent/Guardian'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="actions">
                        <div className="status-text">{error}</div>
                        <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancel</button>
                        <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}