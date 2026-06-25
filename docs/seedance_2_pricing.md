# Seedance 2.0 (bytedance/seedance-2) — ZeroLens Pricing Guide

> **1 Credit = ₹1 INR** · All prices include **40% platform margin** over raw API cost.
> Exchange rate: **1 USD = ₹85 INR**

---

## Raw Kie.ai Pricing (USD)

| Tier | Credits/Gen | Raw Cost (USD/s) | Official Price (USD/s) | Discount |
| :--- | :--- | :--- | :--- | :--- |
| 4K — No video input | 208 | $1.040 | $1.5600 | −33.3% |
| 4K — With video input | 128 | $0.640 | $0.9300 | −31.2% |
| 1080P — No video input | 102 | $0.510 | $0.6804 | −25.0% |
| 1080P — With video input | 62 | $0.310 | $0.4082 | −24.1% |
| 720P — No video input | 41 | $0.205 | $0.3024 | −32.2% |
| 720P — With video input | 25 | $0.125 | $0.1814 | −31.1% |
| 480P — No video input | 19 | $0.095 | $0.1406 | −32.4% |
| 480P — With video input | 11.5 | $0.0575 | $0.0844 | −32.5% |

---

## ZeroLens Pricing (INR with 40% Margin)

| Tier | Raw INR/s | +40% Margin (INR/s) | Credits/s | 5s Clip | 10s Clip |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **4K** — No video | ₹88.40 | **₹123.76** | **124/s** | 620 Cr | 1240 Cr |
| **4K** — With video | ₹54.40 | **₹76.16** | **76/s** | 380 Cr | 760 Cr |
| **1080P** — No video | ₹43.35 | **₹60.69** | **61/s** | 305 Cr | 610 Cr |
| **1080P** — With video | ₹26.35 | **₹36.89** | **37/s** | 185 Cr | 370 Cr |
| **720P** — No video | ₹17.43 | **₹24.40** | **24/s** | 120 Cr | 240 Cr |
| **720P** — With video | ₹10.63 | **₹14.88** | **15/s** | 75 Cr | 150 Cr |
| **480P** — No video | ₹8.08 | **₹11.31** | **11/s** | 55 Cr | 110 Cr |
| **480P** — With video | ₹4.85 | **₹6.78** | **7/s** | 35 Cr | 70 Cr |

---

## Blended Default Rate (for UI/code)

| Resolution | Credits/s | Reasoning |
| :--- | :--- | :--- |
| **4K** | **124/s** | No-video rate (higher, covers both cases) |
| **1080P** | **61/s** | No-video rate |
| **720P** | **24/s** | No-video rate |
| **480P** | **11/s** | No-video rate |

---

## Comparison

| Engine | 4K/s | 1080p/s | 720p/s | 480p/s |
| :--- | :--- | :--- | :--- | :--- |
| Seedance 2.0 | **124/s** | **61/s** | **24/s** | **11/s** |
| Seedance Fast | — | — | 20/s | 9/s |
| Seedance Mini | — | — | 12/s | 6/s |
