# Seedance Mini — ZeroLens Pricing Guide

> **1 Credit = ₹1 INR** · All prices include **40% platform margin** over raw API cost.
> Exchange rate: **1 USD = ₹85 INR**

---

## Raw Kie.ai Pricing (USD)

| Tier | Raw Cost (USD/s) |
| :--- | :--- |
| 720P — No video input | $0.1025 |
| 720P — With video input | $0.0625 |
| 480P — No video input | $0.0475 |
| 480P — With video input | $0.0300 |

> **Billing note:** With video input, cost = unit price × (input + output) duration.  
> No video input, cost = unit price × output duration only.

---

## ZeroLens Pricing (INR with 40% Margin)

| Tier | Raw INR/s | +40% Margin (INR/s) | Credits/s | 5s Clip | 10s Clip | 15s Clip |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **720P** — No video | ₹8.71 | **₹12.20** | **12/s** | 60 Cr | 120 Cr | 180 Cr |
| **720P** — With video | ₹5.31 | **₹7.44** | **7/s** | 35 Cr | 70 Cr | 105 Cr |
| **480P** — No video | ₹4.04 | **₹5.65** | **6/s** | 30 Cr | 60 Cr | 90 Cr |
| **480P** — With video | ₹2.55 | **₹3.57** | **4/s** | 20 Cr | 40 Cr | 60 Cr |

---

## Blended Default Rate (for UI display)

Since the codebase uses a single per-second rate per resolution:

| Resolution | Credits/s | Reasoning |
| :--- | :--- | :--- |
| **720P** | **12/s** | Default: no-video rate (higher, covers both cases) |
| **480P** | **6/s** | Default: no-video rate |

---

## Comparison with Other Engines

| Engine | Credits/s | 5s Cost | 10s Cost |
| :--- | :--- | :--- | :--- |
| Seedance Fast | 12/s | 60 Cr | 120 Cr |
| Seedance 2.0 | 16/s | 80 Cr | 160 Cr |
| **Seedance Mini** | **12/s (720P) / 6/s (480P)** | **60/30 Cr** | **120/60 Cr** |
| Veo 3.1 Fast | 3-5/s | 15-25 Cr | 30-50 Cr |

Seedance Mini is competitive with Seedance Fast at 720P, and **50% cheaper at 480P**.
