# Seedance Mini — ZeroLens Pricing Guide

> **1 Credit = ₹1 INR** · All prices include **40% platform margin** over raw API cost.
> Exchange rate: **1 USD = ₹95 INR**

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
| **720P** — No video | ₹9.74 | **₹13.63** | **15/s** | 75 Cr | 150 Cr | 225 Cr |
| **720P** — With video | ₹5.94 | **₹8.31** | **10/s** | 50 Cr | 100 Cr | 150 Cr |
| **480P** — No video | ₹4.51 | **₹6.32** | **10/s** | 50 Cr | 100 Cr | 150 Cr |
| **480P** — With video | ₹2.85 | **₹3.99** | **5/s** | 25 Cr | 50 Cr | 75 Cr |

---

## Blended Default Rate (for UI display)

Since the codebase uses a single per-second rate per resolution:

| Resolution | Credits/s | Reasoning |
| :--- | :--- | :--- |
| **720P** | **15/s** | Default: no-video rate (higher, covers both cases) |
| **480P** | **10/s** | Default: no-video rate |

---

## Comparison with Other Engines

| Engine | Credits/s | 5s Cost | 10s Cost |
| :--- | :--- | :--- | :--- |
| Seedance Fast | 25/s | 125 Cr | 250 Cr |
| Seedance 2.0 | 30/s | 150 Cr | 300 Cr |
| **Seedance Mini** | **15/s (720P) / 10/s (480P)** | **75/50 Cr** | **150/100 Cr** |
| Veo 3.1 Fast | 3-5/s | 15-25 Cr | 30-50 Cr |

Seedance Mini is competitive with Seedance Fast at 720P, and **33% cheaper at 480P**.
