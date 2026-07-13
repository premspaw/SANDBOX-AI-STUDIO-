export interface HookTemplate {
  id: string;
  name: string;
  categoryId: string;
  bestFor: string;
  visualPrompt: string;
  exampleDialogue: string;
}

export interface HookCategory {
  id: string;
  name: string;
  icon?: string;
}

export const HOOK_CATEGORIES: HookCategory[] = [
  { id: 'attention', name: 'Attention Hooks', icon: '🚨' },
  { id: 'transformation', name: 'Transformation Hooks', icon: '✨' },
  { id: 'product', name: 'Product Hooks', icon: '📦' },
  { id: 'cinematic', name: 'Cinematic Hooks', icon: '🎬' },
  { id: 'interactive', name: 'Interactive Hooks', icon: '🖱️' },
  { id: 'comedy', name: 'Comedy Hooks', icon: '😂' },
  { id: 'emotional', name: 'Emotional Hooks', icon: '🎭' },
  { id: 'wtf', name: 'WTF Hooks', icon: '🤯' },
];

export const HOOK_TEMPLATES: HookTemplate[] = [
  {
    id: 'hook_1',
    name: 'Finger Snap',
    categoryId: 'transformation',
    bestFor: 'Show before vs after instantly',
    visualPrompt: 'Length: 3 seconds. One continuous shot. No cuts. No scene changes unless specified.\n\nThe creator stands naturally in a modern bedroom, looking directly into the camera. At the exact moment they snap their fingers, the entire room instantly transforms into a luxury penthouse while the creator\'s position, facial expression, body posture, and camera framing remain perfectly identical.\n\nNatural movement, realistic physics, cinematic lighting, seamless transition, photorealistic, shallow depth of field, handheld smartphone camera, authentic UGC style. No subtitles. No background music. Natural room ambience only.',
    exampleDialogue: "I wasn't expecting this..."
  },
  {
    id: 'hook_2',
    name: 'Walk Into Camera',
    categoryId: 'attention',
    bestFor: 'Seamless location transitions',
    visualPrompt: 'Length: 3 seconds. One continuous shot. No cuts.\n\nThe creator walks directly toward the camera until their hand completely covers the lens. As the hand moves away, they are standing in a completely different location. Natural movement, cinematic realism, pure UGC camera style. No subtitles. No background music.',
    exampleDialogue: "Let me show you a secret."
  },
  {
    id: 'hook_3',
    name: 'Throw Product',
    categoryId: 'product',
    bestFor: 'High-energy product reveal',
    visualPrompt: 'Length: 4 seconds. One continuous cinematic motion.\n\nThe creator tosses a product toward the camera. As it fills the frame, the scene seamlessly transitions into a cinematic close-up of the product on a premium table before quickly returning to the creator catching it. Natural lighting, realistic motion blur. No subtitles. No background music.',
    exampleDialogue: "Everyone is doing this wrong."
  },
  {
    id: 'hook_4',
    name: 'Text Appears',
    categoryId: 'interactive',
    bestFor: 'Highlighting keywords',
    visualPrompt: 'Length: 3 seconds. One continuous shot. No cuts.\n\nThe creator points beside their face. Large floating 3D text appears beside them exactly when they point, matching their movement with subtle animations. Authentic UGC style, handheld camera feeling. No subtitles. No background music.',
    exampleDialogue: "Three reasons why..."
  },
  {
    id: 'hook_5',
    name: 'Freeze Time',
    categoryId: 'cinematic',
    bestFor: 'Scroll-stopping opening',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nEverything behind the creator freezes instantly while only the creator continues moving and speaking naturally to the camera. Dust particles remain suspended in the air, creating a cinematic frozen-time effect. Photorealistic, shallow depth of field. No subtitles. No background music.',
    exampleDialogue: "Everything changed when I found this."
  },
  {
    id: 'hook_6',
    name: 'Camera Push',
    categoryId: 'cinematic',
    bestFor: 'Dramatic or secret reveal',
    visualPrompt: 'Length: 3 seconds. One continuous cinematic camera move. No cuts.\n\nThe camera starts in a medium shot and rapidly pushes into an extreme close-up on the creator\'s face during the first sentence with dramatic depth of field. Realistic human motion. No subtitles. No background music.',
    exampleDialogue: "I can't believe I'm sharing this."
  },
  {
    id: 'hook_7',
    name: 'Clone',
    categoryId: 'comedy',
    bestFor: 'Quirky or energetic intro',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThree identical versions of the creator appear beside each other, looking at the camera. Each delivers one part of the dialogue before disappearing with a seamless natural effect. Authentic home environment, casual lighting. No subtitles. No background music.',
    exampleDialogue: "Wait. Stop. Listen."
  },
  {
    id: 'hook_8',
    name: 'Product Pop',
    categoryId: 'product',
    bestFor: 'Magical item introduction',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nThe creator raises an empty hand toward the camera. The product instantly materializes in their hand with cinematic particles and realistic lighting, perfectly matching their hand\'s posture. Photorealistic, natural movement. No subtitles. No background music.',
    exampleDialogue: "This is why everyone is switching."
  },
  {
    id: 'hook_9',
    name: 'Before & After',
    categoryId: 'transformation',
    bestFor: 'Showcasing real results',
    visualPrompt: 'Length: 4 seconds. No cuts.\n\nA split screen shows two versions of the creator simultaneously. One looks tired with messy hair, while the other looks confident and polished. The split seamlessly merges into the confident creator halfway through. Natural lighting, UGC style. No subtitles. No background music.',
    exampleDialogue: "I wish someone told me this earlier."
  },
  {
    id: 'hook_10',
    name: 'Phone Screen',
    categoryId: 'interactive',
    bestFor: 'App or digital product reveals',
    visualPrompt: 'Length: 4 seconds. Continuous zoom.\n\nThe creator holds their phone toward the camera. The camera smoothly pushes forward until the phone screen fills the entire frame, transporting the viewer seamlessly inside the phone\'s interface before pulling back to reality. Cinematic lighting. No subtitles. No background music.',
    exampleDialogue: "You need to see this app."
  },
  {
    id: 'hook_11',
    name: 'Emotional Breakdown',
    categoryId: 'emotional',
    bestFor: 'Vulnerability and storytelling',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator begins speaking confidently, then suddenly pauses, looks down, and takes a deep breath as if holding back emotion. After a brief silence, they look back into the camera and continue speaking naturally. Cinematic close-up with subtle handheld movement. No subtitles. No background music.',
    exampleDialogue: "I wasn't going to share this..."
  },
  {
    id: 'hook_12',
    name: 'Eyes Fill With Tears',
    categoryId: 'emotional',
    bestFor: 'Deep emotional connection',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nStart with an extreme close-up of the creator\'s eyes. Their eyes slowly become watery while maintaining eye contact with the camera. They blink once, smile softly, and begin speaking. Photorealistic, natural lighting. No subtitles. No background music.',
    exampleDialogue: "This changed my entire life."
  },
  {
    id: 'hook_13',
    name: 'Smile Disappears',
    categoryId: 'emotional',
    bestFor: 'Serious announcements',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nThe creator starts with a bright smile that slowly fades into a serious expression within two seconds before delivering the first line. Authentic UGC style. No subtitles. No background music.',
    exampleDialogue: "We need to talk about this."
  },
  {
    id: 'hook_14',
    name: 'Walking Away Then Turning Back',
    categoryId: 'attention',
    bestFor: 'Dramatic re-engagement',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator walks away from the camera. After two steps, they suddenly stop, slowly turn around, and walk directly toward the camera while speaking. Cinematic realism, handheld motion. No subtitles. No background music.',
    exampleDialogue: "Wait, one more thing."
  },
  {
    id: 'hook_15',
    name: 'Heavy Sigh',
    categoryId: 'emotional',
    bestFor: 'Relatable frustration',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator exhales deeply, rubs their forehead, briefly closes their eyes, then looks directly into the lens and starts talking. Natural room ambience, authentic lighting. No subtitles. No background music.',
    exampleDialogue: "I'm so exhausted by this."
  },
  {
    id: 'hook_16',
    name: 'Cover Face Reveal',
    categoryId: 'attention',
    bestFor: 'Surprise or realization',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nThe creator covers their face with both hands for a moment. Slowly lowering their hands reveals a calm, determined expression before speaking. No subtitles. No background music.',
    exampleDialogue: "I finally figured it out."
  },
  {
    id: 'hook_17',
    name: 'Looking at the Floor',
    categoryId: 'emotional',
    bestFor: 'Introspective thoughts',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nThe creator stares silently at the floor. After two seconds, they slowly lift their head and make direct eye contact with the viewer. No subtitles. No background music.',
    exampleDialogue: "I've been thinking a lot lately."
  },
  {
    id: 'hook_18',
    name: 'Mirror Reflection',
    categoryId: 'cinematic',
    bestFor: 'Theatrical intros',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe video begins with the creator looking into a mirror. They slowly turn away from the reflection and begin speaking directly to the camera. Cinematic lighting, shallow depth of field. No subtitles. No background music.',
    exampleDialogue: "You won't believe what happened."
  },
  {
    id: 'hook_19',
    name: 'Sitting Alone',
    categoryId: 'emotional',
    bestFor: 'Intimate conversation',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator sits alone in a quiet room, elbows resting on their knees. After a moment of silence, they lean forward and begin talking. Moody natural lighting. No subtitles. No background music.',
    exampleDialogue: "Let me be honest with you."
  },
  {
    id: 'hook_20',
    name: 'Slow Clap',
    categoryId: 'comedy',
    bestFor: 'Sarcastic or disappointed tone',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nThe creator slowly claps once or twice while maintaining a disappointed facial expression before speaking. Authentic UGC style. No subtitles. No background music.',
    exampleDialogue: "Wow, just wow."
  },
  {
    id: 'hook_21',
    name: 'Phone Drop',
    categoryId: 'comedy',
    bestFor: 'Shocking news or realization',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nThe creator looks shocked after reading something on their phone. The phone slips slightly from their hand before they look at the camera. Realistic physics and motion. No subtitles. No background music.',
    exampleDialogue: "Did you guys see this?"
  },
  {
    id: 'hook_22',
    name: 'Chair Spin',
    categoryId: 'attention',
    bestFor: 'Dynamic seated intro',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nThe creator is seated facing away from the camera. They slowly rotate the chair 180 degrees to face the viewer and immediately begin speaking. Cinematic realism. No subtitles. No background music.',
    exampleDialogue: "We need to have a chat."
  },
  {
    id: 'hook_23',
    name: 'Window Gaze',
    categoryId: 'cinematic',
    bestFor: 'Contemplative storytelling',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator stands beside a window looking outside thoughtfully. They slowly turn toward the camera and begin talking. Soft natural window light. No subtitles. No background music.',
    exampleDialogue: "I realized something today."
  },
  {
    id: 'hook_24',
    name: 'Coffee Freeze',
    categoryId: 'comedy',
    bestFor: 'Unexpected realization',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nThe creator is about to take a sip of coffee but suddenly freezes halfway, looks at the camera, and starts speaking. Authentic casual environment. No subtitles. No background music.',
    exampleDialogue: "Wait a second..."
  },
  {
    id: 'hook_25',
    name: 'Slow Zoom While Silent',
    categoryId: 'cinematic',
    bestFor: 'Building tension',
    visualPrompt: 'Length: 4 seconds. Continuous zoom.\n\nThe creator remains completely silent as the camera slowly zooms in over two seconds. Only after the zoom finishes do they begin speaking. Dramatic cinematic tension. No subtitles. No background music.',
    exampleDialogue: "Listen closely."
  },
  {
    id: 'hook_26',
    name: 'Falling Papers',
    categoryId: 'vfx',
    bestFor: 'Chaotic situation intro',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nSheets of paper suddenly fall around the creator while they remain perfectly calm and continue looking at the camera. Cinematic slow motion effect on papers only. No subtitles. No background music.',
    exampleDialogue: "Things are getting out of hand."
  },
  {
    id: 'hook_27',
    name: 'Rain Appears',
    categoryId: 'environment_change',
    bestFor: 'Sudden mood shifts',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nLight rain suddenly begins falling around the creator while they continue speaking without reacting. Photorealistic VFX, cinematic lighting. No subtitles. No background music.',
    exampleDialogue: "I can't ignore this anymore."
  },
  {
    id: 'hook_28',
    name: 'Wind Explosion',
    categoryId: 'vfx',
    bestFor: 'High impact statements',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nA dramatic gust of wind blows through the scene, moving hair and clothing naturally as the creator remains steady. Realistic physics. No subtitles. No background music.',
    exampleDialogue: "This is going to blow your mind."
  },
  {
    id: 'hook_29',
    name: 'Lights Flicker',
    categoryId: 'cinematic',
    bestFor: 'Spooky or dramatic intros',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nThe room lights flicker briefly before stabilizing. The creator smiles slightly and starts talking. Cinematic lighting. No subtitles. No background music.',
    exampleDialogue: "Are you ready for this?"
  },
  {
    id: 'hook_30',
    name: 'Clock Stops',
    categoryId: 'vfx',
    bestFor: 'Time-saving or urgent hooks',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nA large wall clock behind the creator suddenly freezes while everything else continues moving normally. Subtle visual effect. No subtitles. No background music.',
    exampleDialogue: "Stop wasting your time."
  },
  {
    id: 'hook_31',
    name: 'Crowd Vanishes',
    categoryId: 'vfx',
    bestFor: 'Focusing attention',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator stands in a crowded place. Everyone suddenly disappears, leaving only the creator in complete silence. Seamless VFX transition. No subtitles. No background music.',
    exampleDialogue: "It's just you and me now."
  },
  {
    id: 'hook_32',
    name: 'Shadow Moves Alone',
    categoryId: 'vfx',
    bestFor: 'Creepy or mysterious intros',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nThe creator stands still while their shadow moves independently for a brief moment before returning to normal. Photorealistic lighting and VFX. No subtitles. No background music.',
    exampleDialogue: "Something isn't right."
  },
  {
    id: 'hook_33',
    name: 'Birds Suddenly Fly',
    categoryId: 'vfx',
    bestFor: 'Dynamic outdoor intro',
    visualPrompt: 'Length: 3 seconds. One continuous shot.\n\nA flock of birds suddenly flies across the frame behind the creator as they begin speaking. Natural cinematic motion. No subtitles. No background music.',
    exampleDialogue: "You won't believe this."
  },
  {
    id: 'hook_34',
    name: 'Black and White Transition',
    categoryId: 'cinematic',
    bestFor: 'Highlighting the subject',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe scene starts in full color. Everything except the creator gradually becomes black and white. Smooth color grading transition. No subtitles. No background music.',
    exampleDialogue: "Let's focus on what matters."
  },
  {
    id: 'hook_35',
    name: 'Slow Motion Entrance',
    categoryId: 'cinematic',
    bestFor: 'Epic or confident intros',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator walks toward the camera in dramatic slow motion while everything around them moves at normal speed. High frame rate aesthetic. No subtitles. No background music.',
    exampleDialogue: "I've been waiting for this."
  },
  {
    id: 'hook_36',
    name: 'Reflection Doesn\'t Match',
    categoryId: 'vfx',
    bestFor: 'Mind-bending or secret reveals',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator walks past a mirror, but their reflection performs a different movement before matching reality again. Seamless VFX execution. No subtitles. No background music.',
    exampleDialogue: "Look closely."
  },
  {
    id: 'hook_37',
    name: 'Floating Chair',
    categoryId: 'vfx',
    bestFor: 'Surreal or magical hooks',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator remains seated while the chair slowly levitates a few inches above the ground before settling back down. Photorealistic gravity physics. No subtitles. No background music.',
    exampleDialogue: "This is completely unbelievable."
  },
  {
    id: 'hook_38',
    name: 'Wall Opens',
    categoryId: 'transformation',
    bestFor: 'Grand reveals',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe wall behind the creator slowly opens to reveal a completely different cinematic environment while the creator remains still. Epic cinematic transition. No subtitles. No background music.',
    exampleDialogue: "Welcome to the other side."
  },
  {
    id: 'hook_39',
    name: 'Time Rewinds',
    categoryId: 'vfx',
    bestFor: 'Correcting mistakes or looking back',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nObjects around the creator briefly move backward as if time is reversing, while the creator continues speaking normally. Smooth temporal VFX. No subtitles. No background music.',
    exampleDialogue: "Let's take a step back."
  },
  {
    id: 'hook_40',
    name: 'Giant Moon Appears',
    categoryId: 'environment_change',
    bestFor: 'Dreamy or epic setups',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nA massive cinematic moon slowly rises in the background behind the creator, dramatically changing the atmosphere while they continue speaking. Epic scale, photorealistic. No subtitles. No background music.',
    exampleDialogue: "This is out of this world."
  },
  {
    id: 'hook_41',
    name: 'Ceiling Drop',
    categoryId: 'wtf',
    bestFor: 'Completely unexpected intro',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe video begins with the creator unexpectedly dropping from the ceiling onto a soft couch or bean bag. They land naturally, sit up with a surprised smile, look directly at the camera, and immediately say the first sentence. One continuous shot with realistic physics. No subtitles. No background music.',
    exampleDialogue: "I bet you didn't see that coming."
  },
  {
    id: 'hook_42',
    name: 'Someone Standing Behind',
    categoryId: 'wtf',
    bestFor: 'Creepy or funny twist',
    visualPrompt: 'One continuous shot.\n\nThe creator is already speaking naturally to the camera while holding the featured product. A mysterious person is already standing silently directly behind the creator from the very beginning, completely hidden by the creator\'s body due to the camera angle. While speaking, the product accidentally slips out of the creator\'s hand and falls to the floor, appearing like a genuine clumsy mistake rather than a purposeful action. Without interrupting the dialogue, they quickly bend down to pick it up. As the creator bends, their body no longer blocks the view, briefly revealing the mysterious person standing perfectly still behind them, staring directly at the camera without any expression or movement. The creator grabs the product and stands back up, naturally covering the mysterious person again with their body. As if sensing something, the creator briefly glances over their shoulder with a slightly confused expression, sees nothing because the person remains fully hidden behind them, then smiles naturally and continues speaking to the camera. The mysterious person never moves, never appears, and never disappears—they remain standing in the exact same position throughout the entire shot. No subtitles. No background music.',
    exampleDialogue: "You won't believe what happened today."
  },
  {
    id: 'hook_43',
    name: 'Bend and Surprise',
    categoryId: 'wtf',
    bestFor: 'Instant location switch',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator bends down to pick up something from the floor. When they stand back up, the entire room has transformed into a different environment. Without reacting dramatically, they immediately begin speaking. No subtitles. No background music.',
    exampleDialogue: "So, let's talk about this."
  },
  {
    id: 'hook_44',
    name: 'Pulled Into Frame',
    categoryId: 'wtf',
    bestFor: 'High energy start',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nA hand suddenly reaches in from outside the frame and playfully pulls the creator into view. The creator stumbles slightly, regains balance, looks into the camera, and confidently starts the first sentence. No subtitles. No background music.',
    exampleDialogue: "I need you to hear this."
  },
  {
    id: 'hook_45',
    name: 'Frozen Crowd',
    categoryId: 'wtf',
    bestFor: 'Surreal focus',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nEveryone around the creator is completely frozen in place. The creator walks naturally through the motionless people, stops in front of the camera, smiles, and begins talking. No subtitles. No background music.',
    exampleDialogue: "Stop scrolling right now."
  },
  {
    id: 'hook_46',
    name: 'Falling Through the Floor',
    categoryId: 'wtf',
    bestFor: 'Reality glitch intro',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator suddenly drops through the floor for a brief moment. They immediately pop back up from the same spot, brush off their clothes, smile, and continue with the first sentence. No subtitles. No background music.',
    exampleDialogue: "Okay, that was weird."
  },
  {
    id: 'hook_47',
    name: 'Object Hits the Camera',
    categoryId: 'wtf',
    bestFor: 'Jump scare or transition',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nA pillow, jacket, or soft object flies toward the camera, briefly covering the lens. As it falls away, the creator is standing much closer to the camera and starts speaking immediately. No subtitles. No background music.',
    exampleDialogue: "Wake up!"
  },
  {
    id: 'hook_48',
    name: 'Chair Slide',
    categoryId: 'wtf',
    bestFor: 'Smooth entry',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator slides rapidly into frame while sitting on an office chair. They stop perfectly in front of the camera, lean forward naturally, and begin the first sentence. No subtitles. No background music.',
    exampleDialogue: "Let's get right into it."
  },
  {
    id: 'hook_49',
    name: 'Phone Teleport',
    categoryId: 'wtf',
    bestFor: 'Distracted to present transition',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator looks at their phone while walking. They glance up for a second, and suddenly they\'re in a completely different location. They smile and immediately continue talking. No subtitles. No background music.',
    exampleDialogue: "You have to see this."
  },
  {
    id: 'hook_50',
    name: 'Clone Pass',
    categoryId: 'wtf',
    bestFor: 'Mind-bending sequence',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator walks across the frame. As they pass behind a wall or doorway, another version of themselves walks out from the other side, creating a seamless clone transition before speaking. No subtitles. No background music.',
    exampleDialogue: "I'm seeing double today."
  },
  {
    id: 'hook_51',
    name: 'Door Slam Reveal',
    categoryId: 'wtf',
    bestFor: 'Sudden location change',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator opens a door expecting one room, but behind it is a completely unexpected location. They pause for a split second, step inside confidently, and start speaking. No subtitles. No background music.',
    exampleDialogue: "Welcome to my world."
  },
  {
    id: 'hook_52',
    name: 'Falling Clothes Rack',
    categoryId: 'wtf',
    bestFor: 'Accidental save',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nA clothes rack tips toward the creator. They catch it effortlessly with one hand, smile at the camera, and begin talking without missing a beat. No subtitles. No background music.',
    exampleDialogue: "I totally meant to do that."
  },
  {
    id: 'hook_53',
    name: 'Floating Entrance',
    categoryId: 'wtf',
    bestFor: 'Surreal peaceful start',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator slowly floats down from above and lands gently on the ground. They adjust their posture naturally, make eye contact with the camera, and start speaking. No subtitles. No background music.',
    exampleDialogue: "I just dropped in to say..."
  },
  {
    id: 'hook_54',
    name: 'Walking Through a Wall',
    categoryId: 'wtf',
    bestFor: 'Impossible physics',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator casually walks through what appears to be a solid wall and emerges into the room. They continue walking toward the camera and begin the first sentence. No subtitles. No background music.',
    exampleDialogue: "I had to break through to you."
  },
  {
    id: 'hook_55',
    name: 'Coffee Spill Freeze',
    categoryId: 'wtf',
    bestFor: 'Time manipulation',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nA cup of coffee tips over in slow motion, but the liquid freezes in mid-air. The creator calmly walks past the suspended splash, looks into the camera, and starts talking. No subtitles. No background music.',
    exampleDialogue: "Time is literally freezing."
  },
  {
    id: 'hook_56',
    name: 'Bed Flip',
    categoryId: 'wtf',
    bestFor: 'Action-packed transition',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator jumps backward onto a bed. As they land, they instantly appear standing in a completely different location without breaking the motion, then begin speaking. No subtitles. No background music.',
    exampleDialogue: "Let's bounce."
  },
  {
    id: 'hook_57',
    name: 'Elevator Surprise',
    categoryId: 'wtf',
    bestFor: 'Unexpected entrance',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nElevator doors open to reveal the creator unexpectedly inside a tiny elevator. They step out confidently, walk toward the camera, and begin the first sentence. No subtitles. No background music.',
    exampleDialogue: "Going up!"
  },
  {
    id: 'hook_58',
    name: 'Paper Burst',
    categoryId: 'wtf',
    bestFor: 'Dramatic chaotic reveal',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nHundreds of paper sheets suddenly fly through the room. As they settle, the creator is revealed standing confidently in the center, already making eye contact with the camera. No subtitles. No background music.',
    exampleDialogue: "The results are in."
  },
  {
    id: 'hook_59',
    name: 'Mirror Exit',
    categoryId: 'wtf',
    bestFor: 'Creepy dimension shift',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator appears inside a mirror reflection. They casually step out of the mirror into the real room and immediately begin talking to the camera. No subtitles. No background music.',
    exampleDialogue: "Reflect on this for a second."
  },
  {
    id: 'hook_60',
    name: 'Giant Box Reveal',
    categoryId: 'wtf',
    bestFor: 'Surprise delivery',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nA large cardboard box sits in the middle of the room. It suddenly opens, and the creator climbs out, laughs naturally, and starts speaking. No subtitles. No background music.',
    exampleDialogue: "Special delivery!"
  },
  {
    id: 'hook_61',
    name: 'Sky Drop',
    categoryId: 'wtf',
    bestFor: 'Epic entrance',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator suddenly falls from the sky and lands safely in front of the camera. They stand up naturally, dust off their clothes, smile confidently, and immediately begin speaking. No subtitles. No background music.',
    exampleDialogue: "I just fell from heaven."
  },
  {
    id: 'hook_62',
    name: 'Ceiling Walk',
    categoryId: 'wtf',
    bestFor: 'Gravity defying',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator casually walks upside down across the ceiling. Halfway through the room, they drop naturally onto the floor, look at the camera, and deliver the first sentence. No subtitles. No background music.',
    exampleDialogue: "My world is upside down."
  },
  {
    id: 'hook_63',
    name: 'Fridge Portal',
    categoryId: 'wtf',
    bestFor: 'Late night snack twist',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator opens a refrigerator door. Instead of food, it reveals another world. They casually step out from inside the refrigerator, close the door, and begin speaking. No subtitles. No background music.',
    exampleDialogue: "I was just looking for a snack."
  },
  {
    id: 'hook_64',
    name: 'TV Escape',
    categoryId: 'wtf',
    bestFor: 'Breaking the fourth wall',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator reaches through a television screen, climbs completely out of it into the room, dusts themselves off, and starts talking naturally. No subtitles. No background music.',
    exampleDialogue: "I couldn't stay in there anymore."
  },
  {
    id: 'hook_65',
    name: 'Photo Frame Exit',
    categoryId: 'wtf',
    bestFor: 'Art coming to life',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator is inside a framed photograph hanging on the wall. They suddenly step out of the frame into the real room and begin speaking without acknowledging the impossible moment. No subtitles. No background music.',
    exampleDialogue: "Picture this."
  },
  {
    id: 'hook_66',
    name: 'Clone Swap',
    categoryId: 'wtf',
    bestFor: 'Mind bending merge',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nTwo identical versions of the creator walk toward each other. As they cross paths, they seamlessly merge into one person, who continues walking toward the camera and begins speaking. No subtitles. No background music.',
    exampleDialogue: "Let's put our heads together."
  },
  {
    id: 'hook_67',
    name: 'Bed Launch',
    categoryId: 'wtf',
    bestFor: 'Energetic bounce',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator jumps backward onto a bed. Instead of landing, they bounce upward and land in a completely different location while continuing naturally into the first sentence. No subtitles. No background music.',
    exampleDialogue: "Let's bounce out of here."
  },
  {
    id: 'hook_68',
    name: 'Washing Machine Entrance',
    categoryId: 'wtf',
    bestFor: 'Random spawn',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nA washing machine door slowly opens. The creator casually climbs out, closes the door behind them, smiles, and begins talking to the camera. No subtitles. No background music.',
    exampleDialogue: "That was a spin cycle."
  },
  {
    id: 'hook_69',
    name: 'Door to Space',
    categoryId: 'wtf',
    bestFor: 'Cosmic scale',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator opens a normal bedroom door. Behind it is outer space with stars and planets. They step back into the room, close the door casually, and start speaking. No subtitles. No background music.',
    exampleDialogue: "I just needed some space."
  },
  {
    id: 'hook_70',
    name: 'Human Package Delivery',
    categoryId: 'wtf',
    bestFor: 'Unboxing yourself',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nA large shipping box is delivered into the room. The box suddenly opens, and the creator climbs out, stretches naturally, and immediately begins speaking. No subtitles. No background music.',
    exampleDialogue: "I just arrived."
  },
  {
    id: 'hook_71',
    name: 'Elevator Anywhere',
    categoryId: 'wtf',
    bestFor: 'Magical doors',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nElevator doors suddenly appear in the middle of the room. They open to reveal the creator inside. The creator steps out, the elevator disappears, and they start talking. No subtitles. No background music.',
    exampleDialogue: "I'm moving up."
  },
  {
    id: 'hook_72',
    name: 'Through the Mirror',
    categoryId: 'wtf',
    bestFor: 'Liquid glass transition',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator touches a mirror, causing ripples across the surface. They walk through the mirror into the room and begin speaking directly to the camera. No subtitles. No background music.',
    exampleDialogue: "It's time for some self-reflection."
  },
  {
    id: 'hook_73',
    name: 'Pull Yourself Into Reality',
    categoryId: 'wtf',
    bestFor: 'Tech boundary breaking',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator reaches into a laptop screen and grabs another version of themselves, pulling them into the real room. The second creator smiles and starts speaking. No subtitles. No background music.',
    exampleDialogue: "I literally pulled myself together."
  },
  {
    id: 'hook_74',
    name: 'Gravity Flip',
    categoryId: 'wtf',
    bestFor: 'Floating chaos',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nGravity suddenly changes. Furniture and loose objects float upward while the creator remains calmly standing, looking into the camera before beginning the first sentence. No subtitles. No background music.',
    exampleDialogue: "Everything is up in the air."
  },
  {
    id: 'hook_75',
    name: 'Freeze the World',
    categoryId: 'wtf',
    bestFor: 'God mode',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nEverything around the creator freezes completely in mid-motion. The creator casually walks through the frozen scene, stops in front of the camera, and begins speaking. No subtitles. No background music.',
    exampleDialogue: "I can stop time for this."
  },
  {
    id: 'hook_76',
    name: 'Rip Open Reality',
    categoryId: 'wtf',
    bestFor: 'Sci-fi portal',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator grabs the air with both hands and tears reality open like paper. Behind the tear is a completely different environment. They step through and continue speaking. No subtitles. No background music.',
    exampleDialogue: "Let's break the rules."
  },
  {
    id: 'hook_77',
    name: 'Phone Becomes a Door',
    categoryId: 'wtf',
    bestFor: 'Alice in Wonderland scale',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator places a smartphone against a wall. It instantly expands into a full-sized doorway. The creator walks through it and enters a completely different location before speaking. No subtitles. No background music.',
    exampleDialogue: "Let me show you a new perspective."
  },
  {
    id: 'hook_78',
    name: 'Catch Lightning',
    categoryId: 'wtf',
    bestFor: 'Superpower flex',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nA bolt of lightning strikes nearby. The creator catches the lightning in one hand as glowing energy, smiles confidently, and begins talking. No subtitles. No background music.',
    exampleDialogue: "I've got the power."
  },
  {
    id: 'hook_79',
    name: 'Pull the Sun Down',
    categoryId: 'wtf',
    bestFor: 'God scale environment',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator reaches into the sky and gently pulls the sun lower until it sits just behind them, creating dramatic golden lighting. They look into the camera and start speaking. No subtitles. No background music.',
    exampleDialogue: "I brought the light to you."
  },
  {
    id: 'hook_80',
    name: 'Walk Out of a Painting',
    categoryId: 'wtf',
    bestFor: 'Artistic spawn',
    visualPrompt: 'Length: 4 seconds. One continuous shot.\n\nThe creator is seen inside a large wall painting. They casually step out of the artwork into the room, leaving the painting empty, then begin speaking naturally. No subtitles. No background music.',
    exampleDialogue: "I am a masterpiece."
  }
];
