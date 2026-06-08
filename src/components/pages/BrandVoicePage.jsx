import { useState, useEffect, useRef } from 'react'
import { Check, Upload, X, ChevronRight, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store'
import { supabase } from '../../lib/supabase'
import { getApiUrl } from '../../config/apiConfig'

function FieldRow({ label, hint, done, children }) {
    return (
        <div className={`relative rounded-2xl border transition-all duration-300 p-3.5 ${done ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5' : 'border-white/10 bg-white/[0.03]'}`}>
            <div className="flex items-start justify-between mb-2 gap-2">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{label}</p>
                    {hint && <p className="text-[8.5px] text-white/30 mt-0.5 leading-relaxed">{hint}</p>}
                </div>
                <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${done ? 'border-[#D4FF00] bg-[#D4FF00]' : 'border-white/20 bg-transparent'}`}>
                    {done && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                </div>
            </div>
            {children}
        </div>
    )
}

export default function BrandVoicePage() {
    const { userProfile, setActiveTab } = useAppStore()
    const fileInputRef = useRef(null)

    const [brandName, setBrandName] = useState('')
    const [logoUrl, setLogoUrl] = useState('')
    const [logoPreview, setLogoPreview] = useState('')
    const [tagline, setTagline] = useState('')
    const [founderName, setFounderName] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [address, setAddress] = useState('')
    const [whatTheyDo, setWhatTheyDo] = useState('')
    const [brandColor, setBrandColor] = useState('')
    const [instagramHandle, setInstagramHandle] = useState('')
    const [website, setWebsite] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [scannedPalette, setScannedPalette] = useState([])

    const extractPalette = (fileOrBase64) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 30;
            canvas.height = 30;
            ctx.drawImage(img, 0, 0, 30, 30);
            
            const imgData = ctx.getImageData(0, 0, 30, 30).data;
            const colorsMap = new Map();
            
            for (let i = 0; i < imgData.length; i += 4) {
                const r = imgData[i];
                const g = imgData[i+1];
                const b = imgData[i+2];
                const a = imgData[i+3];
                
                if (a < 128) continue; // skip transparency
                
                const qr = Math.round(r / 24) * 24;
                const qg = Math.round(g / 24) * 24;
                const qb = Math.round(b / 24) * 24;
                
                const cr = Math.max(0, Math.min(255, qr));
                const cg = Math.max(0, Math.min(255, qg));
                const cb = Math.max(0, Math.min(255, qb));
                
                const hex = "#" + ((1 << 24) + (cr << 16) + (cg << 8) + cb).toString(16).slice(1).toUpperCase();
                colorsMap.set(hex, (colorsMap.get(hex) || 0) + 1);
            }
            
            const sorted = Array.from(colorsMap.entries())
                .sort((a, b) => b[1] - a[1])
                .map(e => e[0]);
                
            setScannedPalette(sorted.slice(0, 8));
        };
        
        if (typeof fileOrBase64 === 'string') {
            img.src = fileOrBase64;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(fileOrBase64);
        }
    };

    // Load existing brand voice from profile metadata
    useEffect(() => {
        if (!userProfile) return
        const bv = userProfile.brand_voice || userProfile.metadata?.brand_voice || null
        if (!bv) return
        if (bv.brandName) setBrandName(bv.brandName)
        if (bv.logoUrl) { setLogoUrl(bv.logoUrl); setLogoPreview(bv.logoUrl) }
        if (bv.tagline) setTagline(bv.tagline)
        if (bv.founderName) setFounderName(bv.founderName)
        if (bv.phoneNumber) setPhoneNumber(bv.phoneNumber)
        if (bv.address) setAddress(bv.address)
        if (bv.whatTheyDo) setWhatTheyDo(bv.whatTheyDo)
        if (bv.brandColor) setBrandColor(bv.brandColor)
        if (bv.instagramHandle) setInstagramHandle(bv.instagramHandle)
        if (bv.website) setWebsite(bv.website)
    }, [userProfile])

    const doneBrandName = brandName.trim().length > 0
    const doneLogo = logoUrl.length > 0
    const doneTagline = tagline.trim().length > 0
    const doneFounderName = founderName.trim().length > 0
    const donePhoneNumber = phoneNumber.trim().length > 0
    const doneAddress = address.trim().length > 0
    const doneWhatTheyDo = whatTheyDo.trim().length > 10
    const doneBrandColor = /^#([0-9A-Fa-f]{6})$/.test(brandColor.trim())
    const doneInstagram = instagramHandle.trim().length > 0
    const doneWebsite = website.trim().length > 0
    const allDone = doneBrandName && doneWhatTheyDo

    const completedCount = [doneBrandName, doneLogo, doneTagline, doneFounderName, donePhoneNumber, doneAddress, doneWhatTheyDo, doneBrandColor, doneInstagram, doneWebsite].filter(Boolean).length
    const totalFields = 10
    const progress = (completedCount / totalFields) * 100

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const reader = new FileReader()
            const base64 = await new Promise((res, rej) => {
                reader.onload = ev => res(ev.target.result)
                reader.onerror = rej
                reader.readAsDataURL(file)
            })
            setLogoPreview(base64)
            extractPalette(file)
            const resp = await fetch(getApiUrl('/api/upload-asset'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: base64, type: 'image', userId: userProfile?.id })
            })
            const data = await resp.json()
            if (data.url) setLogoUrl(data.url)
        } catch (err) {
            console.error('Logo upload failed:', err)
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        if (!userProfile?.id) return
        setSaving(true)
        const payload = { brandName, logoUrl, tagline, founderName, phoneNumber, address, whatTheyDo, brandColor, instagramHandle, website }
        try {
            const { error } = await supabase.from('profiles').update({
                brand_voice: payload
            }).eq('id', userProfile.id)
            if (error) throw error
            // Update local store so cache reflects the saved data
            useAppStore.getState().setUserProfile({ ...userProfile, brand_voice: payload, metadata: { ...(userProfile.metadata || {}), brand_voice: payload } })
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            console.error('Save failed:', err)
            alert('Save failed: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-full bg-black text-white py-4 font-sans select-none">
            <div className="max-w-4xl mx-auto px-4 space-y-4">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-3">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#D4FF00]" />
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#D4FF00]">Brand Setup</p>
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-tight">Brand Voice</h1>
                    </div>
                    {/* Progress bar inside header */}
                    <div className="w-full sm:w-64 space-y-1">
                        <div className="flex justify-between text-[8px] text-white/30 font-bold uppercase tracking-widest">
                            <span>{completedCount} of {totalFields} complete</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#D4FF00] rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column: Identity & Channels */}
                    <div className="space-y-4">
                        {/* Brand Name */}
                        <FieldRow label="Brand Name" hint="Official company name" done={doneBrandName}>
                            <input
                                type="text"
                                value={brandName}
                                onChange={e => setBrandName(e.target.value)}
                                placeholder="e.g. ZeroLens"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#D4FF00]/50 transition-colors"
                            />
                        </FieldRow>

                        {/* Tagline */}
                        <FieldRow label="Tagline" hint="Short brand motto or tagline" done={doneTagline}>
                            <input
                                type="text"
                                value={tagline}
                                onChange={e => setTagline(e.target.value)}
                                placeholder="e.g. Direct without a camera"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#D4FF00]/50 transition-colors"
                            />
                        </FieldRow>

                        {/* Logo Upload */}
                        <FieldRow label="Brand Logo" hint="PNG or SVG recommended" done={doneLogo}>
                            <div className="flex items-center gap-3">
                                {logoPreview ? (
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/5">
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                                        <button
                                            onClick={() => { setLogoUrl(''); setLogoPreview('') }}
                                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500 transition-colors"
                                        >
                                            <X className="w-2 h-2 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-xl border border-dashed border-white/20 flex items-center justify-center shrink-0 bg-white/5">
                                        <Upload className="w-4 h-4 text-white/20" />
                                    </div>
                                )}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex-1 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white/60 hover:text-white transition-all"
                                >
                                    {uploading ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Upload Logo'}
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </div>
                        </FieldRow>

                        {/* Business Address */}
                        <FieldRow label="Business Address" hint="City, Country is sufficient" done={doneAddress}>
                            <input
                                type="text"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="e.g. Mumbai, India"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#D4FF00]/50 transition-colors"
                            />
                        </FieldRow>

                        {/* Channels Grid Row */}
                        <div className="grid grid-cols-2 gap-3">
                            <FieldRow label="Instagram" done={doneInstagram}>
                                <input type="text" value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)}
                                    placeholder="e.g. @zerolens"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#D4FF00]/50 transition-colors" />
                            </FieldRow>

                            <FieldRow label="Website" done={doneWebsite}>
                                <input type="text" value={website} onChange={e => setWebsite(e.target.value)}
                                    placeholder="e.g. https://zerolens.ai"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#D4FF00]/50 transition-colors" />
                            </FieldRow>
                        </div>
                    </div>

                    {/* Right Column: Description, Color & Tone */}
                    <div className="space-y-4">
                        {/* What you do */}
                        <FieldRow label="What You Do" hint="Brief description of product/service (1-2 sentences)" done={doneWhatTheyDo}>
                            <textarea
                                value={whatTheyDo}
                                onChange={e => setWhatTheyDo(e.target.value)}
                                placeholder="We create AI-powered visual content for e-commerce brands..."
                                rows={2}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#D4FF00]/50 transition-colors resize-none leading-relaxed"
                            />
                            <p className="text-[8px] text-white/20 mt-0.5 text-right">{whatTheyDo.length} chars</p>
                        </FieldRow>

                        {/* Founder & Phone Info */}
                        <div className="grid grid-cols-2 gap-3">
                            <FieldRow label="Founder Name" done={doneFounderName}>
                                <input
                                    type="text"
                                    value={founderName}
                                    onChange={e => setFounderName(e.target.value)}
                                    placeholder="e.g. John Doe"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#D4FF00]/50 transition-colors"
                                />
                            </FieldRow>
                            <FieldRow label="Phone Number" done={donePhoneNumber}>
                                <input
                                    type="text"
                                    value={phoneNumber}
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    placeholder="e.g. +1 234 567 890"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#D4FF00]/50 transition-colors"
                                />
                            </FieldRow>
                        </div>

                        {/* Brand Color */}
                        <FieldRow label="Brand Color" hint="Primary hex color — pick a swatch, enter hex, or upload image to scan" done={doneBrandColor}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-lg border border-white/10 shrink-0" style={{ backgroundColor: /^#([0-9A-Fa-f]{6})$/.test(brandColor) ? brandColor : 'transparent' }} />
                                <input
                                    type="text"
                                    value={brandColor}
                                    onChange={e => setBrandColor(e.target.value)}
                                    placeholder="e.g. #D4AF37"
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#D4FF00]/50 transition-colors font-mono"
                                />
                                <label className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/70 hover:text-white cursor-pointer transition-all flex items-center gap-1.5 shrink-0">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Scan Image</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) extractPalette(file);
                                        }}
                                    />
                                </label>
                            </div>

                            {/* Scanned palette if exists */}
                            {scannedPalette.length > 0 && (
                                <div className="mb-3 space-y-1.5">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-[#D4FF00]">Scanned Palette Colors</p>
                                    <div className="flex flex-wrap gap-1.5 bg-white/[0.02] border border-white/5 rounded-xl p-2">
                                        {scannedPalette.map(hex => (
                                            <button
                                                key={`scanned-${hex}`}
                                                type="button"
                                                onClick={() => setBrandColor(hex)}
                                                className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center ${brandColor === hex ? 'border-[#D4FF00] scale-110' : 'border-white/10 hover:scale-105'}`}
                                                style={{ backgroundColor: hex }}
                                                title={hex}
                                            >
                                                {brandColor === hex && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <p className="text-[8px] font-bold uppercase tracking-wider text-white/30">Preset Suggestions</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { hex: '#D4AF37', label: 'Gold' },
                                        { hex: '#0EA5E9', label: 'Blue' },
                                        { hex: '#C8F135', label: 'Lime' },
                                        { hex: '#FF6B35', label: 'Coral' },
                                        { hex: '#A855F7', label: 'Purple' },
                                        { hex: '#00CED1', label: 'Teal' },
                                        { hex: '#F43F5E', label: 'Rose' },
                                        { hex: '#10B981', label: 'Emerald' },
                                        { hex: '#E2E8F0', label: 'Silver' },
                                        { hex: '#F59E0B', label: 'Amber' },
                                    ].map(c => (
                                        <button
                                            key={c.hex}
                                            type="button"
                                            onClick={() => setBrandColor(c.hex)}
                                            className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center ${brandColor === c.hex ? 'border-[#D4FF00] scale-110' : 'border-white/10 hover:scale-105'}`}
                                            style={{ backgroundColor: c.hex }}
                                            title={c.label}
                                        >
                                            {brandColor === c.hex && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </FieldRow>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                    {/* Save — stays on page */}
                    <button
                        onClick={handleSave}
                        disabled={saving || !doneBrandName}
                        className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${
                            doneBrandName
                                ? 'bg-[#D4FF00] text-black shadow-[0_0_20px_rgba(212,255,0,0.2)] hover:shadow-[0_0_30px_rgba(212,255,0,0.3)] hover:scale-[1.01] active:scale-95'
                                : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                        }`}
                    >
                        {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Brand Voice'}
                    </button>

                    {/* Go to pricing — separate subtle link */}
                    {allDone && (
                        <button
                            onClick={() => setActiveTab('pricing')}
                            className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white/60 hover:text-white transition-all flex items-center justify-center gap-1.5"
                        >
                            Go to Plans <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
