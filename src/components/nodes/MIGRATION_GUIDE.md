# 🚀 AUTO STORY ENGINE - MIGRATION GUIDE

## 📋 CHANGES SUMMARY

This update transforms your Auto Story node from a simple storyboard generator into an intelligent, context-aware shot planner with varied camera angles and actions.

---

## 🎯 KEY IMPROVEMENTS

### Before
- ❌ All shots looked similar (same prompt structure)
- ❌ No camera angle variation
- ❌ No product-only mode support
- ❌ Niche styles not deeply integrated
- ❌ No shot-level customization

### After
- ✅ **30+ camera angles** (close-up, wide, tracking, macro, etc.)
- ✅ **30+ actions** (walking, holding product, jumping, etc.)
- ✅ **Product-only mode** (generates shots without people)
- ✅ **Character + Product mode** (natural product interaction)
- ✅ **Character-only mode** (lifestyle/portrait shots)
- ✅ **Style Primers** (niche-specific visual DNA)
- ✅ **Session consistency** (same lighting/color across shots)
- ✅ **Smart shot planning** (hook → dynamic → hero outro)

---

## 📁 FILE STRUCTURE

```
/src
├── /engine
│   └── autoStoryEngine.js          ← NEW: Core shot planning logic
├── /nodes
│   └── AutoStoryNode.jsx            ← UPDATED: Node component
└── /services
    └── geminiService.js             ← UNCHANGED (uses your existing image gen)
```

---

## 🔧 STEP 1: Add Engine File

**Location:** `/src/engine/autoStoryEngine.js`

**Copy from:** `autoStoryEngine.js` (provided in output files)

**What it contains:**
- `DURATIONS` - Duration to shot count mapping
- `STYLE_PRIMERS` - Visual DNA for each niche
- `SHOT_TEMPLATES` - Camera angles & actions library
- `detectContextMode()` - Detects product-only vs character modes
- `buildShotPlan()` - Generates varied shot structure
- `buildPromptFromShot()` - Creates context-aware prompts

---

## 🔧 STEP 2: Update AutoStory Node

**Location:** `/src/nodes/AutoStoryNode.jsx`

**Replace with:** `AutoStoryNode_Updated.jsx` (provided in output files)

### Key Changes:

#### Import Engine (Line ~8)
```javascript
import {
    DURATIONS,
    buildShotPlan,
    buildPromptFromShot,
    detectContextMode
} from '../../engine/autoStoryEngine';
```

#### Detect Context Mode (Line ~133)
```javascript
const contextMode = detectContextMode(activeInputs);
```

#### Updated Generation Logic (Line ~145-230)
```javascript
const handleGenerateStoryboard = async () => {
    // 1️⃣ Create session seed
    const sessionSeed = `SESSION_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 2️⃣ Build shot plan with variations
    const shotPlan = buildShotPlan({
        inputs: activeInputs,
        niche: selectedNiche,
        duration: sceneDuration
    });

    // 3️⃣ Generate each shot with unique prompt
    const shotPromises = shotPlan.map(async (shot) => {
        const prompt = buildPromptFromShot(
            activeInputs,
            shot,
            selectedNiche,
            aspectRatio,
            sessionSeed
        );

        const imageUrl = await generateCharacterImage({
            prompt,
            aspectRatio,
            modelEngine: selectedModel,
            consistencyRefs
        });

        return {
            shotNumber: shot.shotNumber,
            role: shot.role,
            camera: shot.camera,    // NEW
            action: shot.action,    // NEW
            prompt,
            image: imageUrl
        };
    });

    const generatedScenes = await Promise.all(shotPromises);
    updateNodeData(id, { scenes: generatedScenes });
};
```

#### New Context Mode Display (Line ~350-375)
Shows what mode the engine is in:
- 📦 PRODUCT ONLY
- 👤 CHARACTER + 📦 PRODUCT
- 👤 CHARACTER ONLY
- ⚠️ Connect nodes

---

## 🎬 HOW IT WORKS NOW

### Example 1: Product Only Mode

**User connects:**
- Product node only

**Engine detects:**
```javascript
contextMode = "product_only"
```

**Generated shots (30s = 8 shots):**
```
Shot 1: extreme close-up reveal, product showcase reveal
Shot 2: macro extreme close-up, demonstrating product feature
Shot 3: floating product beauty shot, texture highlight
Shot 4: 360-degree rotating view, feature demonstration
Shot 5: overhead tracking start, unboxing reveal moment
Shot 6: symmetrical centered composition, material showcase
Shot 7: reflection shot mirror surface, detail inspection
Shot 8: hero shot wide angle, confident product hold
```

**Prompt example (Shot 1):**
```
Clean studio product showcase. Soft diffused lighting. Commercial photography precision.

Session ID: SESSION_1234567_abc12
Maintain consistent lighting and color grading across all shots.

PRODUCT FOCUS MODE - No people in frame

Shot 1: hook
Camera Angle: extreme close-up reveal
Action: product showcase reveal

Product Details:
Luxury Swiss watch with silver band, sapphire crystal

Location/Background:
Dark marble surface with soft gradient

Aspect Ratio: 9:16

Ultra realistic. Professional commercial product photography. No people visible.
```

---

### Example 2: Character + Product Mode

**User connects:**
- Character node (Identity)
- Product node
- Wardrobe node
- Location node

**Engine detects:**
```javascript
contextMode = "character_with_product"
```

**Generated shots (30s = 8 shots):**
```
Shot 1: dynamic push-in, bold confident entrance
Shot 2: medium shot, naturally holding product
Shot 3: tracking shot following subject, demonstrating product feature
Shot 4: over-the-shoulder, product in use closeup
Shot 5: low angle power shot, confident striding forward
Shot 6: close-up detail, satisfied smile
Shot 7: bokeh depth of field, proud presentation
Shot 8: signature pose medium, memorable signature pose
```

**Prompt example (Shot 3):**
```
High fashion editorial. Sharp lighting. Premium styling. Vogue aesthetic.

Session ID: SESSION_1234567_abc12
Maintain consistent lighting and color grading across all shots.
STRICT IDENTITY LOCK: Maintain exact same face and features across all shots.

Shot 3: dynamic_scene
Camera Angle: tracking shot following subject
Action: demonstrating product feature

Character:
Athletic woman, 25-30 years old, professional model

Wardrobe:
Black athletic wear, Nike running shoes

Product Interaction:
Wireless headphones with active noise cancellation

Location:
Urban street, modern cityscape background

Aspect Ratio: 9:16

Ultra realistic. Cinematic lighting. Character naturally interacting with product.
```

---

## 🧪 TESTING CHECKLIST

### Test 1: Product Only
- [ ] Connect only Product node
- [ ] Select "PRODUCT HERO" niche
- [ ] Generate 30s (8 shots)
- [ ] Verify: No people in any shot
- [ ] Verify: Each shot has different angle

### Test 2: Character + Product
- [ ] Connect Character + Product + Wardrobe
- [ ] Select "FASHION" niche
- [ ] Generate 30s (8 shots)
- [ ] Verify: Character appears in all shots
- [ ] Verify: Product visible and naturally integrated
- [ ] Verify: Varied poses/angles

### Test 3: Character Only
- [ ] Connect only Character + Wardrobe
- [ ] Select "LIFESTYLE VLOG" niche
- [ ] Generate 15s (6 shots)
- [ ] Verify: No product in shots
- [ ] Verify: Natural lifestyle poses

### Test 4: Long Duration
- [ ] Any mode
- [ ] Select 120s (18 shots)
- [ ] Verify: All 18 shots are unique
- [ ] Verify: No repeated angles/actions

---

## 🎨 SHOT VARIETY BREAKDOWN

### Camera Angles (30 options)
- **Classic:** medium shot, wide, close-up, over-shoulder
- **Dynamic:** low angle, high angle, dutch tilt, tracking
- **Product:** macro, floating, 360-degree, split-screen
- **Cinematic:** silhouette, bokeh, lens flare, reflection
- **Fashion:** full-body, three-quarter, candid, walking
- **Creative:** symmetrical, rule of thirds, negative space

### Actions (30 options)
- **Product:** holding, demonstrating, unboxing, in-use
- **Lifestyle:** walking, pause, striding, looking back
- **Dynamic:** motion blur, jumping, hair flip, spinning
- **Emotional:** surprise, smile, focus, gesture
- **Environmental:** interacting, leaning, sitting, doorway
- **Technical:** inspection, texture, feature, material

---

## 🔍 DEBUGGING

### Check Context Mode Detection
```javascript
console.log('Context Mode:', contextMode);
console.log('Inputs:', activeInputs);
```

Expected outputs:
- Product only: `contextMode = "product_only"`
- Char + Prod: `contextMode = "character_with_product"`
- Char only: `contextMode = "character_only"`
- Nothing: `contextMode = "empty"`

### Check Shot Plan
```javascript
console.log('Shot Plan:', shotPlan);
```

Expected output:
```javascript
[
  { role: "hook", shotNumber: 1, camera: "...", action: "...", contextMode: "..." },
  { role: "dynamic_scene", shotNumber: 2, camera: "...", action: "...", contextMode: "..." },
  // ... more shots ...
  { role: "hero_outro", shotNumber: 8, camera: "...", action: "...", contextMode: "..." }
]
```

### Check Prompts
```javascript
console.log(`[SHOT ${shot.shotNumber}]`, prompt);
```

Verify:
- [ ] Style primer included
- [ ] Session seed present
- [ ] Camera angle specified
- [ ] Action specified
- [ ] Context-appropriate (product-only vs character)

---

## 🚨 COMMON ISSUES

### Issue: All shots look the same
**Cause:** Shot plan not shuffling properly
**Fix:** Check `shuffleArray()` function is working

### Issue: Character appears in product-only mode
**Cause:** Context detection failing
**Fix:** Verify `detectContextMode()` logic, check node connections

### Issue: Missing camera angles in output
**Cause:** Scene data not saving properly
**Fix:** Check `updateNodeData()` includes camera/action fields

### Issue: Prompts too long
**Cause:** Excessive detail in inputs
**Fix:** Trim location/wardrobe descriptions to key details

---

## 📊 PERFORMANCE

### Image Generation Time
- **4 shots (10s):** ~20-30 seconds (parallel generation)
- **8 shots (30s):** ~30-45 seconds
- **18 shots (120s):** ~60-90 seconds

### Optimization Tips
1. Use `gemini-2.5-flash-image` for speed
2. Parallel generation already implemented
3. Session seed ensures consistency without re-generation

---

## 🎯 NEXT STEPS (Optional Enhancements)

### 1. Shot Thumbnails
Display tiny preview thumbnails in ShotCard

### 2. Regenerate Individual Shots
Allow user to regenerate just one shot without redoing all

### 3. Shot Reordering
Drag-and-drop to reorder shots

### 4. Custom Shot Templates
Let users save custom camera/action combinations

### 5. Niche-Specific Shot Priorities
Make certain niches prefer certain angles (e.g., Fashion → full-body, Product → macro)

---

## ✅ MIGRATION COMPLETE

Your Auto Story Engine now generates truly varied, context-aware storyboards!

**Test the following scenarios:**
1. Product-only storyboard
2. Character + Product storyboard
3. Character-only storyboard
4. Different durations (10s, 30s, 60s, 120s)
5. Different niches (Fashion, Product, Cinematic, etc.)

Each generation should produce unique shots with varied camera angles and actions!
