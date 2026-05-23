# PALETTE'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2025-05-22 - Initial Assessment
**Learning:** Found that the application relies on native browser `alert()` for critical user feedback (like password reset), which breaks the immersive, cinematic UI/UX. Additionally, several interactive icon-only elements lack ARIA labels, making them inaccessible to screen readers.
**Action:** Replace `alert()` with the custom `Toast` component and ensure all icon-only buttons have descriptive `aria-label` attributes.
