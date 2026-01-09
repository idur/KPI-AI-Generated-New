import React from 'react';
import { Target, Zap, Users, ArrowRight, Database } from 'lucide-react';

interface LandingPageProps {
    onNavigateToLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand-600 p-2 rounded-lg">
                            <Database className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">
                            Library <span className="text-brand-600">KPI</span>
                        </h1>
                    </div>
                    <button
                        onClick={onNavigateToLogin}
                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-brand-600/20"
                    >
                        Login
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                <div className="inline-block mb-4 px-4 py-2 bg-brand-100 text-brand-700 rounded-full text-sm font-semibold">
                    🤖 AI-Powered KPI Generation
                </div>
                <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
                    Generate KPI Library<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        in Seconds, Not Days
                    </span>
                </h2>
                <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
                    Transform job descriptions into comprehensive, balanced scorecard KPIs using advanced AI.
                    Save hundreds of hours and ensure strategic alignment across your organization.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={onNavigateToLogin}
                        className="flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-lg transition-all shadow-xl shadow-brand-600/30 hover:scale-105"
                    >
                        Start Generating KPIs Free
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Social Proof */}
                <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-brand-600" />
                        <span><strong>500+</strong> HR Professionals</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-500">⭐⭐⭐⭐⭐</span>
                        <span><strong>4.9/5</strong> Rating</span>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-2">10x</div>
                        <div className="text-slate-600">Faster KPI Creation</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-green-600 mb-2">95%</div>
                        <div className="text-slate-600">Time Saved</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-purple-600 mb-2">100+</div>
                        <div className="text-slate-600">KPIs Generated Daily</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-pink-600 mb-2">24/7</div>
                        <div className="text-slate-600">AI Availability</div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h3 className="text-3xl font-bold text-center text-slate-900 mb-4">
                    Why Choose Our KPI Generator?
                </h3>
                <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
                    Powerful features designed to transform your performance management process
                </p>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                            <Zap className="w-6 h-6 text-blue-600" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mb-3">Lightning Fast Generation</h4>
                        <p className="text-slate-600">
                            Generate comprehensive KPIs in seconds. What used to take days now takes minutes with our AI-powered engine.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                            <Target className="w-6 h-6 text-purple-600" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mb-3">Balanced Scorecard Framework</h4>
                        <p className="text-slate-600">
                            Automatically categorize KPIs across Financial, Customer, Internal Process, and Learning & Growth perspectives.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mb-3">Bulk Processing</h4>
                        <p className="text-slate-600">
                            Upload CSV files to generate KPIs for multiple roles simultaneously. Perfect for organization-wide rollouts.
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-12 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="bg-brand-600 p-2 rounded-lg">
                            <Target className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold">Library KPI</span>
                    </div>
                    <p className="text-slate-400 mb-4">
                        AI-Powered KPI Generation for Modern Organizations
                    </p>
                    <p className="text-sm text-slate-500">
                        Powered by <a href="http://betterandco.com" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">Better&Co.</a>
                    </p>
                </div>
            </footer>
        </div>
    );
};
