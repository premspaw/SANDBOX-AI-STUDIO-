---
name: Shorts Credit System Integration
description: Standardized system for managing, deducting, and refunding 'Shorts' credits across AI tools.
---

# Shorts Credit System

The AI Studio runs on "Shorts", a unified credit system. All features (Image Gen, Video, UGC, etc.) cost Shorts.

## Core Files

1. **`src/config/shortsConfig.js`:**
   Contains universally accessible cost constants (`SHORTS_COST`). Always add new model costs here instead of hardcoding them.

2. **`src/store.js`:**
   Zustand handles the global state (`userShorts`). 
   - Uses `spendShorts` for optimistic UI updates.
   - Uses `refundShorts` to reimburse failed operations.

3. **`src/hooks/useShorts.js`:**
   The unified React hook used inside components.
   Provides: `{ shorts, spend, refund, canAfford, refresh }`.

## Implementation Pattern

To add a new AI generation tool to the app, wrap the core logic inside the `spend()` and `refund()` lifecycle:

```jsx
import { useShorts } from '../../hooks/useShorts'

// Inside a component
const { spend, refund, canAfford } = useShorts()

const generateContent = async () => {
    const costKey = 'my_new_tool_cost'; // Define inside shortsConfig.js

    // 1. Check affordability before starting
    if (!canAfford(costKey)) {
        alert('Not enough Shorts!');
        return;
    }

    // 2. Spend (Optimistic deduction)
    const { success } = await spend(costKey);
    if (!success) { alert('Transaction failed'); return; }

    try {
        // 3. Perform generation...
        await api.generate();
    } catch (err) {
        // 4. Refund on failure!
        await refund(costKey);
        alert('Generation failed, Shorts refunded.');
    }
}
```

## Database Interaction

The store writes to `profiles` (column `shorts_balance`) and logs the transaction to `shorts_transactions`. Ensure these tables are available in Supabase.
