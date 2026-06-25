# Seedance Fast (bytedance/seedance-2-fast) — ZeroLens Pricing Guide

> **1 Credit = ₹1 INR** · All prices include **40% platform margin** over raw API cost.
> Exchange rate: **1 USD = ₹85 INR**

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
| **720P** — No video | ₹14.03 | **₹19.64** | **20/s** | 100 Cr | 200 Cr |
| **720P** — With video | ₹8.50 | **₹11.90** | **12/s** | 60 Cr | 120 Cr |
| **480P** — No video | ₹6.59 | **₹9.22** | **9/s** | 45 Cr | 90 Cr |
| **480P** — With video | ₹3.83 | **₹5.36** | **5/s** | 25 Cr | 50 Cr |

---

## Blended Default Rate (for UI/code)

| Resolution | Credits/s | Reasoning |
| :--- | :--- | :--- |
| **720P** | **20/s** | No-video rate (higher, covers both cases) |
| **480P** | **9/s** | No-video rate |

---

## Comparison

| Engine | 720P/s | 480P/s |
| :--- | :--- | :--- |
| Seedance Fast | **20/s** | **9/s** |
| Seedance 2.0 | 24/s | 11/s |
| Seedance Mini | 12/s | 6/s |
