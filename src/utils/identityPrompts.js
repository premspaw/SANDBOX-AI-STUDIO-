/**
 * Returns optimized prompts based on visual style.
 * @param {string} style - 'Realistic' | 'Anime' | 'Cyberpunk' etc.
 */
export const getIdentityPrompts = (style = 'Realistic') => {
  if (style === 'Ultra Realistic') {
    const RAW_NEGATIVE_PROMPT = "Avoid: cinematic, dramatic lighting, movie poster, 3d render, anime, illustration, painting, bokeh, blur, depth of field, makeup, airbrushed, photoshop, studio lighting, volumetric fog, glamour shot";

    return {
      anchor: `
          Raw photo of this person, completely front-facing, straight-on angle. 
          Style: Passport photo, Driver's License photo.
          Lighting: Flat, neutral, flash photography. 
          Details: Visible skin pores, imperfections, no makeup, 1:1 Identity match.
          Background: Plain white wall.
          Camera: Shot on iPhone, 50mm lens, sharp focus everywhere.
          ${RAW_NEGATIVE_PROMPT}
        `,
      profile: `
          Raw photo of this person from a side profile view (90 degrees). 
          Style: Mugshot side view, medical reference.
          Lighting: Harsh, realistic, neutral. 
          Details: Exact nose shape, jawline structure, ear shape. 
          Background: Plain neutral background.
          ${RAW_NEGATIVE_PROMPT}
        `,
      expression: `
          Raw candid selfie of this person shouting. 
          Expression: Angry, mouth wide open, teeth visible, aggressive. 
          Lighting: Front flash, hard shadows. 
          Details: Forehead veins, skin texture stretching. 
          Angle: Slightly close-up, mobile phone camera distortion.
          ${RAW_NEGATIVE_PROMPT}
        `,
      halfBody: `
          Medium shot, half-body photo of this person standing straight. 
          Style: Casual snapshot, mirror selfie style.
          Clothing: Neutral grey t-shirt. 
          Lighting: Overhead fluorescent lighting (shopping mall style).
          Details: Torso proportions, shoulder width, collarbones.
          ${RAW_NEGATIVE_PROMPT}
        `,
      fullBody: `
          Wide shot, full body photo of this person standing against a plain wall.
          Style: Casting call photo, polaroid style.
          Clothing: Neutral simple clothing, barefoot.
          Camera: Shot on iPhone, wide angle lens.
          Details: Full height, leg proportions, posture, realistic body type. 
          No artistic angles, camera at eye level.
          ${RAW_NEGATIVE_PROMPT}
        `,
      closeUp: `
          Extreme close-up macro photo of this person's eye and face details. 
          Focus: Iris detail, skin pores, eyelashes. 
          Lighting: Soft side lighting to reveal texture.
          Details: Micro-details of facial features.
          ${RAW_NEGATIVE_PROMPT}
        `
    };
  } else {
    // Default / Stylized Prompts
    const styleModifier =
      style === 'Anime' ? "Anime style, 2D animation style, Studio Ghibli style, vibrant colors." :
        style === 'Cartoon' ? "3D Cartoon style, Pixar style, expressive features, soft lighting." :
          style === 'Cinematic' ? "Cinematic lighting, movie scene, dramatic depth of field, color graded." :
            style === 'Cyberpunk' ? "Cyberpunk style, neon lighting, high tech, gritty future." :
              style === 'Ethereal' ? "Ethereal style, dreamlike, soft glow, angelic, fantasy art." :
                "Photorealistic, high fidelity, neutral lighting.";

    return {
      anchor: `Recreate this person, completely front-facing, straight-on angle like a passport photo. 1:1 Identity match. White background. Factual description. ${styleModifier}`,
      profile: `Same person from a side profile view (90 degrees). Keep all identity markers, freckles, nose shape identical. Neutral background. Rebuild this person from side angle. ${styleModifier}`,
      expression: `Same person, strong angry expression. Mouth open wide in a shout, showing upper and lower teeth. Lips stretched, eyebrows pulled down. Keep identity 1:1. ${styleModifier}`,
      halfBody: `Medium shot, half-body photo of this person. Shoulders, collarbones, and torso proportions visible. Neutral clothing, standing straight. Maintain facial identity. ${styleModifier}`,
      fullBody: `Wide shot, full body photo of this person. Standing straight, barefoot, neutral clothing. Show overall silhouette, limb proportions, posture, and leg anatomy. ${styleModifier}`,
      closeUp: `Macro close-up shot of this person's face. Focus on iris detail, skin texture, and fine facial features. Maintain 1:1 identity consistency. ${styleModifier}`
    };
  }
};
