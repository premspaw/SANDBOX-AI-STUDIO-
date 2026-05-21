import { useState, useEffect, useRef } from 'react'
import { Check, Upload, X, ChevronRight, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store'
import { supabase } from '../../lib/supabase'
import { getApiUrl } from '../../config/apiConfig'

const WORD_SUGGESTIONS = [
    'Bold', 'Authentic', 'Playful', 'Luxurious', 'Minimal', 'Energetic',
    'Trustworthy', 'Innovative', 'Warm', 'Premium', 'Edgy', 'Calm',
    'Witty', 'Sophisticated', 'Raw', 'Vibrant', 'Clean', 'Powerful'
]

function FieldRow({ label, hint, done, children }) {
    return (
        <div className={`relative rounded-2xl border transition-all duration-300 p-4 ${done ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5' : 'border-white/10 bg-white/[0.03]'}`}>
            <div className="flex items-start justify-between mb-2 gap-2">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">{label}</p>
                    {hint && <p className="text-[10px] text-white/25 mt-0.5">{hint}</p>}
                </div>
                <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${done ? 'border-[#D4FF00] bg-[#D4FF00]' : 'border-white/20 bg-transparent'}`}>
                    {done && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
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
    const [words, setWords] = useState(['', '', ''])
    const [address, setAddress] = useState('')
    const [whatTheyDo, setWhatTheyDo] = useState('')
    const [brandColor, setBrandColor] = useState('')
    const [instagramHandle, setInstagramHandle] = useState('')
    const [website, setWebsite] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Load existing brand voice from profile metadata
    useEffect(() => {
        if (!userProfile) return
        const bv = userProfile.brand_voice || userProfile.metadata?.brand_voice || null
        if (!bv) return
        if (bv.brandName) setBrandName(bv.brandName)
        if (bv.logoUrl) { setLogoUrl(bv.logoUrl); setLogoPreview(bv.logoUrl) }
        if (bv.words) setWords(bv.words.length === 3 ? bv.words : [...bv.words, '', '', ''].slice(0, 3))
        if (bv.address) setAddress(bv.address)
        if (bv.whatTheyDo) setWhatTheyDo(bv.whatTheyDo)
        if (bv.brandColor) setBrandColor(bv.brandColor)
        if (bv.instagramHandle) setInstagramHandle(bv.instagramHandle)
        if (bv.website) setWebsite(bv.website)
    }, [userProfile])

    const doneBrandName = brandName.trim().length > 0
    const doneLogo = logoUrl.length > 0
    const doneWords = words.filter(w => w.trim().length > 0).length === 3
    const doneAddress = address.trim().length > 0
    const doneWhatTheyDo = whatTheyDo.trim().length > 10
    const doneBrandColor = /^#([0-9A-Fa-f]{6})$/.test(brandColor.trim())
    const doneInstagram = instagramHandle.trim().length > 0
    const doneWebsite = website.trim().length > 0
    const allDone = doneBrandName && doneLogo && doneWords && doneAddress && doneWhatTheyDo

    const completedCount = [doneBrandName, doneLogo, doneWords, doneAddress, doneWhatTheyDo, doneBrandColor, doneInstagram, doneWebsite].filter(Boolean).length
    const totalFields = 8
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

    const handleWordChange = (i, val) => {
        const next = [...words]
        next[i] = val
        setWords(next)
    }

    const handleSuggest = (word) => {
        const emptyIdx = words.findIndex(w => w.trim() === '')
        if (emptyIdx === -1) return
        handleWordChange(emptyIdx, word)
    }

    const handleSave = async () => {
        if (!userProfile?.id) return
        setSaving(true)
        const payload = { brandName, logoUrl, words, address, whatTheyDo, brandColor, instagramHandle, website }
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

    const handleProceedToPay = async () => {
        await handleSave()
        setActiveTab('pricing')
    }

    return (
        <div className="min-h-full bg-black text-white">
            <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

                {/* Header */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#D4FF00]" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4FF00]">Brand Setup</p>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight">Brand Voice</h1>
                    <p className="text-sm text-white/40">Define your brand identity. Complete all fields to unlock your plan.</p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-white/30 font-bold uppercase tracking-widest">
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

                {/* Brand Name */}
                <FieldRow label="Brand Name" hint="Your official brand or company name" done={doneBrandName}>
                    <input
                        type="text"
                        value={brandName}
                        onChange={e => setBrandName(e.target.value)}
                        placeholder="e.g. ZeroLens"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#D4FF00]/50 transition-colors"
                    />
                </FieldRow>

                {/* Logo Upload */}
                <FieldRow label="Brand Logo" hint="Upload your logo (PNG or SVG recommended)" done={doneLogo}>
                    <div className="flex items-center gap-4">
                        {logoPreview ? (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/5">
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                                <button
                                    onClick={() => { setLogoUrl(''); setLogoPreview('') }}
                                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center"
                                >
                                    <X className="w-2.5 h-2.5 text-white" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-xl border border-dashed border-white/20 flex items-center justify-center shrink-0 bg-white/5">
                                <Upload className="w-5 h-5 text-white/20" />
                            </div>
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-bold text-white/60 hover:text-white transition-all"
                        >
                            {uploading ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Upload Logo'}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </div>
                </FieldRow>

                {/* 3 Brand Words */}
                <FieldRow label="3 Brand Words" hint="Three words that define your brand personality" done={doneWords}>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            {words.map((word, i) => (
                                <input
                                    key={i}
                                    type="text"
                                    value={word}
                                    onChange={e => handleWordChange(i, e.target.value)}
                                    placeholder={`Word ${i + 1}`}
                                    maxLength={20}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#D4FF00]/50 transition-colors text-center font-bold"
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {WORD_SUGGESTIONS.filter(w => !words.includes(w)).slice(0, 10).map(w => (
                                <button
                                    key={w}
                                    onClick={() => handleSuggest(w)}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-[#D4FF00]/10 hover:text-[#D4FF00] text-white/30 border border-white/5 hover:border-[#D4FF00]/20 transition-all"
                                >
                                    {w}
                                </button>
                            ))}
                        </div>
                    </div>
                </FieldRow>

                {/* Address */}
                <FieldRow label="Business Address" hint="City, Country is sufficient" done={doneAddress}>
                    <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="e.g. Mumbai, India"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#D4FF00]/50 transition-colors"
                    />
                </FieldRow>

                {/* What they do */}
                <FieldRow label="What You Do" hint="Briefly describe your product or service (1-2 sentences)" done={doneWhatTheyDo}>
                    <textarea
                        value={whatTheyDo}
                        onChange={e => setWhatTheyDo(e.target.value)}
                        placeholder="e.g. We create AI-powered visual content for e-commerce brands that want to stand out."
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#D4FF00]/50 transition-colors resize-none"
                    />
                    <p className="text-[10px] text-white/20 mt-1 text-right">{whatTheyDo.length} chars</p>
                </FieldRow>

                {/* Brand Color */}
                <FieldRow label="Brand Color" hint="Hex code for your primary brand color (#D4AF37, #0EA5E9, #C8F135, etc.)" done={doneBrandColor}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border border-white/10 shrink-0" style={{ backgroundColor: /^#([0-9A-Fa-f]{6})$/.test(brandColor) ? brandColor : 'transparent' }} />
                        <input
                            type="text"
                            value={brandColor}
                            onChange={e => setBrandColor(e.target.value)}
                            placeholder="e.g. #D4AF37"
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#D4FF00]/50 transition-colors font-mono"
                        />
                    </div>
                </FieldRow>

                {/* Instagram Handle */}
                <FieldRow label="Instagram Handle" hint="Your Instagram @username" done={doneInstagram}>
                    <input type="text" value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)}
                        placeholder="e.g. @zerolens"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#D4FF00]/50 transition-colors" />
                </FieldRow>

                {/* Website */}
                <FieldRow label="Website" hint="Your website URL" done={doneWebsite}>
                    <input type="text" value={website} onChange={e => setWebsite(e.target.value)}
                        placeholder="e.g. https://zerolens.ai"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#D4FF00]/50 transition-colors" />
                </FieldRow>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-2">
                    {/* Save — stays on page */}
                    <button
                        onClick={handleSave}
                        disabled={saving || !doneBrandName}
                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${
                            doneBrandName
                                ? 'bg-[#D4FF00] text-black shadow-[0_0_30px_rgba(212,255,0,0.3)] hover:shadow-[0_0_40px_rgba(212,255,0,0.5)] hover:scale-[1.02] active:scale-95'
                                : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                        }`}
                    >
                        {saved ? '✓ Brand Voice Saved!' : saving ? 'Saving...' : 'Save Brand Voice'}
                    </button>

                    {/* Go to pricing — separate subtle link */}
                    {allDone && (
                        <button
                            onClick={() => setActiveTab('pricing')}
                            className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white/40 hover:text-white transition-all flex items-center justify-center gap-1.5"
                        >
                            Go to Plans <ChevronRight className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
