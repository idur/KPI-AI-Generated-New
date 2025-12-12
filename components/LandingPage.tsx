import React from 'react';
import { Sparkles, Zap, Target, TrendingUp, CheckCircle2, ArrowRight, Users, Clock, BarChart3, Shield, Rocket, Star, LogIn } from 'lucide-react';

interface LandingPageProps {
    onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
                    <div className="text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Sparkles className="w-4 h-4" />
                            <span>AI-Powered KPI Generation</span>
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            Generate KPI Library
                            <br />
                            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                in Seconds, Not Days
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                            Transform job descriptions into comprehensive, balanced scorecard KPIs using advanced AI.
                            Save hundreds of hours and ensure strategic alignment across your organization.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                            <button
                                onClick={onGetStarted}
                                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="relative flex items-center gap-2">
                                    Start Generating KPIs Free
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>

                            <button
                                onClick={onGetStarted}
                                className="px-8 py-4 bg-white text-slate-700 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-slate-200 flex items-center gap-2"
                            >
                                <LogIn className="w-5 h-5" />
                                Login
                            </button>
                        </div>

                        {/* Social Proof */}
                        <div className="flex items-center justify-center gap-6 text-sm text-slate-600 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white"></div>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 border-2 border-white"></div>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white"></div>
                                </div>
                                <span className="font-semibold">500+ HR Professionals</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                ))}
                                <span className="ml-1 font-semibold">4.9/5 Rating</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 bg-white/50 backdrop-blur-sm border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">10x</div>
                            <div className="text-slate-600 font-medium">Faster KPI Creation</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-indigo-600 mb-2">95%</div>
                            <div className="text-slate-600 font-medium">Time Saved</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-purple-600 mb-2">100+</div>
                            <div className="text-slate-600 font-medium">KPIs Generated Daily</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-pink-600 mb-2">24/7</div>
                            <div className="text-slate-600 font-medium">AI Availability</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                            Why Choose Our KPI Generator?
                        </h2>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                            Powerful features designed to transform your performance management process
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-slate-100">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Zap className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Lightning Fast Generation</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Generate comprehensive KPIs in seconds. What used to take days now takes minutes with our AI-powered engine.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-slate-100">
                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Target className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Balanced Scorecard Framework</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Automatically categorize KPIs across Financial, Customer, Internal Process, and Learning & Growth perspectives.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-slate-100">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Bulk Processing</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Upload CSV files to generate KPIs for multiple roles simultaneously. Perfect for organization-wide rollouts.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-slate-100">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BarChart3 className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Analytics</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Get insights on target audiences, measurement challenges, and data sources for each KPI automatically.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-slate-100">
                            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Clock className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Save to Library</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Build your organizational KPI library. Save, edit, and reuse KPIs across different projects and teams.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-slate-100">
                            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Shield className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Language Support</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Generate KPIs in Indonesian or English. Perfect for multinational organizations and diverse teams.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                            How It Works
                        </h2>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                            Three simple steps to transform your performance management
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Step 1 */}
                        <div className="relative">
                            <div className="absolute -top-4 -left-4 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                                1
                            </div>
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 pt-12">
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">Input Job Description</h3>
                                <p className="text-slate-600 leading-relaxed mb-6">
                                    Simply paste a job description, upload a PDF, or use our CSV template for bulk processing.
                                </p>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <code className="text-sm text-slate-700">Marketing Manager, responsible for...</code>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative">
                            <div className="absolute -top-4 -left-4 w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                                2
                            </div>
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 pt-12">
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">AI Generates KPIs</h3>
                                <p className="text-slate-600 leading-relaxed mb-6">
                                    Our advanced AI analyzes the role and creates balanced, comprehensive KPIs with formulas and metrics.
                                </p>
                                <div className="flex items-center gap-2 text-blue-600">
                                    <Rocket className="w-5 h-5 animate-bounce" />
                                    <span className="font-semibold">Processing with AI...</span>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative">
                            <div className="absolute -top-4 -left-4 w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                                3
                            </div>
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 pt-12">
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">Export & Implement</h3>
                                <p className="text-slate-600 leading-relaxed mb-6">
                                    Download to Excel, PDF, or save to your library. Ready to implement immediately in your organization.
                                </p>
                                <div className="flex gap-2">
                                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Excel</div>
                                    <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">PDF</div>
                                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">CSV</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                                Transform Your Performance Management
                            </h2>
                            <p className="text-xl text-slate-600 mb-8">
                                Stop wasting time on manual KPI creation. Focus on what matters - driving performance and achieving strategic goals.
                            </p>

                            <div className="space-y-4">
                                {[
                                    'Reduce KPI creation time by 95%',
                                    'Ensure strategic alignment across all levels',
                                    'Maintain consistency with Balanced Scorecard framework',
                                    'Scale performance management effortlessly',
                                    'Access your KPI library anytime, anywhere'
                                ].map((benefit, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-lg text-slate-700">{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-3xl blur-3xl"></div>
                            <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-slate-200">
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <TrendingUp className="w-5 h-5 text-blue-600" />
                                            <span className="font-semibold text-slate-900">Financial Perspective</span>
                                        </div>
                                        <p className="text-sm text-slate-600">Revenue Growth Rate: (Current - Previous) / Previous × 100%</p>
                                    </div>
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Users className="w-5 h-5 text-purple-600" />
                                            <span className="font-semibold text-slate-900">Customer Perspective</span>
                                        </div>
                                        <p className="text-sm text-slate-600">Customer Satisfaction Score: Total Points / Max Points × 100%</p>
                                    </div>
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <BarChart3 className="w-5 h-5 text-green-600" />
                                            <span className="font-semibold text-slate-900">Internal Process</span>
                                        </div>
                                        <p className="text-sm text-slate-600">Process Efficiency: Output / Input × 100%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>

                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Ready to Transform Your KPI Process?
                    </h2>
                    <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
                        Join hundreds of HR professionals who are already saving time and improving performance management with our AI-powered solution.
                    </p>

                    <button
                        onClick={onGetStarted}
                        className="group px-10 py-5 bg-white text-blue-600 rounded-xl font-bold text-xl shadow-2xl hover:shadow-3xl transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-3"
                    >
                        <span>Start Generating KPIs Now</span>
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </button>

                    <p className="mt-6 text-blue-100 text-sm">
                        No credit card required • Free to start • Instant access
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-sm">
                        © 2025 KPI Library Generator. Powered by <a href='http://betterandco.com' target='_blank' rel='noopener noreferrer' >Better&Co.</a>.
                    </p>
                </div>
            </footer>
        </div>
    );
};
