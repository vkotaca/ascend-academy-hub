/*  Ascend Academy, Hub Logic
    State management, module registry, card rendering, overlay, progress.
*/

// --- MODULE REGISTRY ---
// Modules across 5 units. Add file: 'modules/<id>.html' when module is built.
var MODULES = [
  // ── UNIT 1: Foundations of Congressional Debate (5 modules) ──
  { id: 'what-is-congress',     unit: 1, num: '1.1', title: 'What Is Congressional Debate?',     icon: '\u{1F3DB}\uFE0F', duration: '25 min', activities: 3, badge: null,
    desc: 'How the event works, what judges look for, and why it\u2019s the most strategic event in speech & debate.',
    file: 'modules/what-is-congress.html',
    lessons: [
      { icon: '\uD83C\uDFDB\uFE0F', text: 'The event at a glance, the Battle Royale of debate, Rep vs. Senator, and why your side winning doesn\u2019t determine your rank' },
      { icon: '\uD83D\uDD04', text: 'How a round works, sponsorship speeches, choosing aff or neg, and local vs. national tournament scale' },
      { icon: '\uD83C\uDFAF', text: 'The three pillars: argumentation, delivery, strategy' },
      { icon: '\uD83D\uDC53', text: 'What judges actually look for, experienced vs. lay' },
      { icon: '\u23F1\uFE0F', text: 'Speeches & CX timing, 3 minutes per speech, 2 min or 1 min cross-examination' },
      { icon: '\u2728', text: 'Why Congress is different, no direct opponent, speeches are independent, the round evolves' },
      { icon: '\uD83C\uDFC6', text: 'Tournament structure, prelims, elims, nationals' },
      { icon: '\uD83D\uDE80', text: 'The Ascend approach, one deep argument beats three shallow ones' }
    ] },
  { id: 'how-chamber-works',    unit: 1, num: '1.2', title: 'How the Chamber Works',              icon: '\u2696\uFE0F', duration: '20 min', activities: 4, badge: null,
    desc: 'Precedence, recency, presiding officers, motions, and how rounds actually run from start to finish.',
    file: 'modules/how-chamber-works.html',
    lessons: [
      { icon: '\uD83D\uDCCB', text: 'The docket, what you debate and in what order' },
      { icon: '\uD83D\uDD22', text: 'Precedence & recency, who gets to speak' },
      { icon: '\uD83D\uDD28', text: 'The Presiding Officer, running the chamber' },
      { icon: '\uD83D\uDD04', text: 'Cycles of debate, how rounds evolve' },
      { icon: '\u270B', text: 'Motions, Previous Question, Lay on the Table, Recess' },
      { icon: '\uD83D\uDDF3\uFE0F', text: 'Voting on legislation, what it means (and doesn\u2019t)' },
      { icon: '\u2753', text: 'Questioning (CX), strategy for questioners and speakers' },
      { icon: '\uD83C\uDFAC', text: 'A round from start to finish, full walkthrough' }
    ] },
  { id: 'becoming-po',          unit: 1, num: '1.3', title: 'Becoming a Presiding Officer',       icon: '\uD83D\uDD28', duration: '30 min', activities: 5, badge: 'presiding-officer',
    desc: 'How to get elected, run your procedure speech, handle motions, and be a judge\u2019s best friend.',
    file: 'modules/becoming-po.html',
    lessons: [
      { icon: '\uD83C\uDFC6', text: 'Why preside, the competitive advantage most students miss' },
      { icon: '\uD83D\uDDF3\uFE0F', text: 'Getting elected, winning the PO election' },
      { icon: '\uD83C\uDFA4', text: 'The procedure speech, what to say and how to say it' },
      { icon: '\uD83D\uDCCB', text: 'Running the docket, elections, sponsors, authorship' },
      { icon: '\uD83D\uDCDD', text: 'The PO sheet, tracking precedence and recency' },
      { icon: '\u270B', text: 'Handling motions, seconds, votes, execution' },
      { icon: '\u2764\uFE0F', text: 'Being a judge\u2019s best friend, what earns top PO scores' },
      { icon: '\u26A0\uFE0F', text: 'Common mistakes & tips, what to avoid' }
    ] },
  { id: 'reading-legislation',  unit: 1, num: '1.4', title: 'Reading & Analyzing Legislation',    icon: '\uD83D\uDCC4', duration: '20 min', activities: 3, badge: null,
    desc: 'How to break down a bill, understand what it actually does, and identify the real debate underneath.',
    file: 'modules/reading-legislation.html',
    lessons: [
      { icon: '\uD83D\uDCDA', text: 'Why reading the bill matters, the bill IS the debate' },
      { icon: '\uD83D\uDD2C', text: 'Anatomy of a bill, title, sections, enactment' },
      { icon: '\u2753', text: 'The 5 questions to ask every bill' },
      { icon: '\uD83D\uDCDC', text: 'Bills vs. resolutions, different legislation, different arguments' },
      { icon: '\uD83C\uDFAF', text: 'Finding the real debate underneath the surface' },
      { icon: '\uD83D\uDD0D', text: 'Reading between the lines, immediate implementation, missing enforcement' },
      { icon: '\uD83E\uDDF1', text: 'From bill to argument, mapping to Block Format' },
      { icon: '\uD83D\uDCDD', text: 'Practice: breaking down a real bill' }
    ] },
  { id: 'standing-out-early',   unit: 1, num: '1.5', title: 'Standing Out in Early Rounds',       icon: '\u2B50', duration: '18 min', activities: 4, badge: null,
    desc: 'Prep strategy, framing, sponsorships, and the attention habits that separate good debaters from great ones in prelims.',
    file: 'modules/standing-out-early.html',
    lessons: [
      { icon: '\u2B50', text: 'What standing out actually means, being the speaker judges remember' },
      { icon: '\uD83D\uDD0D', text: 'Researching to be noticed, finding the angle others miss' },
      { icon: '\uD83D\uDDBC\uFE0F', text: 'The power of framing, defining the debate before anyone else' },
      { icon: '\uD83D\uDC42', text: 'Paying attention in round, the #1 differentiator' },
      { icon: '\uD83D\uDCE3', text: 'The sponsorship advantage, why most debaters are wrong to avoid it' },
      { icon: '\u2705', text: 'The sponsorship checklist, structure for a strong first speech' },
      { icon: '\uD83D\uDEE0\uFE0F', text: 'Constructive vs. canned, speeches that live in the round' },
      { icon: '\uD83E\uDDE0', text: 'The early-round mindset, every interaction is a scoring opportunity' }
    ] },
  { id: 'unit-1-exam',          unit: 1, num: '1.6', title: 'Unit 1 Exam',                        icon: '\uD83D\uDCDD', duration: '10 min', activities: 15, badge: 'unit-1-complete', exam: true,
    desc: 'Test your knowledge of Congressional Debate foundations, 15 questions covering how the event works, chamber procedure, presiding, legislation, and strategy.',
    file: 'modules/unit-1-exam.html' },

  // ── UNIT 2: Building Arguments (6 modules) ──
  { id: 'anatomy-of-argument',  unit: 2, num: '2.1', title: 'The Anatomy of an Argument',         icon: '\uD83D\uDCA1', duration: '20 min', activities: 6, badge: 'argument-builder',
    desc: 'Every argument has four parts: Claim, Warrant, Evidence, and Impact. Master CWEI and you\u2019ll have the foundation for everything that follows.',
    file: 'modules/anatomy-of-argument.html',
    lessons: [
      { icon: '\uD83C\uDFAC', text: 'What makes a good argument, the CWEI framework (Claim, Warrant, Evidence, Impact)' },
      { icon: '\uD83C\uDFAF', text: 'The Claim, your one-sentence thesis' },
      { icon: '\uD83E\uDDE0', text: 'The Warrant, the "because" behind the claim' },
      { icon: '\uD83D\uDCCA', text: 'Evidence & Data, backing it up with credible sources' },
      { icon: '\uD83D\uDCA5', text: 'The Impact, why your argument matters to real people' },
      { icon: '\uD83D\uDD17', text: 'Putting it all together, building a complete CWEI argument' }
    ] },
  { id: 'block-format',         unit: 2, num: '2.2', title: 'The Block Format',                   icon: '\uD83E\uDDF1', duration: '25 min', activities: 6, badge: 'block-master',
    desc: 'Ascend\u2019s signature argument structure. The same format that has won 6 TOCs and countless national championships.',
    file: 'modules/block-format.html',
    lessons: [
      { icon: '\uD83D\uDCD6', text: 'Why argument formats matter, efficiency, clarity, depth' },
      { icon: '\uD83D\uDD04', text: 'The origin of Block Format, how one idea became 6 TOC wins' },
      { icon: '\uD83E\uDDF1', text: 'The 3 components: Status Quo, Outcome, Impact' },
      { icon: '\u270D\uFE0F', text: 'The Status Quo, proving a specific problem exists in the current world' },
      { icon: '\u26A1',       text: 'Outcome & Action, the legislative mechanism' },
      { icon: '\uD83D\uDCA5', text: 'Impact, humanizing and connecting to judges' },
      { icon: '\uD83C\uDFAC', text: 'Analyze a championship speech (Tyler Luu 2023 Nationals)' },
      { icon: '\uD83D\uDCDD', text: 'The Pre-Requisite, orienting judges and controlling the round\u2019s narrative' }
    ]
  },
  { id: 'squo-deep-dive',       unit: 2, num: '2.3', title: 'The Status Quo Deep Dive',           icon: '\uD83D\uDD2D', duration: '20 min', activities: 5, badge: null,
    desc: 'How to construct a SQUO that provides context, proves a problem, and doubles as preemptive refutation.',
    file: 'modules/squo-deep-dive.html',
    lessons: [
      { icon: '\uD83D\uDD2D', text: 'What the SQUO really does, unique to your argument, not the topic' },
      { icon: '\uD83C\uDFAF', text: 'The tagline, your one-sentence problem thesis' },
      { icon: '\uD83D\uDCCA', text: 'Evidence selection, one strong card beats two weak ones' },
      { icon: '\uD83D\uDEE1\uFE0F', text: 'SQUO as preemptive refutation, making your argument harder to attack' },
      { icon: '\u26A0\uFE0F', text: 'Common mistakes, too broad, too vague, too long' }
    ] },
  { id: 'outcome-action',       unit: 2, num: '2.4', title: 'Crafting Your Outcome & Action',     icon: '\u26A1',       duration: '20 min', activities: 5, badge: null,
    desc: 'The pivot from problem to solution, referencing legislation, proving the mechanism, making the link chain airtight.',
    file: 'modules/outcome-action.html',
    lessons: [
      { icon: '\u26A1', text: 'Action vs. Outcome, factual context vs. your argument' },
      { icon: '\uD83D\uDCC4', text: 'Referencing the legislation, citing specific bill sections' },
      { icon: '\uD83D\uDD17', text: 'Proving the mechanism, the link chain from action to result' },
      { icon: '\uD83C\uDFAF', text: 'The outcome IS your argument, specific enough to defend' },
      { icon: '\uD83E\uDDF1', text: 'Building an airtight link chain, full walkthrough' }
    ] },
  { id: 'impact-calculus',      unit: 2, num: '2.5', title: 'Impact Calculus',                     icon: '\uD83D\uDCA5', duration: '22 min', activities: 6, badge: null,
    desc: 'How to humanize your impact, make judges feel the stakes, and use the comparative to prove your side wins.',
    file: 'modules/impact-calculus.html',
    lessons: [
      { icon: '\uD83D\uDCA5', text: 'What is an impact, connecting to real human lives' },
      { icon: '\u2764\uFE0F', text: 'Humanizing your impact, stories + data' },
      { icon: '\uD83D\uDD17', text: 'Multiple impacts from one argument, the ripple effect' },
      { icon: '\u2696\uFE0F', text: 'The comparative, two-world framing' },
      { icon: '\uD83C\uDFAF', text: 'Terminalization, lives, safety, rights, dignity' },
      { icon: '\uD83D\uDCDD', text: 'Impact in practice, full walkthrough' }
    ] },
  { id: 'unit-2-exam',          unit: 2, num: '2.6', title: 'Unit 2 Exam',                        icon: '\uD83D\uDCDD', duration: '8 min', activities: 10, badge: 'unit-2-complete', exam: true,
    desc: 'Test your knowledge of argument construction, 10 questions on CWEI, Block Format, SQUO, Outcome, and Impact Calculus.',
    file: 'modules/unit-2-exam.html' },

  // ── UNIT 3: Advanced Strategy (6 modules) ──
  { id: 'win-conditions',       unit: 3, num: '3.1', title: 'Win Conditions & The Comparative',   icon: '\uD83C\uDFAF', duration: '18 min', activities: 5, badge: null,
    desc: 'What actually wins rounds. The comparative framework, offense vs. defense, believability, and picking your side.',
    file: 'modules/win-conditions.html',
    lessons: [
      { icon: '\uD83C\uDFC6', text: 'What actually wins rounds, having a clear win condition' },
      { icon: '\u2696\uFE0F', text: 'The comparative framework, two worlds, one choice' },
      { icon: '\u2694\uFE0F', text: 'Offense vs. defense, building vs. tearing down' },
      { icon: '\uD83E\uDD1D', text: 'Believability, modest claims beat outlandish ones' },
      { icon: '\uD83E\uDDE0', text: 'Picking your side, strategic side selection in round' }
    ] },
  { id: 'finding-gaps',         unit: 3, num: '3.2', title: 'Finding Gaps & Generating Arguments', icon: '\uD83D\uDCA1', duration: '20 min', activities: 5, badge: null,
    desc: 'How to identify strengths and weaknesses in a debate, predict gaps, and create arguments that fill them.',
    file: 'modules/finding-gaps.html',
    lessons: [
      { icon: '\uD83D\uDCA1', text: 'What is a gap, the angle nobody has covered yet' },
      { icon: '\uD83D\uDD2E', text: 'Predicting gaps during prep, prep the non-obvious argument' },
      { icon: '\uD83D\uDC40', text: 'Reading the room, tracking what\u2019s been said in real time' },
      { icon: '\uD83E\uDDF1', text: 'Generating arguments from gaps, building blocks in-round' },
      { icon: '\uD83E\uDDE0', text: 'The gap mindset, listening is the ultimate strategic skill' }
    ] },
  { id: 'refutation',           unit: 3, num: '3.3', title: 'Prerequisites & Refutation',         icon: '\uD83D\uDEE1\uFE0F', duration: '20 min', activities: 6, badge: null,
    desc: 'How to frame the debate before your argument, where to place refutation inside block format, and when to cut content and adapt.',
    file: 'modules/refutation.html',
    lessons: [
      { icon: '\uD83D\uDD04', text: 'The prerequisite block, orienting judges with a summary of the debate and your direction' },
      { icon: '\uD83D\uDDE3\uFE0F', text: 'Prereqs in practice, addressing opposition vs. framing clash' },
      { icon: '\uD83D\uDEE1\uFE0F', text: 'Where refutation goes, beginning of block, end of block, or prereq' },
      { icon: '\u2694\uFE0F', text: 'On-case vs. off-case refutation, what to prioritize' },
      { icon: '\u2702\uFE0F', text: 'Letting go, cutting content to make room for what judges want to hear' },
      { icon: '\uD83E\uDDE0', text: 'Know your debate, adapting to status quo debates vs. outcome debates' }
    ] },
  { id: 'block-format-late',    unit: 3, num: '3.4', title: 'Block Format in Late Rounds',        icon: '\uD83C\uDFC6', duration: '22 min', activities: 5, badge: null,
    desc: 'How the block format evolves as the round progresses, identifying clash, cutting content, and controlling the narrative.',
    file: 'modules/block-format-late.html',
    lessons: [
      { icon: '\uD83D\uDD04', text: 'Why late rounds are different, judges want something new' },
      { icon: '\uD83C\uDFAF', text: 'Identifying the central clash, name the core disagreement' },
      { icon: '\u2702\uFE0F', text: 'Cutting content, efficiency over completeness' },
      { icon: '\uD83D\uDDE3\uFE0F', text: 'Controlling the narrative, reframing the debate' },
      { icon: '\uD83D\uDC8E', text: 'The crystallization speech, summarize, compare, win' }
    ] },
  { id: 'championship-speeches', unit: 3, num: '3.5', title: 'Championship Speeches: Watch & Learn', icon: '\uD83C\uDFA5', duration: '25 min', activities: 6, badge: null,
    desc: 'Real competition speeches broken down lesson by lesson. See Block Format, prereqs, refutation, rhetoric, and CX in action at the national level.',
    file: 'modules/championship-speeches.html',
    lessons: [
      { icon: '\uD83D\uDDF3\uFE0F', text: 'Redistricting, Block Format fundamentals in a clean first speech' },
      { icon: '\uD83D\uDC6E', text: 'Police reform, prereqs and integrated refutation' },
      { icon: '\uD83C\uDFE5', text: 'Medicare for All, late-round crystallization and the comparative' },
      { icon: '\uD83D\uDD12', text: 'Data privacy, filling gaps and quantifying what others missed' },
      { icon: '\uD83C\uDF0E', text: 'Foreign aid (CARSI), playing offense by turning the negation\u2019s strongest argument' },
      { icon: '\u2696\uFE0F', text: 'Final crystallization, telling judges why the affirmation wins the debate' }
    ] },
  { id: 'unit-3-exam',          unit: 3, num: '3.6', title: 'Unit 3 Exam',                        icon: '\uD83D\uDCDD', duration: '8 min', activities: 10, badge: 'unit-3-complete', exam: true,
    desc: 'Test your mid and late round strategy, 10 questions on win conditions, gaps, refutation, crystallization, and championship speeches.',
    file: 'modules/unit-3-exam.html' },

  // ── UNIT 4: Research & Case Preparation (6 modules) ──
  { id: 'how-to-research',      unit: 4, num: '4.1', title: 'How to Research',                    icon: '\uD83D\uDD0D', duration: '20 min', activities: 5, badge: 'researcher',
    desc: 'From reading the bill to building a case, the systematic approach that finds evidence others miss.',
    file: 'modules/how-to-research.html',
    lessons: [
      { icon: '\uD83D\uDCC4', text: 'Start with the bill, read the legislation before anything else' },
      { icon: '\uD83D\uDD0D', text: 'Google Scholar & source hierarchy, where to find credible evidence' },
      { icon: '\uD83D\uDCA1', text: 'The keyword strategy, search the mechanism, not the topic' },
      { icon: '\uD83D\uDCDA', text: 'Building a source library, organizing evidence for quick access' },
      { icon: '\u26A1', text: 'Research efficiency, getting more done in less time' }
    ] },
  { id: 'prime-prep',           unit: 4, num: '4.2', title: 'Prime-Level Prep',                   icon: '\uD83D\uDC51', duration: '18 min', activities: 4, badge: null,
    desc: 'What championship-level preparation actually looks like. The habits and frameworks that produce consistently high ranks.',
    file: 'modules/prime-prep.html',
    lessons: [
      { icon: '\uD83D\uDC51', text: 'What separates good prep from great prep, intentional hours' },
      { icon: '\uD83D\uDCC1', text: 'The prep document, the 10-second rule for finding anything under pressure' },
      { icon: '\uD83D\uDD2C', text: 'Depth over breadth, 1-2 deep arguments beat 5 shallow ones' },
      { icon: '\uD83D\uDD04', text: 'Preparing for adaptation, backup angles and flexible blocks' }
    ] },
  { id: 'aff-neg-strategy',     unit: 4, num: '4.3', title: 'Aff vs. Neg Strategy',              icon: '\u2694\uFE0F', duration: '18 min', activities: 5, badge: null,
    desc: 'How to prepare both sides of any legislation, anticipating opposition arguments before you\u2019re in the room.',
    file: 'modules/aff-neg-strategy.html',
    lessons: [
      { icon: '\uD83D\uDD04', text: 'Always prep both sides, understanding opposition makes you stronger' },
      { icon: '\u2705', text: 'Affirmation strategy, proving the problem exists, the bill fixes it, and fixing it matters' },
      { icon: '\u274C', text: 'Negation strategy, multiple angles of attack' },
      { icon: '\uD83D\uDEE1\uFE0F', text: 'Anticipating the opposition, preemptive refutation' },
      { icon: '\uD83E\uDDE0', text: 'Strategic side selection, choosing your side in round' }
    ] },
  { id: 'evidence-citing',      unit: 4, num: '4.4', title: 'Evidence & Citing Sources',          icon: '\uD83D\uDCCA', duration: '15 min', activities: 4, badge: null,
    desc: 'What makes evidence credible, how to cite it in round, and how to attack weak evidence from opponents.',
    file: 'modules/evidence-citing.html',
    lessons: [
      { icon: '\uD83D\uDCCA', text: 'What makes evidence credible, source quality hierarchy' },
      { icon: '\uD83C\uDFA4', text: 'How to cite in round, the standard format' },
      { icon: '\u2694\uFE0F', text: 'Using evidence strategically, one strong card beats three weak ones' },
      { icon: '\uD83D\uDD2C', text: 'Attacking weak evidence, outdated, biased, cherry-picked' }
    ] },
  { id: 'unit-4-exam',          unit: 4, num: '4.5', title: 'Unit 4 Exam',                        icon: '\uD83D\uDCDD', duration: '8 min', activities: 10, badge: 'unit-4-complete', exam: true,
    desc: 'Test your research skills, 10 questions on research strategy, source quality, case building, prep habits, and evidence.',
    file: 'modules/unit-4-exam.html' },

  // ── UNIT 5: Performance, Presence & Strategy (9 modules) ──
  { id: 'rhetoric-intros',      unit: 5, num: '5.1', title: 'Rhetoric, Intros & Conclusions',     icon: '\u270D\uFE0F', duration: '22 min', activities: 6, badge: 'rhetorician',
    desc: 'How to turn arguments into stories judges remember. Writing rhetoric within blocks, crafting intros, tying conclusions, and finding your voice on paper.',
    file: 'modules/rhetoric-intros.html',
    lessons: [
      { icon: '\uD83C\uDFAC', text: 'What is rhetoric, telling a story with your argument using vivid imagery and plain language' },
      { icon: '\uD83D\uDCDD', text: 'Rhetoric within blocks, summarize, humanize, move on' },
      { icon: '\uD83C\uDFAD', text: 'Writing rhetoric in practice, the universal pre-K example' },
      { icon: '\uD83C\uDFA4', text: 'Crafting your intro, theme first, first line last' },
      { icon: '\uD83D\uDD17', text: 'Conclusions, tying back to your theme and stakeholders' },
      { icon: '\uD83D\uDD25', text: 'Finding your voice, quantity first, quality second; experiment then refine' }
    ] },
  { id: 'voice-delivery',       unit: 5, num: '5.2', title: 'Voice & Delivery',                   icon: '\uD83C\uDFA4', duration: '20 min', activities: 5, badge: 'voice-master',
    desc: 'Finding your voice, base tone, fluctuation, speed, and passion, how to sound like yourself, not a debate robot.',
    file: 'modules/voice-delivery.html',
    lessons: [
      { icon: '\uD83C\uDFA4', text: 'Finding your base tone, your natural voice is the starting point' },
      { icon: '\uD83C\uDFB5', text: 'Vocal variety, pitch, speed, volume, and strategic pauses' },
      { icon: '\u23F1\uFE0F', text: 'Speed and pacing, conversational pace wins over rushing' },
      { icon: '\uD83D\uDD25', text: 'Passion and authenticity, care about what you\u2019re saying' },
      { icon: '\u26A0\uFE0F', text: 'Common delivery mistakes, and how to fix them' }
    ] },
  { id: 'movement-physicality', unit: 5, num: '5.3', title: 'Movement & Physicality',             icon: '\uD83E\uDDD1\u200D\uD83C\uDFA4', duration: '18 min', activities: 5, badge: null,
    desc: 'Speaking stance, the speaker diamond, hand motions, and facial expressions, what judges see before they hear you.',
    file: 'modules/movement-physicality.html',
    lessons: [
      { icon: '\uD83E\uDDD1\u200D\uD83C\uDFA4', text: 'The speaker stance, projecting confidence before you speak' },
      { icon: '\uD83D\uDD37', text: 'The speaker diamond, where your hands should move' },
      { icon: '\u270B', text: 'Hand gestures with purpose, every gesture reinforces your words' },
      { icon: '\uD83D\uDC41\uFE0F', text: 'Eye contact and facial expressions, look at judges, not paper' },
      { icon: '\uD83D\uDEB6', text: 'The walk-up and walk-back, first and last impressions' }
    ] },
  { id: 'chamber-presence',     unit: 5, num: '5.4', title: 'Chamber Presence & Walk-Ups',        icon: '\u2728',       duration: '18 min', activities: 5, badge: null,
    desc: 'How to carry yourself before, between, and after speeches. Walk-ups, stereotypes to avoid, and commanding the room.',
    file: 'modules/chamber-presence.html',
    lessons: [
      { icon: '\uD83D\uDC41\uFE0F', text: 'Presence is always on, judges watch you even when you\u2019re not speaking' },
      { icon: '\uD83D\uDEB6', text: 'The walk-up, 10 seconds that set the tone' },
      { icon: '\uD83D\uDCDD', text: 'Between speeches, notes, engagement, and CX questions' },
      { icon: '\u26A0\uFE0F', text: 'Stereotypes to avoid, checked out, too cool, nervous fidgeter' },
      { icon: '\u2728', text: 'Commanding the room, being someone judges notice all round' }
    ] },
  { id: 'personality-energy',   unit: 5, num: '5.5', title: 'Personality & Stage Energy',         icon: '\uD83D\uDD25', duration: '15 min', activities: 4, badge: null,
    desc: 'Developing your persona, energy management, and the traits judges reward in close rounds.',
    file: 'modules/personality-energy.html',
    lessons: [
      { icon: '\uD83C\uDFAD', text: 'Your debate persona, find what\u2019s natural and lean in' },
      { icon: '\u26A1', text: 'Energy management, match energy to content' },
      { icon: '\uD83C\uDFC6', text: 'What judges reward in close rounds, the tiebreakers' },
      { icon: '\u2764\uFE0F', text: 'Being yourself, authenticity beats performance' }
    ] },
  { id: 'ballot-watch',         unit: 5, num: '5.6', title: 'Reading the Ballot',                 icon: '\uD83D\uDCCB', duration: '18 min', activities: 5, badge: null,
    desc: 'What judges actually write down, what they reward, and how to improve even from bare ballots.',
    file: 'modules/ballot-watch.html',
    lessons: [
      { icon: '\uD83D\uDCCB', text: 'What judges write down, 1-3 sentences per speaker' },
      { icon: '\u2B50', text: 'What judges reward, common praise and criticism patterns' },
      { icon: '\uD83D\uDD0D', text: 'Reading between the lines, decoding diplomatic feedback' },
      { icon: '\uD83D\uDCCA', text: 'Learning from bare ballots, patterns across rounds' },
      { icon: '\uD83D\uDD04', text: 'The improvement loop, one fix per tournament cycle' }
    ] },
  { id: 'cx-strategy',          unit: 5, num: '5.7', title: 'Cross-Examination Strategy',         icon: '\u2753',       duration: '20 min', activities: 5, badge: 'cx-master',
    desc: 'How to ask questions that expose weaknesses, how to handle hostile questioning, and how to use CX to set up your next speech.',
    file: 'modules/cx-strategy.html',
    lessons: [
      { icon: '\u2753', text: 'Why CX matters, a scoring opportunity most debaters waste' },
      { icon: '\uD83C\uDFAF', text: 'Asking good questions, specific, targeted, gap-exposing' },
      { icon: '\uD83C\uDFA4', text: 'Setting up your speech, CX as a preview of your argument' },
      { icon: '\uD83D\uDEE1\uFE0F', text: 'Handling hostile questions, calm, concise, pivot' },
      { icon: '\u23F1\uFE0F', text: 'The 30-second rule, one focused question, not three' }
    ] },
  { id: 'tournament-day',       unit: 5, num: '5.8', title: 'Tournament Day Execution',           icon: '\uD83D\uDDD3\uFE0F', duration: '15 min', activities: 4, badge: null,
    desc: 'From the night before to the final round, the routines, mindset, and adaptations that produce peak performance.',
    file: 'modules/tournament-day.html',
    lessons: [
      { icon: '\uD83C\uDF19', text: 'The night before, read every bill, finalize prep, get sleep' },
      { icon: '\u2600\uFE0F', text: 'Morning routine, arrive early, review, trust your prep' },
      { icon: '\uD83D\uDD04', text: 'Between rounds, read ballots, assess what worked, adapt for the next round' },
      { icon: '\uD83C\uDFC6', text: 'The finals mindset, execution over preparation at the top level' }
    ] },
  { id: 'unit-5-exam',          unit: 5, num: '5.9', title: 'Unit 5 Exam',                        icon: '\uD83D\uDCDD', duration: '8 min', activities: 10, badge: 'unit-5-complete', exam: true,
    desc: 'Test your performance skills, 10 questions on rhetoric, delivery, movement, presence, energy, ballots, CX, and tournament execution.',
    file: 'modules/unit-5-exam.html' }
];

var UNITS = [
  { num: 1, title: 'Foundations of Congressional Debate' },
  { num: 2, title: 'Building Arguments' },
  { num: 3, title: 'Mid & Late Round Strategy' },
  { num: 4, title: 'Research & Case Preparation' },
  { num: 5, title: 'Performance, Presence & Strategy' }
];

var BADGES = [
  { id: 'first-step',        emoji: '\uD83D\uDE80', name: 'First Step' },
  { id: 'presiding-officer', emoji: '\u2696\uFE0F', name: 'PO Expert' },
  { id: 'argument-builder',  emoji: '\uD83D\uDCA1', name: 'Argument Builder' },
  { id: 'block-master',      emoji: '\uD83E\uDDF1', name: 'Block Master' },
  { id: 'researcher',        emoji: '\uD83D\uDD0D', name: 'Researcher' },
  { id: 'rhetorician',       emoji: '\u270D\uFE0F', name: 'Rhetorician' },
  { id: 'voice-master',      emoji: '\uD83C\uDFA4', name: 'Voice Master' },
  { id: 'cx-master',         emoji: '\u2753', name: 'CX Master' },
  { id: 'unit-1-complete',   emoji: '\uD83C\uDFDB\uFE0F', name: 'Foundations' },
  { id: 'unit-2-complete',   emoji: '\u2694\uFE0F', name: 'Argument Architect' },
  { id: 'unit-3-complete',   emoji: '\uD83C\uDFAF', name: 'Round Strategist' },
  { id: 'unit-4-complete',   emoji: '\uD83D\uDCDA', name: 'Prep Machine' },
  { id: 'unit-5-complete',   emoji: '\uD83C\uDFAD', name: 'Performer' },
  { id: 'halfway',           emoji: '\uD83D\uDD25', name: 'Halfway There' },
  { id: 'congress-scholar',  emoji: '\uD83C\uDFC6', name: 'Congress Scholar' }
];

// --- STATE ---
var STATE_KEY = 'ascend_learn_state';
var state = JSON.parse(localStorage.getItem(STATE_KEY) || '{"completed":[],"badges":[]}');

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// --- RENDER ---
function renderBadgeShelf() {
  var shelf = document.getElementById('badgeShelf');
  shelf.innerHTML = BADGES.map(function (b) {
    var earned = state.badges.includes(b.id);
    return '<div class="badge-item">' +
      '<div class="badge-circle ' + (earned ? 'earned' : 'locked-badge') + '" id="badge-' + b.id + '">' + b.emoji + '</div>' +
      '<div class="badge-name">' + b.name + '</div>' +
    '</div>';
  }).join('');
}

function renderModuleCards() {
  UNITS.forEach(function (unit) {
    var container = document.getElementById('unit-' + unit.num + '-grid');
    if (!container) return;
    var unitModules = MODULES.filter(function (m) { return m.unit === unit.num; });

    // Update unit count
    var countEl = document.getElementById('unit-' + unit.num + '-count');
    if (countEl) countEl.textContent = unitModules.length + ' modules';

    container.innerHTML = unitModules.map(function (mod) {
      var completed = state.completed.includes(mod.id);
      var isBuilt = !!mod.file;
      var isExam = !!mod.exam;
      var statusClass = completed ? 'status-completed' : (isExam ? 'status-exam' : (isBuilt ? 'status-available' : 'status-locked'));
      var statusText = completed ? 'Completed \u2713' : (isExam ? 'Exam' : (isBuilt ? 'Available' : 'Coming Soon'));
      var cardClass = 'module-card' + (completed ? ' completed' : '') + (isExam ? ' exam' : '') + (isBuilt ? ' active' : ' locked');
      return '<div class="' + cardClass + '"' + (isBuilt ? ' onclick="openModule(\'' + mod.id + '\')"' : '') + ' id="card-' + mod.id + '">' +
        '<div class="module-top">' +
          '<div class="module-icon">' + mod.icon + '</div>' +
          '<span class="module-status ' + statusClass + '" id="status-' + mod.id + '">' + statusText + '</span>' +
        '</div>' +
        '<div class="module-num">' + (isExam ? 'Exam' : 'Module ' + mod.num) + '</div>' +
        '<div class="module-title">' + mod.title + '</div>' +
        '<div class="module-desc">' + mod.desc + '</div>' +
        '<div class="module-meta">' +
          '<span>\u23F1 ' + mod.duration + '</span>' +
          '<span>\u2726 ' + mod.activities + ' activities</span>' +
        '</div>' +
      '</div>';
    }).join('');
  });
}

function updateProgress() {
  var total = MODULES.length;
  var done = state.completed.length;
  var pct = Math.round((done / total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent = done + ' of ' + total + ' modules';
  document.getElementById('badgeCountLabel').textContent = state.badges.length + ' badge' + (state.badges.length !== 1 ? 's' : '') + ' earned';
}

// --- BADGES ---
function awardBadge(id) {
  if (!state.badges.includes(id)) {
    state.badges.push(id);
    saveState();
    if (typeof syncBadgeToSupabase === 'function') syncBadgeToSupabase(id);
    renderBadgeShelf();
    updateProgress();
    showBadgeToast(id);
  }
}

function showBadgeToast(id) {
  var badge = BADGES.find(function (b) { return b.id === id; });
  var label = badge ? badge.emoji + ' ' + badge.name : id;
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#111;color:#fff;padding:16px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.3);animation:slideUp 0.3s ease;';
  toast.innerHTML = '\uD83C\uDFC5 Badge Earned: ' + label;
  document.body.appendChild(toast);
  setTimeout(function () { toast.remove(); }, 3500);
}

function checkUnitBadges() {
  var unitBadgeMap = { 1: 'unit-1-complete', 2: 'unit-2-complete', 3: 'unit-3-complete', 4: 'unit-4-complete', 5: 'unit-5-complete' };
  UNITS.forEach(function (unit) {
    var unitModules = MODULES.filter(function (m) { return m.unit === unit.num; });
    var allDone = unitModules.every(function (m) { return state.completed.includes(m.id); });
    if (allDone) awardBadge(unitBadgeMap[unit.num]);
  });
}

// --- MODULE OVERLAY ---
function openModule(id) {
  var mod = MODULES.find(function (m) { return m.id === id; });
  if (!mod) return;

  var panel = document.getElementById('panelContent');

  if (!mod.file) {
    // Unbuilt module, coming soon
    panel.innerHTML =
      '<div class="panel-hero">' +
        '<div class="panel-eyebrow">Coming Soon</div>' +
        '<div class="panel-title">' + mod.title + '</div>' +
        '<div class="panel-desc">' + mod.desc + '</div>' +
      '</div>' +
      '<div class="panel-body">' +
        '<p style="color:#666;font-size:14px;">This module is in development. Check back soon, we\u2019re building the full Ascend curriculum here.</p>' +
      '</div>';
    document.getElementById('moduleOverlay').classList.add('open');
    return;
  }

  // Built module, show lesson list + launch
  var lessonsHtml = mod.lessons ? mod.lessons.map(function (l, i) {
    return '<li><div class="lesson-num">' + (i + 1) + '</div><span class="lesson-icon">' + l.icon + '</span><span>' + l.text + '</span></li>';
  }).join('') : '';

  panel.innerHTML =
    '<div class="panel-hero">' +
      '<div class="panel-eyebrow">Unit ' + mod.unit + ' \u00B7 Module ' + mod.num + '</div>' +
      '<div class="panel-title">' + mod.title + '</div>' +
      '<div class="panel-desc">' + mod.desc + '</div>' +
      '<div class="panel-meta-row">' +
        '<span>\u23F1 ' + mod.duration + '</span>' +
        '<span>\u2726 ' + (mod.lessons ? mod.lessons.length : mod.activities) + ' lessons</span>' +
        (mod.badge ? '<span>\uD83C\uDFC5 Earn a badge</span>' : '') +
      '</div>' +
    '</div>' +
    '<div class="panel-body">' +
      (lessonsHtml ? '<div class="panel-section-title">What You\u2019ll Learn</div><ul class="panel-lesson-list">' + lessonsHtml + '</ul>' : '') +
      '<button class="panel-cta" onclick="launchModule(\'' + mod.id + '\')">Start Module \u2192</button>' +
    '</div>';

  document.getElementById('moduleOverlay').classList.add('open');
}

function launchModule(id) {
  // Gate: require auth before launching
  if (typeof requireAuth === 'function') {
    requireAuth(function() { _doLaunchModule(id); });
  } else {
    _doLaunchModule(id);
  }
}

function _doLaunchModule(id) {
  closeModule();
  var mod = MODULES.find(function (m) { return m.id === id; });
  if (!mod || !mod.file) return;

  window.open(mod.file, '_blank');

  // Listen for completion
  function handler(e) {
    if (e.data === id + '-complete') {
      if (!state.completed.includes(id)) {
        state.completed.push(id);
        saveState();
        if (typeof syncCompletionToSupabase === 'function') syncCompletionToSupabase(id);
      }
      // Award first-step on first completion
      if (state.completed.length === 1) awardBadge('first-step');
      // Award module-specific badge
      if (mod.badge) awardBadge(mod.badge);
      // Check unit completion badges
      checkUnitBadges();
      // Halfway milestone
      if (state.completed.length >= Math.ceil(MODULES.length / 2)) awardBadge('halfway');
      // Check congress-scholar (all modules done)
      if (state.completed.length === MODULES.length) awardBadge('congress-scholar');
      renderModuleCards();
      updateProgress();
      renderContinueCard();
      renderUnitProgressRings();
      markRecentlyCompleted(id);
      animateNewBadges();
      addHoverPreviews();
      window.removeEventListener('message', handler);
    }
  }
  window.addEventListener('message', handler);
}

function closeModule() {
  document.getElementById('moduleOverlay').classList.remove('open');
}

// --- CONTINUE WHERE YOU LEFT OFF ---
function renderContinueCard() {
  var container = document.getElementById('continueCard');
  if (!container) return;
  var next = MODULES.find(function(m) { return m.file && !state.completed.includes(m.id); });
  if (!next || state.completed.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML =
    '<div class="continue-card" onclick="openModule(\'' + next.id + '\')">' +
      '<div class="continue-card-left">' +
        '<div class="continue-card-icon">' + next.icon + '</div>' +
        '<div>' +
          '<div class="continue-card-eyebrow">' + (localStorage.getItem('ascend_user_first') || '') + ', pick up where you left off</div>' +
          '<div class="continue-card-title">' + next.title + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="continue-card-btn">Continue →</button>' +
    '</div>';
}

// --- UNIT PROGRESS RINGS ---
function renderUnitProgressRings() {
  UNITS.forEach(function(unit) {
    var countEl = document.getElementById('unit-' + unit.num + '-count');
    if (!countEl) return;
    var unitMods = MODULES.filter(function(m) { return m.unit === unit.num; });
    var done = unitMods.filter(function(m) { return state.completed.includes(m.id); }).length;
    var total = unitMods.length;
    var pct = total > 0 ? done / total : 0;
    var r = 16, c = 2 * Math.PI * r;
    var offset = c * (1 - pct);
    var isComplete = done === total && total > 0;

    countEl.innerHTML =
      '<svg class="unit-progress-ring" viewBox="0 0 40 40">' +
        '<circle class="ring-bg" cx="20" cy="20" r="' + r + '"/>' +
        '<circle class="ring-fill' + (isComplete ? ' complete' : '') + '" cx="20" cy="20" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"/>' +
        '<text class="unit-progress-text" x="20" y="20">' + done + '/' + total + '</text>' +
      '</svg>';

    // Unit completion celebration
    var header = countEl.closest('.unit-header');
    if (header) {
      if (isComplete) header.classList.add('complete');
      else header.classList.remove('complete');
    }
  });
}

// --- RECENTLY COMPLETED HIGHLIGHT ---
var lastCompleted = null;
function markRecentlyCompleted(id) {
  lastCompleted = id;
  var card = document.getElementById('card-' + id);
  if (card) card.classList.add('just-completed');
  // Remove after 30 seconds
  setTimeout(function() {
    if (card) card.classList.remove('just-completed');
  }, 30000);
}

// --- NEW BADGE ANIMATION ---
var previousBadges = state.badges.slice();
function animateNewBadges() {
  state.badges.forEach(function(bid) {
    if (!previousBadges.includes(bid)) {
      var el = document.getElementById('badge-' + bid);
      if (el) el.classList.add('new-badge');
    }
  });
  previousBadges = state.badges.slice();
}

// --- SCROLL REVEAL ---
function initScrollReveal() {
  var units = document.querySelectorAll('.unit, .badge-section, .promo-section, .coming-soon-section');
  units.forEach(function(el) { el.classList.add('scroll-reveal'); });

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.scroll-reveal').forEach(function(el) {
    observer.observe(el);
  });
}

// --- DARK MODE ---
function initDarkMode() {
  var saved = localStorage.getItem('ascend_dark_mode');
  if (saved === 'true') {
    document.body.classList.add('dark-mode');
  } else if (saved === null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // No explicit user preference. Honor the OS/browser dark-mode setting.
    document.body.classList.add('dark-mode');
  }
}

// --- MODULE HOVER PREVIEWS ---
function addHoverPreviews() {
  MODULES.forEach(function(mod) {
    if (!mod.lessons || !mod.lessons[0]) return;
    var card = document.getElementById('card-' + mod.id);
    if (!card) return;
    var preview = document.createElement('div');
    preview.className = 'module-preview';
    preview.textContent = mod.lessons[0].text.split(', ')[0];
    card.appendChild(preview);
  });
}

// --- PARALLAX HERO ---
function initParallax() {
  var hero = document.querySelector('.hero');
  if (!hero || window.innerWidth < 768) return;
  window.addEventListener('scroll', function() {
    var scroll = window.pageYOffset;
    hero.style.backgroundPositionY = 'calc(30% + ' + (scroll * 0.3) + 'px)';
  });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', function () {
  renderBadgeShelf();
  renderModuleCards();
  updateProgress();
  renderContinueCard();
  renderUnitProgressRings();
  initScrollReveal();
  initDarkMode();
  addHoverPreviews();
  initParallax();

  // Init auth if available
  if (typeof initAuth === 'function') initAuth();

  // Close overlay on backdrop click
  document.getElementById('moduleOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeModule();
  });
});
