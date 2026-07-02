# Pricing & Credits System Configuration Document

This document records the exact details of the credit doubling, price alignment, and credit generation cost reduction configurations applied to the project.

---

## 1. Credit Rewards (Doubled and Rounded)

We have doubled all user credits given during plan subscriptions and top-up package purchases. The final values have been rounded for premium consistency:

| Tier / Package | Price (₹) | Old Credits (⚡) | New Credits (⚡) |
| :--- | :---: | :---: | :---: |
| **Starter** | 399 / 319 | 399 | **800** |
| **Influencer** | 2499 / 1999 | 1999 | **4000** |
| **Director** | 4999 / 3999 | 4999 | **10000** |
| **Enterprise** | 9999 / 7999 | 9999 | **20000** |
| **1,000 topup** | 900 | 1000 | **2000** |
| **4,500 topup** | 4000 | 4500 | **9000** |
| **10,000 topup** | 9000 | 10000 | **20000** |

---

## 2. Updated Code References

### Backend Price & Credit Matchers
- **`server/routes/creditsRoutes.js`**: awarding rounded credits in simulated purchase logic.
- **`server.js`**: webhook handler matching exact Razorpay payment amounts to target tiers and awarding credits:
  - Starter: 400 ⚡
  - Influencer: 2500 ⚡
  - Director: 5500 ⚡
  - Enterprise: 11000 ⚡
  - Topups: 2000 / 9000 / 20000 ⚡
  - Updated price identification match check for the **Influencer** tier to match actual prices (`2499 || 1999`).

### Frontend Text Displays
- **`src/components/pages/PricingPage.jsx`**: updated feature descriptions (including image/video breakdowns with the `2⚡ each` and `40⚡ each` annotations removed, storyboard/angles features, and specific brand features: Voice TTS, Seedance Video, Marketing, UGC, Motion/Emotion Control, and AI Agent modes), topup listings, `modelPricing` constants, and implemented custom badges for major highlight keywords.
- **`src/components/pages/SettingsPage.jsx`**: updated the monthly allowance limits in the membership profile box.

---

## 3. Credit Costs per Generation (Halved by ~50%)

To prevent user generation buttons from disabling due to high credit cost thresholds, costs have been halved:

### Config Constant Costs (`src/config/shortsConfig.js`)
- `image_nano_banana_pro`: 5 → **3**
- `ugc_video_scene`: 10 → **5**
- `ugc_full_video`: 20 → **10**
- `product_pack_5`: 12 → **6**
- `product_360`: 8 → **4**
- `veo_fast`: 20 → **10**
- `veo_full`: 80 → **40**
- `kling`: 15 → **7**
- `kling_motion_std`: 14 → **7**
- `kling_motion_pro`: 18 → **9**
- `seedance_fast` (per second): 12 → **6**
- `seedace` (per second): 16 → **8**
- `identity_kit`: 15 → **7**
- `movie_matrix`: 10 → **5**

### Backend Omni Generation Cost per Second (`server/routes/omniRoutes.js`)
- `omni-flash` (4K): `38 / 31` → **`19 / 15`** (audio / no audio)
- `omni-flash` (1080p): `15 / 12` → **`8 / 6`** (audio / no audio)
- `omni-flash` (720p): `12 / 10` → **`6 / 5`** (audio / no audio)
- `omni`: `6` → **`3`**

### Backend Video Cost per Second (`server/routes/videoRoutes.js` & `server/routes/seedanceRoutes.js`)
- `veo` full: 80 → **40**
- `veo` fast: 20 → **10**
- `kling` standard: 15 → **7**
- `kling` motion control: pro: 18 → **9**, std: 14 → **7**
- `seedance` fast: 480p: 6 (or 9) → **3 (or 4)**, 720p+: 12 (or 20) → **6 (or 10)**
- `seedance` pro: 4K: 124 → **62**, 1080p: 61 → **30**, 480p: 11 → **5**, default: 24 → **12**
- `seedance` mini: 480p: 6 → **3**, other: 12 → **6**
- `openai`: 5 → **2**
- `gpt-image-2`: high: 5 → **3**, medium: 3 → **2**, low: 2 → **1**

### Frontend Cost Estimations (`MarketingStudio.jsx` & `CinematicStudio.jsx`)
- Frontend estimation formulas in `getRequiredCredits` are fully aligned with the reduced rates above.
