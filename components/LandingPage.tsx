import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap, Layers, Shield, Globe } from 'lucide-react';
import { APP_CONFIG } from '../constants';

interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    size: number; color: string;
    alpha: number; baseAlpha: number;
}

interface SplatFlash {
    x: number; y: number;
    radius: number; maxRadius: number;
    alpha: number; color: string;
    decay: number;
}

const LandingPage: React.FC = () => {
    const { login, signup, loginWithGoogle, loginAsDemo, error, clearError, loading } = useAuth();
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });

    // Mouse-responsive particle + gaussian splatting flash effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const particles: Particle[] = [];
        const flashes: SplatFlash[] = [];
        let lastFlashTime = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handleMouseMove);

        const colors = ['#06b6d4', '#d946ef', '#eab308', '#22d3ee', '#f0abfc', '#a3e635'];

        // Initialize particles
        const particleCount = Math.min(100, Math.floor(window.innerWidth * 0.06));
        for (let i = 0; i < particleCount; i++) {
            const baseAlpha = Math.random() * 0.4 + 0.1;
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2.5 + 0.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: baseAlpha,
                baseAlpha,
            });
        }

        // Spawn gaussian splat flash
        const spawnFlash = (x: number, y: number) => {
            const splatColors = [
                'rgba(6,182,212,', 'rgba(217,70,239,', 'rgba(234,179,8,',
                'rgba(163,230,53,', 'rgba(240,171,252,', 'rgba(34,211,238,'
            ];
            flashes.push({
                x: x + (Math.random() - 0.5) * 80,
                y: y + (Math.random() - 0.5) * 80,
                radius: 0,
                maxRadius: Math.random() * 60 + 30,
                alpha: Math.random() * 0.25 + 0.1,
                color: splatColors[Math.floor(Math.random() * splatColors.length)],
                decay: Math.random() * 0.008 + 0.004,
            });
        };

        const animate = (time: number) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;

            // Auto-spawn flashes periodically + near mouse
            if (time - lastFlashTime > 600) {
                lastFlashTime = time;
                spawnFlash(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height
                );
                if (mx > 0 && my > 0) {
                    spawnFlash(mx, my);
                }
            }

            // Draw gaussian splat flashes (radial gradients)
            for (let i = flashes.length - 1; i >= 0; i--) {
                const f = flashes[i];
                f.radius = Math.min(f.radius + 1.5, f.maxRadius);
                f.alpha -= f.decay;

                if (f.alpha <= 0) {
                    flashes.splice(i, 1);
                    continue;
                }

                const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
                gradient.addColorStop(0, f.color + (f.alpha * 0.8).toFixed(3) + ')');
                gradient.addColorStop(0.4, f.color + (f.alpha * 0.3).toFixed(3) + ')');
                gradient.addColorStop(1, f.color + '0)');

                ctx.beginPath();
                ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            // Draw particles with mouse interaction
            particles.forEach((p, i) => {
                // Mouse attraction / repulsion effect
                const dx = mx - p.x;
                const dy = my - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const mouseRadius = 200;

                if (dist < mouseRadius && dist > 0) {
                    const force = (1 - dist / mouseRadius) * 0.02;
                    p.vx += dx / dist * force;
                    p.vy += dy / dist * force;
                    p.alpha = Math.min(p.baseAlpha + (1 - dist / mouseRadius) * 0.5, 1);
                    p.size = Math.min(p.size + 0.02, 4);
                } else {
                    p.alpha += (p.baseAlpha - p.alpha) * 0.02;
                    p.size += (Math.random() * 2.5 + 0.5 - p.size) * 0.01;
                }

                // Damping
                p.vx *= 0.99;
                p.vy *= 0.99;

                p.x += p.vx;
                p.y += p.vy;

                // Bounce off edges
                if (p.x < 0) { p.x = 0; p.vx *= -1; }
                if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -1; }
                if (p.y < 0) { p.y = 0; p.vy *= -1; }
                if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -1; }

                // Draw particle glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha * 0.1;
                ctx.fill();

                // Draw particle core
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();

                // Connect nearby particles
                for (let j = i + 1; j < particles.length; j++) {
                    const cdx = p.x - particles[j].x;
                    const cdy = p.y - particles[j].y;
                    const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                    if (cdist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = p.color;
                        ctx.globalAlpha = (1 - cdist / 120) * 0.1;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });
            ctx.globalAlpha = 1;
            animationId = requestAnimationFrame(animate);
        };
        animationId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        if (mode === 'LOGIN') {
            await login(email, password);
        } else {
            await signup(email, password, name);
        }
    };

    return (
        <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex items-center justify-center font-sans">
            {/* Canvas background */}
            <canvas ref={canvasRef} className="absolute inset-0 z-0" />

            {/* Gradient overlays */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/80 via-transparent to-black/90" />
            <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-cyan-500/[0.03] blur-[150px] z-[1]" />
            <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-fuchsia-500/[0.03] blur-[150px] z-[1]" />
            <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-yellow-500/[0.02] blur-[120px] z-[1]" />

            {/* Main content */}
            <div className="relative z-10 w-full max-w-md mx-4">

                {/* Logo & Title - matching Header exactly */}
                <div className="text-center mb-8 group cursor-default">
                    <div className="flex items-center justify-center gap-2 md:gap-3 mb-3">
                        <div className="h-8 md:h-12 w-auto flex items-center flex-shrink-0">
                            <img
                                src={APP_CONFIG.LOGO_SOURCE}
                                alt={APP_CONFIG.APP_TITLE}
                                className="h-full w-auto object-contain drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                            />
                        </div>
                        <div className="text-left select-none">
                            <h1 className="text-xl md:text-3xl font-bold text-white tracking-tighter leading-none font-code uppercase transition-colors whitespace-nowrap">
                                <span className="group-hover:text-cyan-400 transition-colors duration-300">Neo</span>{' '}
                                <span className="group-hover:text-fuchsia-500 transition-colors duration-300">Geo</span>{' '}
                                <span className="group-hover:text-yellow-500 transition-colors duration-300">Hub</span>{' '}
                                <span className="text-fuchsia-500 group-hover:text-fuchsia-400 transition-colors duration-300">.v³</span>
                            </h1>
                            <span className="text-[9px] md:text-[10px] text-cyan-600 font-code font-medium tracking-[0.2em] uppercase leading-tight block">
                                &lt;{APP_CONFIG.APP_SUBTITLE} /&gt;
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed font-mono">
                        Plataforma profissional de georreferenciamento 3D,{' '}
                        gêmeos digitais e inspeção com IA.
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-[#1a1a1a] rounded-2xl p-6 shadow-2xl shadow-cyan-500/5">

                    {/* Tab Switcher */}
                    <div className="flex mb-6 bg-black/60 rounded-lg p-1 border border-[#1a1a1a]">
                        <button
                            onClick={() => { setMode('LOGIN'); clearError(); }}
                            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-300 font-code ${mode === 'LOGIN'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                                : 'text-gray-500 hover:text-gray-300 border border-transparent'
                                }`}
                        >
                            Entrar
                        </button>
                        <button
                            onClick={() => { setMode('SIGNUP'); clearError(); }}
                            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-300 font-code ${mode === 'SIGNUP'
                                ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.1)]'
                                : 'text-gray-500 hover:text-gray-300 border border-transparent'
                                }`}
                        >
                            Criar Conta
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-mono text-center animate-[fadeIn_0.3s_ease-out]">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'SIGNUP' && (
                            <div className="relative group">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Seu nome"
                                    required
                                    className="w-full bg-black/80 border border-[#222] rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                                />
                            </div>
                        )}

                        <div className="relative group">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                required
                                className="w-full bg-black/80 border border-[#222] rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                            />
                        </div>

                        <div className="relative group">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Senha"
                                required
                                minLength={6}
                                className="w-full bg-black/80 border border-[#222] rounded-lg pl-10 pr-12 py-3 text-sm text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 font-code ${mode === 'LOGIN'
                                ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]'
                                : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    {mode === 'LOGIN' ? 'Entrar' : 'Criar Conta'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-[#222]" />
                        <span className="text-[10px] text-gray-600 uppercase tracking-widest font-mono">ou</span>
                        <div className="flex-1 h-px bg-[#222]" />
                    </div>

                    {/* Social / Alt Logins */}
                    <div className="space-y-3">
                        <button
                            onClick={loginWithGoogle}
                            disabled={loading}
                            className="w-full py-3 bg-[#111] border border-[#222] hover:border-[#444] rounded-lg text-sm text-gray-300 hover:text-white font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50 group font-code"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Entrar com Google</span>
                        </button>

                        <button
                            onClick={loginAsDemo}
                            disabled={loading}
                            className="w-full py-3 bg-[#111] border border-yellow-500/20 hover:border-yellow-500/50 rounded-lg text-sm text-yellow-500/80 hover:text-yellow-400 font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50 group hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] font-code"
                        >
                            <Zap size={16} className="group-hover:animate-pulse" />
                            <span>Acesso Demo (Visitante)</span>
                        </button>
                    </div>
                </div>

                {/* Features strip */}
                <div className="mt-6 flex items-center justify-center gap-6 text-[10px] text-gray-600 uppercase tracking-wider font-code">
                    <div className="flex items-center gap-1.5">
                        <Layers size={12} className="text-cyan-500/50" />
                        <span>3D Mapping</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Shield size={12} className="text-fuchsia-500/50" />
                        <span>AI Analytics</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Globe size={12} className="text-yellow-500/50" />
                        <span>GeoRef</span>
                    </div>
                </div>

                <p className="text-center mt-4 text-[9px] text-gray-700 font-code tracking-widest uppercase">
                    Neo Geo Hub v3.3 — Powered by Gemini AI
                </p>
            </div>
        </div>
    );
};

export default LandingPage;
