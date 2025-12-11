import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Loader2, Mail, Lock, LogIn, UserPlus, X } from 'lucide-react';
import { LandingPage } from '../LandingPage';

export const Login: React.FC = () => {
    const [showLanding, setShowLanding] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (error) {
                    // Check if it's a "user already registered" error
                    if (error.message.includes('already registered') || error.message.includes('already exists')) {
                        setMessage({
                            type: 'error',
                            text: 'This email is already registered. Please sign in instead.'
                        });
                        // Automatically switch to sign in mode after 2 seconds
                        setTimeout(() => {
                            setIsSignUp(false);
                            setMessage(null);
                        }, 2000);
                    } else {
                        throw error;
                    }
                } else if (data.user && data.user.identities && data.user.identities.length === 0) {
                    // This means the email is already registered but not confirmed
                    setMessage({
                        type: 'error',
                        text: 'This email is already registered. Please sign in instead.'
                    });
                    setTimeout(() => {
                        setIsSignUp(false);
                        setMessage(null);
                    }, 2000);
                } else {
                    setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    // Show landing page first
    if (showLanding) {
        return <LandingPage onGetStarted={() => setShowLanding(false)} />;
    }

    // Show login/signup form
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative">
                {/* Back to Landing Button */}
                <button
                    onClick={() => setShowLanding(true)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Back to home"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-8">
                    <div className="bg-brand-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <LogIn className="w-6 h-6 text-brand-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p className="text-slate-500 mt-2">
                        {isSignUp ? 'Sign up to start generating KPIs' : 'Sign in to access your library'}
                    </p>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isSignUp ? (
                            <>
                                <UserPlus className="w-5 h-5" /> Sign Up
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" /> Sign In
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setMessage(null);
                        }}
                        className="text-sm text-slate-600 hover:text-brand-600 font-medium transition-colors"
                    >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};
