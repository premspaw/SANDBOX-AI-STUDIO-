# Seedance 2.0 (bytedance/seedance-2) — ZeroLens Pricing Guide

> **1 Credit = ₹1 INR** · All prices include **40% platform margin** over raw API cost.
> Exchange rate: **1 USD = ₹95 INR**

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
| **4K** — No video | ₹98.80 | **₹138.32** | **140/s** | 700 Cr | 1400 Cr |
| **4K** — With video | ₹60.80 | **₹85.12** | **90/s** | 450 Cr | 900 Cr |
| **1080P** — No video | ₹48.45 | **₹67.83** | **70/s** | 350 Cr | 700 Cr |
| **1080P** — With video | ₹29.45 | **₹41.23** | **45/s** | 225 Cr | 450 Cr |
| **720P** — No video | ₹19.48 | **₹27.27** | **30/s** | 150 Cr | 300 Cr |
| **720P** — With video | ₹11.88 | **₹16.63** | **20/s** | 100 Cr | 200 Cr |
| **480P** — No video | ₹9.03 | **₹12.64** | **15/s** | 75 Cr | 150 Cr |
| **480P** — With video | ₹5.46 | **₹7.65** | **10/s** | 50 Cr | 100 Cr |

---

## Blended Default Rate (for UI/code)

| Resolution | Credits/s | Reasoning |
| :--- | :--- | :--- |
| **4K** | **140/s** | No-video rate (higher, covers both cases) |
| **1080P** | **70/s** | No-video rate |
| **720P** | **30/s** | No-video rate |
| **480P** | **15/s** | No-video rate |

---

## Comparison

| Engine | 4K/s | 1080p/s | 720p/s | 480p/s |
| :--- | :--- | :--- | :--- | :--- |
| Seedance 2.0 | **140/s** | **70/s** | **30/s** | **15/s** |
| Seedance Fast | — | — | 25/s | 15/s |
| Seedance Mini | — | — | 15/s | 10/s |
