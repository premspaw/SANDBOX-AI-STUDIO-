# Kling 3.0 Motion Control (Video-to-Video) — ZeroLens Pricing Guide

> **1 Credit = ₹1 INR** · All prices include **30% platform margin** over raw API cost.
> Exchange rate: **1 USD = ₹95 INR**

---

## Raw Kie.ai Pricing (USD)

| Tier | Raw Cost (USD/s) | Official / Fal Price (USD/s) | Discount |
| :--- | :--- | :--- | :--- |
| **1080P (Pro)** | $0.135 | $0.168 | −19.6% |
| **720P (Std)** | $0.100 | $0.126 | −20.6% |

---

## ZeroLens Pricing (INR with 30% Margin)

| Tier | Raw INR/s | +30% Margin (INR/s) | Credits/s | 5s Clip | 10s Clip | 15s Clip |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1080P (Professional)** | ₹12.825 | **₹18.32** | **18/s** | 90 Cr | 180 Cr | 270 Cr |
| **720P (Standard)** | ₹9.500 | **₹13.57** | **14/s** | 70 Cr | 140 Cr | 210 Cr |

---

## Blended Code Rates (for UI & Billing)

- **Kling 3.0 Motion Control Standard (720P):** **14 credits / second**
- **Kling 3.0 Motion Control Professional (1080P):** **18 credits / second**

For billing, the cost is calculated dynamically as:
`Credits = (kling_motion_std_rate or kling_motion_pro_rate) * math.ceil(reference_video_duration)`
