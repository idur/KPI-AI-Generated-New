import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileDropdownProps {
    onOpenProfile: () => void;
}

import { Shield, ShieldCheck } from 'lucide-react';

const RoleBadge = () => {
    const [role, setRole] = useState<string>('loading...');

    useEffect(() => {
        const fetchRole = async () => {
            const { getTokenState } = await import('../../services/tokenServiceCloud');
            const state = await getTokenState();
            setRole(state.role || 'user');
        };
        fetchRole();
    }, []);

    if (role === 'admin') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wide">
                <ShieldCheck className="w-3 h-3" /> ADMIN ACCESS
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wide">
            USER ACCOUNT
        </span>
    );
};

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onOpenProfile }) => {
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    const meta = user.user_metadata || {};
    const displayName = meta.full_name || user.email?.split('@')[0] || 'User';
    const avatarUrl = meta.avatar_url;
    const email = user.email;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
            >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-sm font-bold text-brand-700">
                            {displayName.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>

                {/* Name & Chevron */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate hidden sm:block">
                        {displayName}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-slate-50">
                        <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                        <p className="text-xs text-slate-500 truncate">{email}</p>
                        <div className="mt-2">
                            <RoleBadge />
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onOpenProfile();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <User className="w-4 h-4 text-slate-400" />
                            Edit Profile
                        </button>

                        <div className="h-px bg-slate-100 my-1"></div>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                signOut();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
