/**
 * Universal Error Sanitizer for ZeroLens AI Studio
 * 
 * Strict White-Label & Policy Rules:
 * 1. Never expose 3rd-party vendor names (Kie, Kie.ai, XBuild, Higgsfield, Xfield, BytePlus, Ark, Kling, etc.).
 * 2. If it's a safety/policy violation:
 *    - On Google / Omni / Veo:
 *      "⚠️ Google Policy Restriction: Google does not support this content due to policy restrictions. 100% of your Shorts credits have been refunded. Please try generating with Seedance."
 *    - On Seedance (or if Seedance also gets a policy violation):
 *      "⚠️ Policy Restriction: This content was flagged by safety policies. 100% of your Shorts credits have been refunded. Please try with a different prompt, a different reference image, or a different person/character."
 * 3. If it's a user Shorts balance issue:
 *    "Insufficient Shorts balance. Please top up your Shorts credits in the top navigation or pricing tab to continue."
 * 4. If it's a server/backend failure, upstream payment/credit failure, timeout, crash, or 500 error:
 *    "High server demand or temporary service interruption. Any deducted Shorts have been refunded. Please try again or contact support at support@zerolens.in."
 */

export function sanitizeUserErrorMessage(rawMsg, engineContext = 'generation') {
  if (!rawMsg) {
    return 'High server demand or temporary service interruption. Please try again or contact support at support@zerolens.in.';
  }

  const str = typeof rawMsg === 'string'
    ? rawMsg
    : (rawMsg?.message || rawMsg?.error?.message || rawMsg?.error || JSON.stringify(rawMsg));

  const lower = str.toLowerCase();
  const ctx = (typeof engineContext === 'string' ? engineContext : '').toLowerCase();

  // 1. Content Policy / Safety Filter Violations
  const isPolicyViolation =
    lower.includes('responsible ai') ||
    lower.includes('content safety') ||
    lower.includes('safety_refusal') ||
    lower.includes('safety filter') ||
    lower.includes('policy') ||
    lower.includes('prohibited') ||
    lower.includes('prominent individuals') ||
    lower.includes('celebrities') ||
    lower.includes('real person') ||
    lower.includes('realperson') ||
    lower.includes('nsfw') ||
    lower.includes('content_blocked') ||
    lower.includes('moderation') ||
    lower.includes('sensitive content');

  if (isPolicyViolation) {
    const isExplicitSeedance = ctx.includes('seedance');
    const isExplicitGoogle = ctx.includes('omni') || ctx.includes('veo') || ctx.includes('gemini') || ctx.includes('google');

    if (isExplicitSeedance) {
      return '⚠️ Policy Restriction: This content was flagged by safety policies. 100% of your Shorts credits have been refunded. Please try with a different prompt, a different reference image, or a different person/character.';
    }

    if (isExplicitGoogle) {
      return '⚠️ Google Policy Restriction: Google does not support this content due to policy restrictions. 100% of your Shorts credits have been refunded. Please try generating with Seedance.';
    }

    // If context is unspecified or general, infer from error content
    if (lower.includes('google') || lower.includes('gemini') || lower.includes('responsible ai') || lower.includes('violates google') || lower.includes('veo') || lower.includes('omni')) {
      return '⚠️ Google Policy Restriction: Google does not support this content due to policy restrictions. 100% of your Shorts credits have been refunded. Please try generating with Seedance.';
    }

    return '⚠️ Policy Restriction: This content was flagged by safety policies. 100% of your Shorts credits have been refunded. Please try with a different prompt, a different reference image, or a different person/character.';
  }

  // 2. Client-side input validation errors (keep intact for clear UX guidance)
  if (
    lower.includes('please upload') ||
    lower.includes('please select') ||
    lower.includes('attach a file') ||
    lower.includes('fill headline') ||
    lower.includes('shorter video') ||
    lower.includes('30 seconds or less') ||
    lower.includes('no prompt') ||
    lower.includes('prompt is required') ||
    lower.includes('at least one reference')
  ) {
    return str
      .replace(/kie(\.ai)?/gi, 'ZeroLens')
      .replace(/higgsfield/gi, 'ZeroLens')
      .replace(/xbuild|xfield/gi, 'ZeroLens')
      .replace(/ark/gi, 'ZeroLens');
  }

  // 3. Video resolution limits
  if (lower.includes('pixel count') || lower.includes('409600')) {
    return 'Reference Video Resolution Too Low: Reference videos require a resolution of at least 409,600 pixels (e.g. 640x640, 854x480, or 1280x720). Please upload a higher resolution video.';
  }

  // 4. User's personal account Shorts balance
  if (
    (lower.includes('insufficient') && (lower.includes('shorts') || lower.includes('balance') || lower.includes('credits'))) &&
    !lower.includes('kie') && !lower.includes('higgsfield') && !lower.includes('api') && !lower.includes('prepayment') && !lower.includes('server')
  ) {
    return 'Insufficient Shorts balance. Please top up your Shorts credits in the top navigation or pricing tab to continue.';
  }

  // 5. Vendor names, backend credits, upstream outages, quotas, timeouts, 500s, crashes
  return 'High server demand or temporary service interruption. Any deducted Shorts have been refunded. Please try again or contact support at support@zerolens.in.';
}

export default sanitizeUserErrorMessage;
