/**
 * ZEROLENS — Auth Page
 * Full-screen space-themed login/signup experience.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import BrandLogo from '../common/BrandLogo';

// ─── DESIGN TOKENS ────────────────────────────────────────────
const T = {
    lime: '#c8f135',
    limeGlow: '#9ef01a',
    limeDim: 'rgba(200, 241, 53, 0.1)',
    cyan: '#00ffe0',
    red: '#ff3a3a',
    bg: '#050505',
    bg2: '#0c0c0c',
    white: '#f0ede8',
    gray: '#2a2a2a',
    gray2: '#1a1a1a',
};

// ─── HELPER: STARFIELD BACKGROUD ──────────────────────────────
function StarField() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const stars = Array.from({ length: 150 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5,
            speed: 0.2 + Math.random() * 0.5,
            opacity: 0.1 + Math.random() * 0.8
        }));

        let animationFrame;
        const render = () => {
            ctx.clearRect(0, 0, width, height);
            stars.forEach(star => {
                ctx.fillStyle = `rgba(200, 241, 53, ${star.opacity})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();

                star.y -= star.speed;
                if (star.y < 0) star.y = height;
            });
            animationFrame = requestAnimationFrame(render);
        };

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        render();
        window.addEventListener('resize', handleResize);
        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.6 }} />;
}

export default function AuthPage({ onAuthSuccess, isModal = false }) {
    const [isLogin, setIsLogin] = useState(true);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);

    // Helper to ensure profile exists
    const ensureProfile = async (user) => {
        if (!user) return;
        try {
            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();
            
            if (!data && !profileError) {
                // Create profile if missing
                await supabase.from('profiles').insert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                    shorts_balance: 50, // Default starting balance
                    tier: 'FREE'
                });
            }
        } catch (e) {
            console.error("Error ensuring profile:", e);
        }
    };

    // Load fonts
    useEffect(() => {
        const id = 'ag-fonts-auth';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;700;800&display=swap';
        document.head.appendChild(link);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email) {
            setError('Please enter your email.');
            return;
        }

        setLoading(true);

        try {
            if (!supabase) {
                setError('Supabase is not configured. Check your .env file.');
                setLoading(false);
                return;
            }

            if (isForgotPassword) {
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                if (resetError) throw resetError;
                setSuccess('Password reset link sent! Check your email.');
                setLoading(false);
                return;
            }

            if (!password) {
                setError('Please enter your password.');
                setLoading(false);
                return;
            }

            if (!isLogin && password !== confirmPassword) {
                setError('Passwords do not match.');
                setLoading(false);
                return;
            }

            if (password.length < 6) {
                setError('Password must be at least 6 characters.');
                setLoading(false);
                return;
            }

            if (isLogin) {
                const { data, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (authError) throw authError;
                if (data?.user) {
                    await ensureProfile(data.user);
                    onAuthSuccess(data.user);
                }
            } else {
                if (!fullName) {
                    setError('Please enter your full name.');
                    setLoading(false);
                    return;
                }
                const { data, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        }
                    }
                });
                if (authError) throw authError;
                if (data?.user && !data.user.identities?.length) {
                    setError('An account with this email already exists.');
                } else if (data?.session) {
                    await ensureProfile(data.user);
                    onAuthSuccess(data.user);
                } else {
                    setSuccess('Account created! Check your email for a confirmation link.');
                    setIsLogin(true);
                    setPassword('');
                    setConfirmPassword('');
                }
            }
        } catch (err) {
            setError(err.message || 'Authentication failed. Please try again.');
        }
        setLoading(false);
    };

    const inputStyle = {
        width: '100%',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(240,237,232,0.05)',
        borderRadius: 12,
        padding: isModal ? '10px 14px' : '13px 16px',
        fontFamily: "'Syne',sans-serif",
        fontSize: 13,
        color: T.white,
        outline: 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    };

    return (
        <div style={{
            minHeight: isModal ? 'auto' : '100vh',
            height: isModal ? 'auto' : undefined,
            background: isModal ? 'transparent' : T.bg,
            color: T.white,
            fontFamily: "'Syne',sans-serif",
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            position: 'relative',
            overflowX: 'hidden',
            overflowY: isModal ? 'visible' : 'auto',
        }}>
            {/* ── Background Layer ── */}
            {!isModal && <StarField />}

            {/* Ambient Nebula Glows */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
                background: isModal ? 'transparent' : 'radial-gradient(circle at 20% 30%, rgba(200,241,53,0.06) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(0,255,224,0.04) 0%, transparent 60%)',
            }} />

            {/* ── Main Layout Container ── */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                minHeight: isModal ? 'auto' : '100vh',
                height: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: isModal ? '16px 8px 24px 8px' : '20px 20px 40px 20px',
                margin: isModal ? undefined : '0 auto',
            }}>

                {/* Branding Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ textAlign: 'center', marginBottom: isModal ? 10 : 16 }}
                >
                    <BrandLogo size={isModal ? 28 : 34} className="mb-2 mx-auto drop-shadow-[0_0_20px_rgba(200,241,53,0.3)]" />
                    <h1 style={{
                        fontFamily: "'Bebas Neue',sans-serif",
                        fontSize: isModal ? 30 : 38,
                        letterSpacing: '0.1em',
                        lineHeight: 0.9,
                        marginBottom: 4,
                        color: T.white,
                        textShadow: '0 0 40px rgba(255,255,255,0.1)'
                    }}>
                        ZEROLENS
                    </h1>
                    <p style={{
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 7.5,
                        letterSpacing: '0.4em',
                        color: T.lime,
                        textTransform: 'uppercase',
                        opacity: 0.6
                    }}>
                        Future of Cinematic Creation
                    </p>
                </motion.div>

                {/* Integrated Auth Form (No floating card look) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        width: '100%',
                        maxWidth: 400,
                        position: 'relative',
                    }}
                >
                    {/* Glassmorphic subtle container for the form itself */}
                    <div style={{
                        padding: isModal ? '14px 20px' : '20px 24px',
                        borderRadius: 24,
                        border: '1px solid rgba(255,255,255,0.03)',
                        background: 'rgba(255,255,255,0.01)',
                        backdropFilter: 'blur(10px)',
                    }}>

                        {/* Mode Toggle Switcher */}
                        {!isForgotPassword && (
                            <div style={{
                                display: 'flex',
                                marginBottom: isModal ? 16 : 20,
                                position: 'relative',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                            }}>
                            {['LOGIN', 'SIGN UP'].map((mode, i) => {
                                const active = (i === 0 && isLogin) || (i === 1 && !isLogin);
                                return (
                                    <button
                                        key={mode}
                                        onClick={() => setIsLogin(i === 0)}
                                        style={{
                                            flex: 1,
                                            padding: isModal ? '8px 0' : '12px 0',
                                            fontFamily: "'Bebas Neue',sans-serif",
                                            fontSize: 16,
                                            letterSpacing: '0.1em',
                                            color: active ? T.lime : 'rgba(255,255,255,0.25)',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            position: 'relative',
                                        }}
                                    >
                                        {mode}
                                        {active && (
                                            <motion.div
                                                layoutId="mode-underline"
                                                style={{
                                                    position: 'absolute', bottom: -1, left: 0, right: 0,
                                                    height: 2, background: T.lime,
                                                    boxShadow: `0 0 10px ${T.lime}`
                                                }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: isModal ? 10 : 12 }}>
                            <AnimatePresence>
                                {!isLogin && !isForgotPassword && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: isModal ? 4 : 8, overflow: 'hidden' }}
                                    >
                                        <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.2em', opacity: 0.3 }}>FULL_NAME</label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="John Doe"
                                            style={inputStyle}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: isModal ? 4 : 8 }}>
                                <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.2em', opacity: 0.3 }}>EMAIL_ADDRESS</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="auth-input"
                                    style={inputStyle}
                                />
                            </div>

                            {!isForgotPassword && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: isModal ? 4 : 8 }}>
                                    <div style={{ display: 'flex', justifyStyle: 'space-between', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.2em', opacity: 0.3 }}>PASSWORD_KEY</label>
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', color: T.lime, fontSize: 10, fontFamily: "'DM Mono',monospace", cursor: 'pointer', opacity: 0.6 }}>{showPassword ? 'HIDE' : 'SHOW'}</button>
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        style={inputStyle}
                                    />
                                </div>
                            )}

                            {!isForgotPassword && isLogin && (
                                <button
                                    type="button"
                                    onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(255,255,255,0.4)',
                                        fontSize: 12,
                                        fontFamily: "'DM Mono',monospace",
                                        textAlign: 'right',
                                        cursor: 'pointer',
                                        marginTop: -8,
                                    }}
                                >
                                    Forgot password?
                                </button>
                            )}

                            <AnimatePresence>
                                {!isLogin && !isForgotPassword && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: isModal ? 4 : 8, overflow: 'hidden' }}
                                    >
                                        <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.2em', opacity: 0.3 }}>CONFIRM_SECRET</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            style={inputStyle}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Error Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: T.red, fontSize: 12, textAlign: 'center', fontFamily: "'DM Mono',monospace" }}>
                                        {error}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            {/* Success Message */}
                            <AnimatePresence>
                                {success && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: T.lime, fontSize: 12, textAlign: 'center', fontFamily: "'DM Mono',monospace" }}>
                                        {success}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={loading}
                                style={{
                                    marginTop: isModal ? 6 : 8,
                                    padding: isModal ? '10px' : '13px',
                                    borderRadius: 12,
                                    background: loading ? 'rgba(200,241,53,0.1)' : T.lime,
                                    color: '#000',
                                    border: 'none',
                                    fontFamily: "'Bebas Neue',sans-serif",
                                    fontSize: 16,
                                    letterSpacing: '0.1em',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: `0 0 30px rgba(200,241,53,0.15)`
                                }}
                            >
                                {loading ? 'AUTHENTICATING...' : (isForgotPassword ? 'SEND RESET LINK →' : (isLogin ? 'ENTER STUDIO →' : 'INITIALIZE ACCOUNT →'))}
                            </motion.button>

                            {isForgotPassword && (
                                <button
                                    type="button"
                                    onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(255,255,255,0.3)',
                                        fontSize: 12,
                                        fontFamily: "'DM Mono',monospace",
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ← BACK TO LOGIN
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Bottom Links */}
                    <div style={{ textAlign: 'center', marginTop: isModal ? 20 : 40, opacity: 0.3, fontFamily: "'DM Mono',monospace", fontSize: 9 }}>
                        © 2026 ZEROLENS SYSTEMS · ALL RIGHTS RESERVED
                    </div>
                </motion.div>
            </div>

            {/* Corner Decorative Elements */}
            {!isModal && <div style={{ position: 'absolute', top: 24, left: 24, opacity: 0.1, zIndex: 5, fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.4em' }}>ZEROLENS_AUTH_V4</div>}
            {!isModal && <div style={{ position: 'absolute', bottom: 24, right: 24, opacity: 0.1, zIndex: 5, fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.4em' }}>SYS_READY_00X</div>}
        </div>
    );
}
