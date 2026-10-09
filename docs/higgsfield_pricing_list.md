# ZeroLens API Pricing: KIE.AI (Seedance) & Higgsfield (Genjutsu Remix)

> **Official Routing & Margin Policy**:
> 1. **Seedance (Text-to-Video & Image-to-Video)**: Defaulted to **KIE API** pricing as standard. KIE offers identical high-fidelity ByteDance generation at wholesale cost with standard margins.
> 2. **Genjutsu Motion Transfer & Object Swap (Remix Studio)**: Exclusively routed to **Higgsfield AI (Xfield)** because Genjutsu models are proprietary to Higgsfield and unavailable on KIE API.
> 3. **Platform Margin for Genjutsu**: Set to **15% Platform Margin Hike** ($Wholesale \times 1.15$).
> 4. **Exchange Baseline**: Converted at standard rate of **1 USD = ₹96 INR** (1 Short/Credit = ₹1 INR).
> 5. **720p Interpolation Policy**: Since Higgsfield provides explicit wholesale rates only for **480p SD (Bottom)** and **1080p FHD (Top)**, the **720p HD rate is calculated as the exact middle average** between 480p and 1080p across all workflows.

---

## ⚡ 1. Master Routing & Pricing Matrix

| Workflow / Studio | Provider Engine | Resolution | Tier Type | Wholesale (USD/s) | Margin | Client Price (USD/s) | Client Price (INR/s @ ₹96) | Shorts / Sec |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Seedance 2.0 / 2.5 SD** | **KIE API** | 480p | Bottom | $0.0950 / s | Standard | $0.1330 / s | ₹12.77 / s | **15 ⚡/s** |
| **Seedance 2.0 / 2.5 HD** | **KIE API** | 720p | Mid (Native) | $0.2050 / s | Standard | $0.2870 / s | ₹27.55 / s | **30 ⚡/s** |
| **Seedance 2.0 / 2.5 FHD**| **KIE API** | 1080p | Top | $0.5100 / s | Standard | $0.7140 / s | ₹68.54 / s | **70 ⚡/s** |
| **Seedance 2.0 4K** | **KIE API** | 4K | Ultra | $1.0400 / s | Standard | $1.4560 / s | ₹139.78 / s | **140 ⚡/s** |
| **Genjutsu Motion Transfer** | **Higgsfield (Xfield)** | 480p SD | **Bottom** | $0.3175 / s | **15%** | **$0.3651 / s** | **₹35.05 / s** | **36 ⚡/s** |
| **Genjutsu Motion Transfer** | **Higgsfield (Xfield)** | 720p HD | **Exact Middle** | **$0.5668 / s** | **15%** | **$0.6518 / s** | **₹62.57 / s** | **63 ⚡/s** |
| **Genjutsu Motion Transfer** | **Higgsfield (Xfield)** | 1080p Pro| **Top** | $0.8160 / s | **15%** | **$0.9384 / s** | **₹90.09 / s** | **90 ⚡/s** |
| **Genjutsu Object Swap** | **Higgsfield (Xfield)** | 480p SD | **Bottom** | $0.3175 / s | **15%** | **$0.3651 / s** | **₹35.05 / s** | **36 ⚡/s** |
| **Genjutsu Object Swap** | **Higgsfield (Xfield)** | 720p HD | **Exact Middle** | **$0.5668 / s** | **15%** | **$0.6518 / s** | **₹62.57 / s** | **63 ⚡/s** |
| **Genjutsu Object Swap** | **Higgsfield (Xfield)** | 1080p Pro| **Top** | $0.8160 / s | **15%** | **$0.9384 / s** | **₹90.09 / s** | **90 ⚡/s** |
| **Motion Control Easy** | **Gemini Omni Flash** | 720p / 1080p | Fixed Clip | ~$0.06 – $0.08 / s | Standard | Fixed 10s Clip | ₹55 – ₹88 / 10s | **55 – 88 ⚡ / 10s** |

---

## 🎭 2. Genjutsu Remix Studio Breakdown (Higgsfield Exclusive · 15% Margin @ ₹96)

Genjutsu is used exclusively for **Motion Transfer** (extracting movement from video onto character images) and **Object Swap** (replacing props and items in footage).

* **480p SD (Bottom)**: Raw wholesale is **$0.3175 / s** ($6.35 per 20s generation). Client rate is **36 ⚡/s** (₹35.05/s).
* **1080p FHD (Top)**: Raw wholesale is **$0.8160 / s**. Client rate is **90 ⚡/s** (₹90.09/s).
* **720p HD (Exact Middle)**: Average of 480p and 1080p wholesale is **$0.5668 / s**. Client rate is **63 ⚡/s** (₹62.57/s).

### Clip Pricing (1 Short = ₹1 INR)

| Quality Tier | Calculation Basis | Higgsfield Raw (USD/s) | +15% Client Rate (USD/s) | Rate in INR/s (@ ₹96) | Shorts/Sec | 5s Clip | 10s Clip | 20s Clip | 30s Sequence |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **480p SD (Fast Preview)** | **Bottom Tier** | $0.3175 / s | **$0.3651 / s** | ₹35.05 / s | **36 ⚡/s** | 180 ⚡ (₹180) | 360 ⚡ (₹360) | **720 ⚡ (₹720)** | 1,080 ⚡ (₹1,080) |
| **720p HD (Standard)** | **Exact Middle** | **$0.5668 / s** | **$0.6518 / s** | **₹62.57 / s** | **63 ⚡/s** | 315 ⚡ (₹315) | 630 ⚡ (₹630) | **1,260 ⚡ (₹1,260)** | 1,890 ⚡ (₹1,890) |
| **1080p FHD (Pro Master)** | **Top Tier** | $0.8160 / s | **$0.9384 / s** | ₹90.09 / s | **90 ⚡/s** | 450 ⚡ (₹450) | 900 ⚡ (₹900) | **1,800 ⚡ (₹1,800)** | 2,700 ⚡ (₹2,700) |

> 📌 **Loss Prevention Check**: For a 20-second 480p generation costing $6.35 USD (₹609.60), ZeroLens charges **720 Shorts (₹720 INR)**, completely eliminating negative margins and securing a clean 15% platform profit.

---

## ⚖️ 3. Why We Route Seedance to KIE API and Genjutsu to Higgsfield

| Comparison Point | KIE API (Seedance 2.0 / 2.5) | Higgsfield AI (Xfield) | Decision Rationale |
| :--- | :--- | :--- | :--- |
| **Image-to-Video Wholesale** | **$0.095 – $0.510 / s** | $0.144 – $0.966 / s | **KIE is 35%–45% cheaper** for identical ByteDance Seedance generation. |
| **720p 10s Clip (Wholesale)** | **$2.05** (₹197) | $4.70 (₹451) | Users save over ₹250 per 10s generation on KIE. |
| **1080p 10s Clip (Wholesale)**| **$5.10** (₹490) | $7.96 – $9.67 (₹764 – ₹928) | Users save over ₹274 – ₹438 per 10s generation on KIE. |
| **Genjutsu Motion Transfer** | ❌ Not available on KIE | ✅ `higgsfield/genjutsu/motion-transfer/v1.0` | Routed to **Higgsfield** with 15% margin. |
| **Genjutsu Object Swap** | ❌ Not available on KIE | ✅ `higgsfield/genjutsu/object-swap/v1.0` | Routed to **Higgsfield** with 15% margin. |
| **Motion Control Easy** | N/A (Google Cloud Vertex) | N/A (Google Cloud Vertex) | Routed to **Gemini Omni Flash** at flat 55–88 ⚡ per 10s clip. |

---

## 📋 4. Higgsfield Standalone Seedance 2.5 Reference Rates (15% Margin @ ₹96)

Where users request Higgsfield-native Seedance 2.5 (e.g. for native 30s sequences), with **720p set to the exact middle between 480p (bottom) and 1080p (top)**:

### A. Standard Text-to-Video & Image-to-Video
| Task & Model | Resolution | Tier Basis | Higgsfield Wholesale (USD/s) | +15% Client Rate (USD/s) | Client Rate (INR/s @ ₹96) | Shorts / Sec |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Seedance 2.5 Standard** | 480p SD | **Bottom** | $0.1440 / s | $0.1656 / s | ₹15.90 / s | **16 ⚡/s** |
| **Seedance 2.5 Standard** | 720p HD | **Exact Middle** | **$0.4701 / s** | **$0.5406 / s** | **₹51.90 / s** | **52 ⚡/s** |
| **Seedance 2.5 Standard** | 1080p FHD | **Top** | $0.7961 / s | $0.9155 / s | ₹87.89 / s | **88 ⚡/s** |

### B. Multi-Reference Video
| Task & Model | Resolution | Tier Basis | Higgsfield Wholesale (USD/s) | +15% Client Rate (USD/s) | Client Rate (INR/s @ ₹96) | Shorts / Sec |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Seedance 2.5 Multi-Ref** | 480p SD | **Bottom** | $0.1728 / s | $0.1987 / s | ₹19.08 / s | **20 ⚡/s** |
| **Seedance 2.5 Multi-Ref** | 720p HD | **Exact Middle** | **$0.5641 / s** | **$0.6487 / s** | **₹62.27 / s** | **62 ⚡/s** |
| **Seedance 2.5 Multi-Ref** | 1080p FHD | **Top** | $0.9553 / s | $1.0986 / s | ₹105.47 / s | **105 ⚡/s** |

### C. Direct Higgsfield Native Extended T2V / I2V
| Task & Model | Resolution | Tier Basis | Higgsfield Wholesale (USD/s) | +15% Client Rate (USD/s) | Client Rate (INR/s @ ₹96) | Shorts / Sec |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Seedance 2.5 Native T2V/I2V** | 480p SD | **Bottom** | $0.1748 / s | $0.2010 / s | ₹19.30 / s | **20 ⚡/s** |
| **Seedance 2.5 Native T2V/I2V** | 720p HD | **Exact Middle** | **$0.5708 / s** | **$0.6564 / s** | **₹63.01 / s** | **64 ⚡/s** |
| **Seedance 2.5 Native T2V/I2V** | 1080p FHD | **Top** | $0.9667 / s | $1.1117 / s | ₹106.72 / s | **107 ⚡/s** |
| **Seedance 2.5 Video Extend** | 480p SD | **Bottom** | $0.2098 / s | $0.2413 / s | ₹23.16 / s | **23 ⚡/s** |
| **Seedance 2.5 Video Extend** | 720p HD | **Exact Middle** | **$0.6849 / s** | **$0.7877 / s** | **₹75.61 / s** | **76 ⚡/s** |
| **Seedance 2.5 Video Extend** | 1080p FHD | **Top** | $1.1600 / s | $1.3340 / s | ₹128.06 / s | **128 ⚡/s** |
