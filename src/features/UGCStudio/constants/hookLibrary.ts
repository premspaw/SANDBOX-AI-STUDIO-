// ─── NICHE HOOK LIBRARY ────────────────────────────────────────────────────────
// Viral Instagram hooks organized by content niche.
// The AI uses these to write scripts that open with proven viral hook patterns.
// Add new niches by following the same structure.

export interface NicheHook {
  hook: string;
  view_count: string;
  account_name: string;
}

export interface NicheDefinition {
  id: string;
  label: string;
  emoji: string;
  description: string;
  hooks: NicheHook[];
}

// ─── NICHES ───────────────────────────────────────────────────────────────────

export const HOOK_LIBRARY: Record<string, NicheDefinition> = {

  none: {
    id: 'none',
    label: 'No Niche',
    emoji: '🎯',
    description: 'Use general UGC hook patterns',
    hooks: [],
  },

  founder: {
    id: 'founder',
    label: 'Founder / Business',
    emoji: '🚀',
    description: 'Entrepreneur, startup, wealth, hustle culture',
    hooks: [
      { hook: "How to Start a Business in", view_count: "1.6M", account_name: "_.sweettssss" },
      { hook: "we have to start bro", view_count: "12.7M", account_name: "momikeree" },
      { hook: "Things you shouldn't do while your clients are waiting for you", view_count: "7.7M", account_name: "thezeinakhoury" },
      { hook: "Employees caught applying for jobs on LinkedIn at work", view_count: "14.6M", account_name: "mosaicdigital.ae" },
      { hook: "When the tax office requests proof that the Rolex is being used for business purposes", view_count: "7.7M", account_name: "bperloz" },
      { hook: "You are in your 20s at your corporate job", view_count: "7.1M", account_name: "th0tleaderlabs" },
      { hook: "Boys don't face tough decisions", view_count: "47M", account_name: "dropservice" },
      { hook: "\"but this business thing is too complicated\"", view_count: "10.9M", account_name: "jun_yuh" },
      { hook: "I MAKE A MILLION DOLLARS EVERY 10 WEEKS NOW WHICH IS CRAZY", view_count: "3.6M", account_name: "maria.wend" },
      { hook: "Never do business with friends", view_count: "3M", account_name: "digitalwealthmate" },
      { hook: "You don't actually live the life you show", view_count: "4.7M", account_name: "mikaelunscripted" },
      { hook: "WHY DONT THEY TEACH THIS IN SCHOOL", view_count: "16.1M", account_name: "chiefsbs" },
      { hook: "I trained ChatGPT to be my business mentor. I became so productive it felt illegal", view_count: "2.7M", account_name: "rossfledderjohn" },
      { hook: "HOW TO BUILD A BUSINESS WITH AI", view_count: "1.1M", account_name: "danmartell" },
      { hook: "this is 8 hours of someone's life", view_count: "7.6M", account_name: "latarshiahall" },
      { hook: "My business 2 years ago", view_count: "3.9M", account_name: "avigail.adam" },
      { hook: "Business Was Hard Until I Found This", view_count: "5.8M", account_name: "officialmoksalfati" },
      { hook: "Subjects you need to study to become a CEO", view_count: "2.4M", account_name: "womeninbiz_fam" },
      { hook: "Still sleeping while someone is a Millionaire at 17", view_count: "12.8M", account_name: "alexxmarketing" },
      { hook: "I made money because I followed the rules", view_count: "1.4M", account_name: "maria.wendt" },
      { hook: "BEST PLACES TO START A BUSINESS", view_count: "11.4M", account_name: "clarityofmindset" },
      { hook: "I let my wife book the Business Class tickets", view_count: "29.5M", account_name: "rohitsukheja" },
      { hook: "Dont take it personal It's just business", view_count: "1.9M", account_name: "coralsantoro" },
      { hook: "Business owners bank account be like", view_count: "2.6M", account_name: "copy_by_junaid" },
      { hook: "Rich people text back instantly Broke people text back slowly Not a coincidence bro.", view_count: "1.7M", account_name: "onlyfloriss" },
      { hook: "How to Make your First $1,000 as a Teen", view_count: "2.5M", account_name: "fortuneflipss" },
      { hook: "This feels like it should Be illegal!", view_count: "6.4M", account_name: "fiercesocialmedia" },
      { hook: "I don't have a team to start my business", view_count: "2.2M", account_name: "side.hustlle" },
      { hook: "The only page you'll ever need to make money", view_count: "6.8M", account_name: "alexxmarketing" },
      { hook: "I asked chatgpt: Act as my personal business coach and help me create a comprehensive plan", view_count: "1.1M", account_name: "digitallauraanderson" },
      { hook: "Business was hard until I found this", view_count: "2.1M", account_name: "moneymenttality" },
      { hook: "Play safe and die with regrets", view_count: "13.8M", account_name: "jacoblevinrad" },
      { hook: "You have a message from 2028", view_count: "4.7M", account_name: "laxustar" },
      { hook: "Never wrestle a pig in the mud", view_count: "5.4M", account_name: "eluxionar" },
      { hook: "YOU'RE A BILLIONAIRE", view_count: "12.2M", account_name: "dauntlessmentality" },
      { hook: "This is a Masterclass in Sales!", view_count: "11.5M", account_name: "tranquess" },
      { hook: "GENIUS MARKETING", view_count: "16.7M", account_name: "excelbranding" },
      { hook: "This is how Billionaires Negotiate", view_count: "32.7M", account_name: "tranquess_" },
      { hook: "You've been saying these brand names wrong!", view_count: "64.2M", account_name: "army_of_alphas" },
      { hook: "you see the underdog story", view_count: "7.7M", account_name: "leverage.money" },
      { hook: "NEED MOTIVATION?", view_count: "9.7M", account_name: "disciplinenation00" },
      { hook: "THAT'S THE PART ABOUT ENTREPRENEURSHIP", view_count: "1.4M", account_name: "codiesanchez" },
      { hook: "Me entering in my 100 acres of land after 7 years of hardwork", view_count: "2.3M", account_name: "wlthypreneu" },
      { hook: "Stuff my wifey will post on her stories in 2028", view_count: "25M", account_name: "primenazareth" },
      { hook: "What does one need to do?", view_count: "8.7M", account_name: "salaryscale" },
      { hook: "If I had to start over with a 550 credit score, here's what I would do to get a 800 in 3 months", view_count: "1.5M", account_name: "therealrobracks" },
      { hook: "If You Are 36, you're a fucking child", view_count: "5.4M", account_name: "mindset_coach" },
      { hook: "4 Big Ways that youi have turned other people into a problem", view_count: "3.2M", account_name: "psychology_tips" },
      { hook: "You are likely to experience burnout if...", view_count: "2.8M", account_name: "workplace_wellness" },
      { hook: "If your teenager is lost and no career direction.", view_count: "2.1M", account_name: "career_advice" },
      { hook: "People Don't like feedback", view_count: "1.9M", account_name: "corporate_tips" },
      { hook: "Best part oif my life happiness.", view_count: "1.5M", account_name: "happiness_secrets" },
      { hook: "I'm so thankful to God that i experienced that life.", view_count: "1.2M", account_name: "gratitude_daily" },
    ],
  },

  // ── Paste Fashion hooks here once the user provides them ──────────────────
  fashion: {
    id: 'fashion',
    label: 'Fashion & Style',
    emoji: '👗',
    description: 'Outfits, styling, fashion trends, OOTD',
    hooks: [
      { hook: "POV you dress \"too elegant\" for your age", view_count: "1.7M", account_name: "catharinaelisabethx" },
      { hook: "\"too elegant\" for your age", view_count: "5.1M", account_name: "aydahadi" },
      { hook: "This is vulgar:", view_count: "11.7M", account_name: "ronhiree" },
      { hook: "I go back to black", view_count: "1M", account_name: "mieldore___" },
      { hook: "POV: you found your style", view_count: "11.5M", account_name: "victoreis92" },
      { hook: "Girls call this fashion", view_count: "5.2M", account_name: "oldmoneyfshion" },
      { hook: "You don't like to show your arms but it's summer?", view_count: "1.5M", account_name: "stylebynikita_" },
      { hook: "outfits of the week,", view_count: "2.3M", account_name: "jessyluxe" },
      { hook: "MINI OR MAXI", view_count: "7.6M", account_name: "showpo" },
      { hook: "This or That", view_count: "1.5M", account_name: "sharonnijhawan" },
      { hook: "sometimes I wanna dress like this", view_count: "1.8M", account_name: "natalikim" },
      { hook: "couple look dress & oversized knit shirt", view_count: "1.7M", account_name: "kadakaofficial" },
      { hook: "wearing VS", view_count: "16.4M", account_name: "nottrebeca_" },
      { hook: "wearing", view_count: "2M", account_name: "jaynjangle" },
      { hook: "No more messy backs this year", view_count: "4.1M", account_name: "majigsawpiece" },
      { hook: "My fav fits recently", view_count: "2.7M", account_name: "yomna_maher151" },
      { hook: "Color Combinations that Match PERFECTLY", view_count: "8.2M", account_name: "iammarcustv_" },
      { hook: "Maxi skirts", view_count: "1M", account_name: "meeyatee" },
      { hook: "Worst clothes you can wear", view_count: "3.2M", account_name: "desertedinurban" },
      { hook: "Bet you didn't know pants could do this", view_count: "1.3M", account_name: "ntbhshop" },
      { hook: "How I dress:", view_count: "3.3M", account_name: "annikahatdripp" },
      { hook: "if car brands were a woman", view_count: "4M", account_name: "yaanaa.r" },
      { hook: "millennial vs GEN-Z", view_count: "73.6M", account_name: "bobrownn" },
      { hook: "Wearing VS", view_count: "18.7M", account_name: "leanortizzz" },
    ],
  },

  // ── More niches to come ───────────────────────────────────────────────────
  beauty: {
    id: 'beauty',
    label: 'Beauty & Skincare',
    emoji: '💄',
    description: 'Makeup, skincare, glow-up, self-care',
    hooks: [
      { hook: "trust the process", view_count: "73M", account_name: "lenkalul" },
      { hook: "You Need To Try This Winged Liner Trick", view_count: "43M", account_name: "annakozlovaugc" },
      { hook: "Hair Removal On Face", view_count: "17.2M", account_name: "_ayshabegum_" },
      { hook: "THIS SHARP LINE TRICK IS GENIUS!", view_count: "11.7M", account_name: "sharp_liner" },
      { hook: "10 minutes to feel 10 times better postpartum", view_count: "8.5M", account_name: "kbelllbeauty" },
      { hook: "Ice Cubes Can Change Your Skin Forever", view_count: "6.5M", account_name: "ritu__minhaj___2413" },
      { hook: "Keep it fresh with our oil-controlling, powder-free formula.", view_count: "4.9M", account_name: "chillab.official" },
      { hook: "smoked cherry eye makeup", view_count: "3.2M", account_name: "makeup_by_cherry" },
      { hook: "You're far more beautiful than you believe.", view_count: "1M", account_name: "xronyo" },
    ],
  },

  fitness: {
    id: 'fitness',
    label: 'Fitness & Health',
    emoji: '💪',
    description: 'Gym, workout, body transformation, nutrition',
    hooks: [],
  },

  food: {
    id: 'food',
    label: 'Food & Recipe',
    emoji: '🍕',
    description: 'Cooking, restaurants, food hacks, meal prep',
    hooks: [
      { hook: "homemade canadian POUTINE WITH STEAK", view_count: "7.4M", account_name: "moribyan" },
      { hook: "british classics", view_count: "4.4M", account_name: "thomas_straker" },
      { hook: "HONEY BUTTER CHICKEN", view_count: "3.8M", account_name: "i.am.never.full" },
      { hook: "How to make Fish and Chips Englands National Dish", view_count: "1.9M", account_name: "mealswithmax" },
      { hook: "This is Pub Grub", view_count: "1.8M", account_name: "food_with_george" },
      { hook: "BRITISH Meets FILIPINO CUISINE", view_count: "1.3M", account_name: "razofoodie" },
      { hook: "BRITISH FOOD", view_count: "1M", account_name: "bignibblesfood" },
      { hook: "agua fresca", view_count: "1M", account_name: "jacobking" },
    ],
  },

  tech: {
    id: 'tech',
    label: 'Tech & AI',
    emoji: '🤖',
    description: 'AI tools, gadgets, productivity, software',
    hooks: [],
  },

  travel: {
    id: 'travel',
    label: 'Travel & Lifestyle',
    emoji: '✈️',
    description: 'Destinations, travel hacks, hotels, experiences',
    hooks: [
      { hook: "If your dream is to travel the world but you aren't super rich...", view_count: "1.2M", account_name: "itsmarianavelez" },
      { hook: "how to sleep 8 hours in economy", view_count: "3.7M", account_name: "heyyemilyrae" },
      { hook: "I want to leave my hometown and travel the world for a living but I don't know how to make money...", view_count: "1.4M", account_name: "jaden.versluis" },
      { hook: "99 problems but only 1 solution...", view_count: "8.1M", account_name: "nikolaisavic" },
      { hook: "POV: when you and bro lifemax to the fullest", view_count: "1.2M", account_name: "phillip3s" },
      { hook: "travel to Lebanon with me", view_count: "1.6M", account_name: "angelacbeauty" },
      { hook: "POV you travel all the way to Poland for one thing", view_count: "2.1M", account_name: "baxterfenwick" },
      { hook: "How travelling around the world after finishing school is talking to", view_count: "2.2M", account_name: "tripbff" },
      { hook: "\"Do you have a hobby?\" Me:", view_count: "2.8M", account_name: "lounge.guru" },
      { hook: "Why do you work so hard?", view_count: "1.4M", account_name: "lanastotskaya" },
      { hook: "Pov: traveling really lowers your life standards", view_count: "1.2M", account_name: "fra_sercia" },
      { hook: "When they ask you \"what are you doing tonight?\" and you realize you forgot to tell them that you left the country again", view_count: "3.4M", account_name: "_beyond__borders__" },
      { hook: "I hope every \"I love to travel\" girl", view_count: "1.3M", account_name: "adeliinabb" },
      { hook: "If you can't take her to Europe yet..", view_count: "1.4M", account_name: "thewanderfullylostduo" },
      { hook: "1 - \"normal fun travel memories video\"", view_count: "6.3M", account_name: "morgnsworldd" },
      { hook: "\"have fun on your cruise!\"", view_count: "2.8M", account_name: "sidbatty" },
      { hook: "Them: \"How can you afford to travel so much?\"", view_count: "8.8M", account_name: "the.backpackerspassport" },
      { hook: "Travel makes you humble.", view_count: "4.7M", account_name: "diogo.jared" },
      { hook: "Forever a \"let's travel the world\" kind of person", view_count: "1.7M", account_name: "annelienoa" },
      { hook: "\"Let's go camping\"", view_count: "2.6M", account_name: "hillary.bowles" },
      { hook: "Did you know that the best travel stories never come from resorts?", view_count: "3.6M", account_name: "renaud_blondin" },
      { hook: "We should go on a walk for our mental health THE WALK:", view_count: "4.6M", account_name: "miyu.ara" },
      { hook: "Missing your flight because the airport looks like THIS..", view_count: "67.5M", account_name: "travelwithjaro" },
      { hook: "Let's live like this.>>>", view_count: "2.9M", account_name: "tommy_schaef" },
      { hook: "The Hardest Decision During Every Trip", view_count: "2.2M", account_name: "milaloeff" },
      { hook: "ONLY 1 COUNTRY LEFT UNTIL...", view_count: "1.2M", account_name: "hudsonandemily" },
      { hook: "Places to visit if you want to live in a fantasy novel", view_count: "1.4M", account_name: "raimeetravel" },
      { hook: "\"Airport Dad\" activated... always 20 feet ahead of us rushing to just go sit for 2 hours before our flight", view_count: "12.2M", account_name: "kingdomofsequins" },
      { hook: "POV: I'm looking for my boyfriend on vacation", view_count: "3.5M", account_name: "olivia_banett" },
      { hook: "let's travel 24 hours home", view_count: "2M", account_name: "maddieborge" },
      { hook: "Best countries to visit when you're young & broke", view_count: "1.2M", account_name: "itsmarianavelez" },
      { hook: "Flying home to surprise my brother", view_count: "3.8M", account_name: "iamjennabennett" },
      { hook: "Me before one and a half years of backpacking", view_count: "2.5M", account_name: "theraenlas" },
      { hook: "Trying the AirPort Pillow Hack", view_count: "6.6M", account_name: "holidayswap" },
      { hook: "this & no stress", view_count: "6.1M", account_name: "tayandtreytravel" },
      { hook: "send this to your \"let's travel the world together\" friend", view_count: "1.1M", account_name: "grace.vansciver" },
      { hook: "Me and my 27 unworn outfits heading home", view_count: "7.4M", account_name: "lifestyledbynatandjen" },
      { hook: "let's go see the world", view_count: "2.6M", account_name: "tayandtreytravel" },
      { hook: "Unfortunately, I'm the daughter who's always the happiest when away from home", view_count: "2.4M", account_name: "itsmarianavelez" },
      { hook: "POV: Your kid visits Saudi Arabia for the first time!", view_count: "40.1M", account_name: "meilenkoenig" },
      { hook: "you, me, 5 am, airport, morning coffee and a new country is waiting for us", view_count: "2.3M", account_name: "wandertoaplace" },
      { hook: "Lofoten Islands where the sun never sets in the summer...", view_count: "19.4M", account_name: "natyexplora" },
      { hook: "When people visit New Zealand but skip the North Island and miss these spots", view_count: "1.1M", account_name: "kristinamonts" },
      { hook: "how do you explain this to someone who thinks the best trip of their life was at an all-inclusive resort?", view_count: "1.5M", account_name: "renaud_blondin" },
      { hook: "Babeules Husband: you sure you're going to Paris with 1 bag only?", view_count: "1.2M", account_name: "renaud_blondin" },
    ],
  },

  parenting: {
    id: 'parenting',
    label: 'Parenting & Family',
    emoji: '👶',
    description: 'Kids, mom life, family routines, parenting tips',
    hooks: [],
  },

  pets: {
    id: 'pets',
    label: 'Pets & Animals',
    emoji: '🐾',
    description: 'Dogs, cats, pet products, cute moments',
    hooks: [],
  },

  social: {
    id: 'social',
    label: 'Social Media & Marketing',
    emoji: '📱',
    description: 'Social media growth, content creation, marketing strategies',
    hooks: [
      { hook: "STOP INSTAGRAM from SPYING on you!", view_count: "18.5M", account_name: "privacy_hacks" },
      { hook: "This ChatGPT Prompt is SO GOOD it Should Be Illegal", view_count: "16.1M", account_name: "prompt_master" },
      { hook: "Al Tools Every Student Needs in 2025", view_count: "14.6M", account_name: "ai_student" },
      { hook: "That's how a 9-5 job takes over your life", view_count: "13.8M", account_name: "corporate_hustle" },
      { hook: "STOP asking ChatGPT to \"make it better.\"", view_count: "12.3M", account_name: "ai_insider" },
      { hook: "You finally figured out why Instagram wasn't showing your reels to anyone", view_count: "11.4M", account_name: "algorithm_hacks" },
      { hook: "4 Hashtags you must use to unlock your first Million Views", view_count: "9.2M", account_name: "viral_growth" },
      { hook: "this jacket nearly cost the company millions", view_count: "8.7M", account_name: "business_insider" },
      { hook: "Boss: MAKE IT GO VIRAL", view_count: "7.8M", account_name: "office_comedy" },
      { hook: "How to use ChatGPT to get instagram followers ?", view_count: "6.8M", account_name: "follower_growth" },
      { hook: "Bumble's genius marketing strategy that people think should be illegal.", view_count: "5.4M", account_name: "marketing_genius" },
      { hook: "THE BEST TIME To Post On Social Media", view_count: "5.2M", account_name: "marketing_secrets" },
      { hook: "IF I HAD TO START MY IG FROM SCRATCH", view_count: "4.5M", account_name: "ig_growth_coach" },
      { hook: "we are not the same person", view_count: "3.9M", account_name: "relatable_content" },
      { hook: "when you're the social media intern but also a chronic over thinker", view_count: "3.2M", account_name: "intern_life" },
      { hook: "did you know about these websites", view_count: "3.1M", account_name: "web_hacks" },
      { hook: "Taking the BIGGEST step back when she says that she is \"busy\" at her marketing job", view_count: "2.7M", account_name: "marketing_jokes" },
      { hook: "NON POSTARE MAI", view_count: "2.4M", account_name: "social_growth" },
      { hook: "How Viral Is?", view_count: "2.2M", account_name: "viral_lab" },
      { hook: "your boss tells you to create content and hit 1M views", view_count: "2.1M", account_name: "social_intern" },
      { hook: "When you spend a little too much time with your coworkers", view_count: "1.9M", account_name: "office_humor" },
      { hook: "your face should be", view_count: "1.8M", account_name: "creator_marketing" },
      { hook: "\"Social media is very important for businesses like ours\"", view_count: "1.5M", account_name: "biz_growth" },
      { hook: "where do I run when home doesn't feel like home anymore", view_count: "1.1M", account_name: "creative_lifestyle" }
    ],
  },

  realestate: {
    id: 'realestate',
    label: 'Real Estate & Housing',
    emoji: '🏠',
    description: 'Home tours, property pricing, agent humor, buying/selling tips',
    hooks: [
      { hook: "POV: You just sold a house for - $3,110,000 & got rejected", view_count: "3.1M", account_name: "realtor_humor" },
      { hook: "I make $40 an hour. Can I afford an $800k home?", view_count: "2.8M", account_name: "home_finance" },
      { hook: "Guess the price of this Billionaires' Row Penthouse in NYC", view_count: "2.5M", account_name: "luxury_homes" },
      { hook: "POV you build your forever home in Texas!", view_count: "2.2M", account_name: "home_builder" },
      { hook: "POV: You just moved to Texas! Which Custom Build would you go with!?", view_count: "1.9M", account_name: "texas_realtor" },
      { hook: "If realestate agents were honest", view_count: "1.7M", account_name: "honest_agent" },
      { hook: "Stunning floor-plan in Palm Beach Garden", view_count: "1.5M", account_name: "luxury_listings" },
      { hook: "When I say I want a big closet, This is what I mean", view_count: "1.3M", account_name: "closet_goals" },
      { hook: "Wanna sell your house ????", view_count: "1.1M", account_name: "sell_house" },
      { hook: "brand new", view_count: "1.0M", account_name: "new_homes" }
    ],
  },
};

// ─── HELPER ───────────────────────────────────────────────────────────────────

/**
 * Returns the top N hooks for a niche sorted by view count (highest first).
 * Used to inject into the script prompt as training examples.
 */
export function getTopHooks(nicheId: string, limit = 10): NicheHook[] {
  const niche = HOOK_LIBRARY[nicheId];
  if (!niche || niche.hooks.length === 0) return [];

  const parseViews = (v: string): number => {
    const n = parseFloat(v.replace('M', '').replace('K', '').replace(',', ''));
    if (v.includes('M')) return n * 1_000_000;
    if (v.includes('K')) return n * 1_000;
    return n;
  };

  return [...niche.hooks]
    .sort((a, b) => parseViews(b.view_count) - parseViews(a.view_count))
    .slice(0, limit);
}

/**
 * Extracts the structural PATTERN from a hook, not just the words.
 * Used to teach the AI the formula, not just the example.
 */
export function buildNicheHookContext(nicheId: string): string {
  if (!nicheId || nicheId === 'none') return '';
  const niche = HOOK_LIBRARY[nicheId];
  if (!niche || niche.hooks.length === 0) return '';

  const top = getTopHooks(nicheId, 8);
  const hookList = top
    .map(h => `  "${h.hook}" — ${h.view_count} views`)
    .join('\n');

  return `
VIRAL HOOK INTELLIGENCE — ${niche.emoji} ${niche.label}
─────────────────────────────────────────────
These hooks got millions of views. Study WHY they work:

${hookList}

WHAT MAKES THESE HOOKS WORK (apply these patterns):
1. They start with a SITUATION the viewer instantly recognises ("POV:", "When you", "Me after")
2. They create a GAP — viewer doesn't know how it ends, so they keep watching
3. They use CONTRAST — before/after, expectation vs reality, me vs them
4. They are SPECIFIC not vague — "How I dress" beats "Fashion tips"
5. They feel like the MIDDLE of a conversation, not the start of an ad

YOUR HOOK MUST:
- Feel like one of the examples above in energy and directness
- Be 3-10 words maximum
- NOT start with "I", "Are you", "Do you want", or any generic opener
- Sound like something a real person would say, not a brand
- Create immediate curiosity or recognition in the first 2 words`;
}
