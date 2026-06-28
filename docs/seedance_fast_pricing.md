# Seedance Fast (bytedance/seedance-2-fast) — ZeroLens Pricing Guide

> **1 Credit = ₹1 INR** · All prices include **40% platform margin** over raw API cost.
> Exchange rate: **1 USD = ₹95 INR**

---

## Raw Kie.ai Pricing (USD)

| Tier | Credits/Gen | Raw Cost (USD/s) | Official Price (USD/s) | Discount |
| :--- | :--- | :--- | :--- | :--- |
| 720P — No video input | 33 | $0.165 | $0.2419 | −31.8% |
| 720P — With video input | 20 | $0.100 | $0.1451 | −31.1% |
| 480P — No video input | 15.5 | $0.0775 | $0.1125 | −31.1% |
| 480P — With video input | 9 | $0.045 | $0.0675 | −33.3% |

> **Billing note:** With video input, cost = unit price × (input + output) duration.
> No video input, cost = unit price × output duration only.

---

## ZeroLens Pricing (INR with 40% Margin)

| Tier | Raw INR/s | +40% Margin (INR/s) | Credits/s | 5s Clip | 10s Clip |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **720P** — No video | ₹15.68 | **₹21.95** | **25/s** | 125 Cr | 250 Cr |
| **720P** — With video | ₹9.50 | **₹13.30** | **15/s** | 75 Cr | 150 Cr |
| **480P** — No video | ₹7.36 | **₹10.31** | **15/s** | 75 Cr | 150 Cr |
| **480P** — With video | ₹4.28 | **₹5.99** | **10/s** | 50 Cr | 100 Cr |

---

## Blended Default Rate (for UI/code)

| Resolution | Credits/s | Reasoning |
| :--- | :--- | :--- |
| **720P** | **25/s** | No-video rate (higher, covers both cases) |
| **480P** | **15/s** | No-video rate |

---

## Comparison

| Engine | 720P/s | 480P/s |
| :--- | :--- | :--- |
| Seedance Fast | **25/s** | **15/s** |
| Seedance 2.0 | 30/s | 15/s |
| Seedance Mini | 15/s | 10/s |
