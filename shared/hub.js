/*  Ascend Academy — Hub Logic
    State management, module registry, card rendering, overlay, progress.
*/

// --- MODULE REGISTRY ---
// 24 modules across 4 units. Add file: 'modules/<id>.html' when module is built.
var MODULES = [
  // ── UNIT 1: Foundations of Congressional Debate (5 modules) ──
  { id: 'what-is-congress',     unit: 1, num: '1.1', title: 'What Is Congressional Debate?',     icon: '\u{1F3DB}\uFE0F', duration: '15 min', activities: 3, badge: null,
    desc: 'How the event works, what judges look for, and why it\u2019s the most strategic event in speech & debate.',
    file: 'modules/what-is-congress.html',
    lessons: [
      { icon: '\uD83C\uDFDB\uFE0F', text: 'The event at a glance \u2014 competing against 20 people at once' },
      { icon: '\uD83D\uDD04', text: 'How a round works \u2014 docket, speeches, cross-examination' },
      { icon: '\uD83C\uDFAF', text: 'The three pillars: argumentation, delivery, strategy' },
      { icon: '\uD83D\uDC53', text: 'What judges actually look for \u2014 experienced vs. lay' },
      { icon: '\u23F1\uFE0F', text: 'Speeches & speaking time \u2014 3 minutes, 30 seconds CX' },
      { icon: '\u2728', text: 'Why Congress is different from other debate events' },
      { icon: '\uD83C\uDFC6', text: 'Tournament structure \u2014 prelims, elims, nationals' },
      { icon: '\uD83D\uDE80', text: 'The Ascend approach \u2014 one deep argument beats three shallow ones' }
    ] },
  { id: 'how-chamber-works',    unit: 1, num: '1.2', title: 'How the Chamber Works',              icon: '\u2696\uFE0F', duration: '20 min', activities: 4, badge: null,
    desc: 'Precedence, recency, presiding officers, motions, and how rounds actually run from start to finish.',
    file: 'modules/how-chamber-works.html',
    lessons: [
      { icon: '\uD83D\uDCCB', text: 'The docket \u2014 what you debate and in what order' },
      { icon: '\uD83D\uDD22', text: 'Precedence & recency \u2014 who gets to speak' },
      { icon: '\uD83D\uDD28', text: 'The Presiding Officer \u2014 running the chamber' },
      { icon: '\uD83D\uDD04', text: 'Cycles of debate \u2014 how rounds evolve' },
      { icon: '\u270B', text: 'Motions \u2014 Previous Question, Lay on the Table, Recess' },
      { icon: '\uD83D\uDDF3\uFE0F', text: 'Voting on legislation \u2014 what it means (and doesn\u2019t)' },
      { icon: '\u2753', text: 'Questioning (CX) \u2014 strategy for questioners and speakers' },
      { icon: '\uD83C\uDFAC', text: 'A round from start to finish \u2014 full walkthrough' }
    ] },
  { id: 'becoming-po',          unit: 1, num: '1.3', title: 'Becoming a Presiding Officer',       icon: '\uD83D\uDD28', duration: '22 min', activities: 5, badge: 'presiding-officer',
    desc: 'How to get elected, run your procedure speech, handle motions, and be a judge\u2019s best friend.',
    file: 'modules/becoming-po.html',
    lessons: [
      { icon: '\uD83C\uDFC6', text: 'Why preside \u2014 the competitive advantage most students miss' },
      { icon: '\uD83D\uDDF3\uFE0F', text: 'Getting elected \u2014 winning the PO election' },
      { icon: '\uD83C\uDFA4', text: 'The procedure speech \u2014 what to say and how to say it' },
      { icon: '\uD83D\uDCCB', text: 'Running the docket \u2014 elections, sponsors, authorship' },
      { icon: '\uD83D\uDCDD', text: 'The PO sheet \u2014 tracking precedence and recency' },
      { icon: '\u270B', text: 'Handling motions \u2014 seconds, votes, execution' },
      { icon: '\u2764\uFE0F', text: 'Being a judge\u2019s best friend \u2014 what earns top PO scores' },
      { icon: '\u26A0\uFE0F', text: 'Common mistakes & tips \u2014 what to avoid' }
    ] },
  { id: 'reading-legislation',  unit: 1, num: '1.4', title: 'Reading & Analyzing Legislation',    icon: '\uD83D\uDCC4', duration: '15 min', activities: 3, badge: null,
    desc: 'How to break down a bill, understand what it actually does, and identify the real debate underneath.',
    file: 'modules/reading-legislation.html',
    lessons: [
      { icon: '\uD83D\uDCDA', text: 'Why reading the bill matters \u2014 the bill IS the debate' },
      { icon: '\uD83D\uDD2C', text: 'Anatomy of a bill \u2014 title, sections, funding, enactment' },
      { icon: '\u2753', text: 'The 5 questions to ask every bill' },
      { icon: '\uD83D\uDCDC', text: 'Bills vs. resolutions \u2014 different legislation, different arguments' },
      { icon: '\uD83C\uDFAF', text: 'Finding the real debate underneath the surface' },
      { icon: '\uD83D\uDD0D', text: 'Reading between the lines \u2014 vague funding, missing enforcement' },
      { icon: '\uD83E\uDDF1', text: 'From bill to argument \u2014 mapping to Block Format' },
      { icon: '\uD83D\uDCDD', text: 'Practice: breaking down a real bill' }
    ] },
  { id: 'standing-out-early',   unit: 1, num: '1.5', title: 'Standing Out in Early Rounds',       icon: '\u2B50', duration: '18 min', activities: 4, badge: null,
    desc: 'Prep strategy, framing, sponsorships, and the attention habits that separate good debaters from great ones in prelims.',
    file: 'modules/standing-out-early.html',
    lessons: [
      { icon: '\u2B50', text: 'What standing out actually means \u2014 being the speaker judges remember' },
      { icon: '\uD83D\uDD0D', text: 'Researching to be noticed \u2014 finding the angle others miss' },
      { icon: '\uD83D\uDDBC\uFE0F', text: 'The power of framing \u2014 defining the debate before anyone else' },
      { icon: '\uD83D\uDC42', text: 'Paying attention in round \u2014 the #1 differentiator' },
      { icon: '\uD83D\uDCE3', text: 'The sponsorship advantage \u2014 why most debaters are wrong to avoid it' },
      { icon: '\u2705', text: 'The sponsorship checklist \u2014 structure for a strong first speech' },
      { icon: '\uD83D\uDEE0\uFE0F', text: 'Constructive vs. canned \u2014 speeches that live in the round' },
      { icon: '\uD83E\uDDE0', text: 'The early-round mindset \u2014 every interaction is a scoring opportunity' }
    ] },

  // ── UNIT 2: Building Championship Arguments (9 modules) ──
  { id: 'anatomy-of-argument',  unit: 2, num: '2.1', title: 'The Anatomy of an Argument',         icon: '\uD83D\uDCA1', duration: '20 min', activities: 6, badge: null,
    desc: 'Every argument has four parts: Claim, Warrant, Evidence, and Impact. Master CWEI and you\u2019ll have the foundation for everything that follows.',
    file: 'modules/anatomy-of-argument.html',
    lessons: [
      { icon: '\uD83C\uDFAC', text: 'What makes a good argument \u2014 the universal structure' },
      { icon: '\uD83C\uDFAF', text: 'The Claim \u2014 your one-sentence thesis' },
      { icon: '\uD83E\uDDE0', text: 'The Warrant \u2014 the "because" behind the claim' },
      { icon: '\uD83D\uDCCA', text: 'Evidence & Data \u2014 backing it up with credible sources' },
      { icon: '\uD83D\uDCA5', text: 'The Impact \u2014 why your argument matters to real people' },
      { icon: '\uD83D\uDD17', text: 'Putting it all together \u2014 building a complete CWEI argument' }
    ] },
  { id: 'block-format',         unit: 2, num: '2.2', title: 'The Block Format',                   icon: '\uD83E\uDDF1', duration: '25 min', activities: 6, badge: 'block-master',
    desc: 'Ascend\u2019s signature argument structure. The same format that has won 5 TOCs and countless national championships.',
    file: 'modules/block-format.html',
    lessons: [
      { icon: '\uD83D\uDCD6', text: 'Why argument formats matter \u2014 efficiency, clarity, depth' },
      { icon: '\uD83D\uDD04', text: 'From CWEI to Block Format \u2014 the origin story' },
      { icon: '\uD83E\uDDF1', text: 'The 3 components: Status Quo, Outcome, Impact' },
      { icon: '\u270D\uFE0F', text: 'Status Quo deep dive \u2014 context + problem' },
      { icon: '\u26A1',       text: 'Outcome & Action \u2014 the legislative mechanism' },
      { icon: '\uD83D\uDCA5', text: 'Impact \u2014 humanizing and connecting to judges' },
      { icon: '\uD83C\uDFAC', text: 'Analyze a championship speech (Tyler Luu 2023 Nationals)' },
      { icon: '\uD83D\uDCDD', text: 'Pre-Requisites \u2014 framing before your argument' }
    ]
  },
  { id: 'squo-deep-dive',       unit: 2, num: '2.3', title: 'The Status Quo Deep Dive',           icon: '\uD83D\uDD2D', duration: '20 min', activities: 5, badge: null,
    desc: 'How to construct a SQUO that provides context, proves a problem, and doubles as preemptive refutation.',
    file: 'modules/squo-deep-dive.html',
    lessons: [
      { icon: '\uD83D\uDD2D', text: 'What the SQUO really does \u2014 unique to your argument, not the topic' },
      { icon: '\uD83C\uDFAF', text: 'The tagline \u2014 your one-sentence problem thesis' },
      { icon: '\uD83D\uDCCA', text: 'Evidence selection \u2014 one strong card beats two weak ones' },
      { icon: '\uD83D\uDEE1\uFE0F', text: 'SQUO as preemptive refutation \u2014 making your argument harder to attack' },
      { icon: '\u26A0\uFE0F', text: 'Common mistakes \u2014 too broad, too vague, too long' }
    ] },
  { id: 'outcome-action',       unit: 2, num: '2.4', title: 'Crafting Your Outcome & Action',     icon: '\u26A1',       duration: '20 min', activities: 5, badge: null,
    desc: 'The pivot from problem to solution \u2014 referencing legislation, proving the mechanism, making the link chain airtight.',
    file: 'modules/outcome-action.html',
    lessons: [
      { icon: '\u26A1', text: 'Action vs. Outcome \u2014 factual context vs. your argument' },
      { icon: '\uD83D\uDCC4', text: 'Referencing the legislation \u2014 citing specific bill sections' },
      { icon: '\uD83D\uDD17', text: 'Proving the mechanism \u2014 the link chain from action to result' },
      { icon: '\uD83C\uDFAF', text: 'The outcome IS your argument \u2014 specific enough to defend' },
      { icon: '\uD83E\uDDF1', text: 'Building an airtight link chain \u2014 full walkthrough' }
    ] },
  { id: 'impact-calculus',      unit: 2, num: '2.5', title: 'Impact Calculus',                     icon: '\uD83D\uDCA5', duration: '22 min', activities: 6, badge: null,
    desc: 'How to humanize your impact, make judges feel the stakes, and use the comparative to prove your side wins.',
    file: 'modules/impact-calculus.html',
    lessons: [
      { icon: '\uD83D\uDCA5', text: 'What is an impact \u2014 connecting to real human lives' },
      { icon: '\u2764\uFE0F', text: 'Humanizing your impact \u2014 stories + data' },
      { icon: '\uD83D\uDD17', text: 'Multiple impacts from one argument \u2014 the ripple effect' },
      { icon: '\u2696\uFE0F', text: 'The comparative \u2014 two-world framing' },
      { icon: '\uD83C\uDFAF', text: 'Terminalization \u2014 lives, safety, rights, dignity' },
      { icon: '\uD83D\uDCDD', text: 'Impact in practice \u2014 full walkthrough' }
    ] },
  { id: 'win-conditions',       unit: 2, num: '2.6', title: 'Win Conditions & The Comparative',   icon: '\uD83C\uDFAF', duration: '18 min', activities: 5, badge: null,
    desc: 'What actually wins rounds. The comparative framework, offense vs. defense, believability, and picking your side.',
    file: 'modules/win-conditions.html',
    lessons: [
      { icon: '\uD83C\uDFC6', text: 'What actually wins rounds \u2014 having a clear win condition' },
      { icon: '\u2696\uFE0F', text: 'The comparative framework \u2014 two worlds, one choice' },
      { icon: '\u2694\uFE0F', text: 'Offense vs. defense \u2014 building vs. tearing down' },
      { icon: '\uD83E\uDD1D', text: 'Believability \u2014 modest claims beat outlandish ones' },
      { icon: '\uD83E\uDDE0', text: 'Picking your side \u2014 strategic side selection in round' }
    ] },
  { id: 'finding-gaps',         unit: 2, num: '2.7', title: 'Finding Gaps & Generating Arguments', icon: '\uD83D\uDCA1', duration: '20 min', activities: 5, badge: null,
    desc: 'How to identify strengths and weaknesses in a debate, predict gaps, and create arguments that fill them.',
    file: 'modules/finding-gaps.html',
    lessons: [
      { icon: '\uD83D\uDCA1', text: 'What is a gap \u2014 the angle nobody has covered yet' },
      { icon: '\uD83D\uDD2E', text: 'Predicting gaps during prep \u2014 prep the non-obvious argument' },
      { icon: '\uD83D\uDC40', text: 'Reading the room \u2014 tracking what\u2019s been said in real time' },
      { icon: '\uD83E\uDDF1', text: 'Generating arguments from gaps \u2014 building blocks in-round' },
      { icon: '\uD83E\uDDE0', text: 'The gap mindset \u2014 listening is the ultimate strategic skill' }
    ] },
  { id: 'refutation',           unit: 2, num: '2.8', title: 'Prerequisites & Refutation',         icon: '\uD83D\uDEE1\uFE0F', duration: '20 min', activities: 6, badge: null,
    desc: 'How to frame the debate before your argument, where to place refutation inside block format, and when to cut content and adapt.',
    file: 'modules/refutation.html',
    lessons: [
      { icon: '\uD83D\uDD04', text: 'The prerequisite block \u2014 your road map for the round' },
      { icon: '\uD83D\uDDE3\uFE0F', text: 'Prereqs in practice \u2014 addressing opposition vs. framing clash' },
      { icon: '\uD83D\uDEE1\uFE0F', text: 'Where refutation goes \u2014 beginning of block, end of block, or prereq' },
      { icon: '\u2694\uFE0F', text: 'On-case vs. off-case refutation \u2014 what to prioritize' },
      { icon: '\u2702\uFE0F', text: 'Letting go \u2014 cutting content to make room for what judges want to hear' },
      { icon: '\uD83E\uDDE0', text: 'Know your debate \u2014 adapting to status quo debates vs. outcome debates' }
    ] },
  { id: 'block-format-late',    unit: 2, num: '2.9', title: 'Block Format in Late Rounds',        icon: '\uD83C\uDFC6', duration: '22 min', activities: 5, badge: null,
    desc: 'How the block format evolves as the round progresses \u2014 identifying clash, cutting content, and controlling the narrative.',
    file: 'modules/block-format-late.html',
    lessons: [
      { icon: '\uD83D\uDD04', text: 'Why late rounds are different \u2014 judges want something new' },
      { icon: '\uD83C\uDFAF', text: 'Identifying the central clash \u2014 name the core disagreement' },
      { icon: '\u2702\uFE0F', text: 'Cutting content \u2014 efficiency over completeness' },
      { icon: '\uD83D\uDDE3\uFE0F', text: 'Controlling the narrative \u2014 reframing the debate' },
      { icon: '\uD83D\uDC8E', text: 'The crystallization speech \u2014 summarize, compare, win' }
    ] },

  // ── UNIT 3: Research & Case Preparation (5 modules) ──
  { id: 'how-to-research',      unit: 3, num: '3.1', title: 'How to Research',                    icon: '\uD83D\uDD0D', duration: '20 min', activities: 5, badge: 'researcher',
    desc: 'From reading the bill to building a case \u2014 the systematic approach that finds evidence others miss.',
    file: 'modules/how-to-research.html',
    lessons: [
      { icon: '\uD83D\uDCC4', text: 'Start with the bill \u2014 read the legislation before anything else' },
      { icon: '\uD83D\uDD0D', text: 'Research strategy \u2014 where to look and what to look for' },
      { icon: '\uD83C\uDFAF', text: 'Finding the angle others miss \u2014 going beyond the obvious' },
      { icon: '\uD83D\uDCCA', text: 'Evaluating sources \u2014 credibility, recency, specificity' },
      { icon: '\uD83D\uDCC1', text: 'Organizing your research \u2014 from raw notes to usable prep' }
    ] },
  { id: 'turning-research-case', unit: 3, num: '3.2', title: 'Turning Research Into a Case',      icon: '\uD83D\uDCDD', duration: '20 min', activities: 5, badge: null,
    desc: 'From raw notes to a polished block. Proving outcome, finding past precedent, and stress-testing your argument.',
    file: 'modules/turning-research-case.html',
    lessons: [
      { icon: '\uD83D\uDCDD', text: 'From notes to blocks \u2014 mapping research to SQUO, Outcome, Impact' },
      { icon: '\uD83D\uDD17', text: 'Proving outcome \u2014 the evidence-to-mechanism link' },
      { icon: '\uD83D\uDCDC', text: 'Past precedent \u2014 finding real-world proof your argument works' },
      { icon: '\uD83E\uDD14', text: 'Stress-testing \u2014 attacking your own argument before opponents do' },
      { icon: '\u2728', text: 'Polishing \u2014 from functional block to competition-ready speech' }
    ] },
  { id: 'prime-prep',           unit: 3, num: '3.3', title: 'Prime-Level Prep',                   icon: '\uD83D\uDC51', duration: '22 min', activities: 5, badge: null,
    desc: 'What championship-level preparation actually looks like. The habits and frameworks that produce consistently high ranks.',
    file: 'modules/prime-prep.html',
    lessons: [
      { icon: '\uD83D\uDC51', text: 'What separates good prep from great prep \u2014 intentional hours' },
      { icon: '\uD83D\uDCC1', text: 'The prep document \u2014 structure for finding things under pressure' },
      { icon: '\uD83D\uDD2C', text: 'Depth over breadth \u2014 1-2 deep arguments beat 5 shallow ones' },
      { icon: '\uD83D\uDD04', text: 'Preparing for adaptation \u2014 backup angles and flexible blocks' },
      { icon: '\uD83D\uDCC5', text: 'The weekly routine \u2014 consistency beats cramming' }
    ] },
  { id: 'aff-neg-strategy',     unit: 3, num: '3.4', title: 'Aff vs. Neg Strategy',              icon: '\u2694\uFE0F', duration: '18 min', activities: 5, badge: null,
    desc: 'How to prepare both sides of any legislation \u2014 anticipating opposition arguments before you\u2019re in the room.',
    file: 'modules/aff-neg-strategy.html',
    lessons: [
      { icon: '\uD83D\uDD04', text: 'Always prep both sides \u2014 understanding opposition makes you stronger' },
      { icon: '\u2705', text: 'Affirmation strategy \u2014 proving the bill solves the problem' },
      { icon: '\u274C', text: 'Negation strategy \u2014 multiple angles of attack' },
      { icon: '\uD83D\uDEE1\uFE0F', text: 'Anticipating the opposition \u2014 preemptive refutation' },
      { icon: '\uD83E\uDDE0', text: 'Strategic side selection \u2014 choosing your side in round' }
    ] },
  { id: 'evidence-citing',      unit: 3, num: '3.5', title: 'Evidence & Citing Sources',          icon: '\uD83D\uDCCA', duration: '15 min', activities: 4, badge: null,
    desc: 'What makes evidence credible, how to cite it in round, and how to attack weak evidence from opponents.',
    file: 'modules/evidence-citing.html',
    lessons: [
      { icon: '\uD83D\uDCCA', text: 'What makes evidence credible \u2014 source quality hierarchy' },
      { icon: '\uD83C\uDFA4', text: 'How to cite in round \u2014 the standard format' },
      { icon: '\u2694\uFE0F', text: 'Using evidence strategically \u2014 one strong card beats three weak ones' },
      { icon: '\uD83D\uDD2C', text: 'Attacking weak evidence \u2014 outdated, biased, cherry-picked' }
    ] },

  // ── UNIT 4: Performance, Presence & Strategy (8 modules) ──
  { id: 'rhetoric-intros',      unit: 4, num: '4.1', title: 'Rhetoric, Intros & Conclusions',     icon: '\u270D\uFE0F', duration: '22 min', activities: 6, badge: null,
    desc: 'How to turn arguments into stories judges remember. Writing rhetoric within blocks, crafting intros, tying conclusions, and finding your voice on paper.',
    file: 'modules/rhetoric-intros.html',
    lessons: [
      { icon: '\uD83C\uDFAC', text: 'What is rhetoric \u2014 persuasion with words, not just facts' },
      { icon: '\uD83D\uDCDD', text: 'Rhetoric within blocks \u2014 summarize, humanize, move on' },
      { icon: '\uD83C\uDFAD', text: 'Writing rhetoric in practice \u2014 the universal pre-K example' },
      { icon: '\uD83C\uDFA4', text: 'Crafting your intro \u2014 theme first, first line last' },
      { icon: '\uD83D\uDD17', text: 'Conclusions \u2014 tying back to your theme and stakeholders' },
      { icon: '\uD83D\uDD25', text: 'Finding your voice \u2014 write about what interests you most' }
    ] },
  { id: 'voice-delivery',       unit: 4, num: '4.2', title: 'Voice & Delivery',                   icon: '\uD83C\uDFA4', duration: '20 min', activities: 5, badge: 'presence',
    desc: 'Finding your voice, base tone, fluctuation, speed, and passion \u2014 how to sound like yourself, not a debate robot.',
    file: 'modules/voice-delivery.html',
    lessons: [
      { icon: '\uD83C\uDFA4', text: 'Finding your base tone \u2014 your natural voice is the starting point' },
      { icon: '\uD83C\uDFB5', text: 'Vocal variety \u2014 pitch, speed, volume, and strategic pauses' },
      { icon: '\u23F1\uFE0F', text: 'Speed and pacing \u2014 conversational pace wins over rushing' },
      { icon: '\uD83D\uDD25', text: 'Passion and authenticity \u2014 care about what you\u2019re saying' },
      { icon: '\u26A0\uFE0F', text: 'Common delivery mistakes \u2014 and how to fix them' }
    ] },
  { id: 'movement-physicality', unit: 4, num: '4.3', title: 'Movement & Physicality',             icon: '\uD83E\uDDD1\u200D\uD83C\uDFA4', duration: '18 min', activities: 5, badge: null,
    desc: 'Speaking stance, the speaker diamond, hand motions, and facial expressions \u2014 what judges see before they hear you.',
    file: 'modules/movement-physicality.html',
    lessons: [
      { icon: '\uD83E\uDDD1\u200D\uD83C\uDFA4', text: 'The speaker stance \u2014 projecting confidence before you speak' },
      { icon: '\uD83D\uDD37', text: 'The speaker diamond \u2014 where your hands should move' },
      { icon: '\u270B', text: 'Hand gestures with purpose \u2014 every gesture reinforces your words' },
      { icon: '\uD83D\uDC41\uFE0F', text: 'Eye contact and facial expressions \u2014 look at judges, not paper' },
      { icon: '\uD83D\uDEB6', text: 'The walk-up and walk-back \u2014 first and last impressions' }
    ] },
  { id: 'chamber-presence',     unit: 4, num: '4.4', title: 'Chamber Presence & Walk-Ups',        icon: '\u2728',       duration: '18 min', activities: 5, badge: null,
    desc: 'How to carry yourself before, between, and after speeches. Walk-ups, stereotypes to avoid, and commanding the room.',
    file: 'modules/chamber-presence.html',
    lessons: [
      { icon: '\uD83D\uDC41\uFE0F', text: 'Presence is always on \u2014 judges watch you even when you\u2019re not speaking' },
      { icon: '\uD83D\uDEB6', text: 'The walk-up \u2014 10 seconds that set the tone' },
      { icon: '\uD83D\uDCDD', text: 'Between speeches \u2014 notes, engagement, and CX questions' },
      { icon: '\u26A0\uFE0F', text: 'Stereotypes to avoid \u2014 checked out, too cool, nervous fidgeter' },
      { icon: '\u2728', text: 'Commanding the room \u2014 being someone judges notice all round' }
    ] },
  { id: 'personality-energy',   unit: 4, num: '4.5', title: 'Personality & Stage Energy',         icon: '\uD83D\uDD25', duration: '15 min', activities: 4, badge: null,
    desc: 'Developing your persona, energy management, and the traits judges reward in close rounds.',
    file: 'modules/personality-energy.html',
    lessons: [
      { icon: '\uD83C\uDFAD', text: 'Your debate persona \u2014 find what\u2019s natural and lean in' },
      { icon: '\u26A1', text: 'Energy management \u2014 match energy to content' },
      { icon: '\uD83C\uDFC6', text: 'What judges reward in close rounds \u2014 the tiebreakers' },
      { icon: '\u2764\uFE0F', text: 'Being yourself \u2014 authenticity beats performance' }
    ] },
  { id: 'ballot-watch',         unit: 4, num: '4.6', title: 'Reading the Ballot',                 icon: '\uD83D\uDCCB', duration: '18 min', activities: 5, badge: null,
    desc: 'What judges actually write down, what they reward, and how to improve even from bare ballots.',
    file: 'modules/ballot-watch.html',
    lessons: [
      { icon: '\uD83D\uDCCB', text: 'What judges write down \u2014 1-3 sentences per speaker' },
      { icon: '\u2B50', text: 'What judges reward \u2014 common praise and criticism patterns' },
      { icon: '\uD83D\uDD0D', text: 'Reading between the lines \u2014 decoding diplomatic feedback' },
      { icon: '\uD83D\uDCCA', text: 'Learning from bare ballots \u2014 patterns across rounds' },
      { icon: '\uD83D\uDD04', text: 'The improvement loop \u2014 one fix per tournament cycle' }
    ] },
  { id: 'cx-strategy',          unit: 4, num: '4.7', title: 'Cross-Examination Strategy',         icon: '\u2753',       duration: '20 min', activities: 5, badge: 'strategist',
    desc: 'How to ask questions that expose weaknesses, how to handle hostile questioning, and how to use CX to set up your next speech.',
    file: 'modules/cx-strategy.html',
    lessons: [
      { icon: '\u2753', text: 'Why CX matters \u2014 a scoring opportunity most debaters waste' },
      { icon: '\uD83C\uDFAF', text: 'Asking good questions \u2014 specific, targeted, gap-exposing' },
      { icon: '\uD83C\uDFA4', text: 'Setting up your speech \u2014 CX as a preview of your argument' },
      { icon: '\uD83D\uDEE1\uFE0F', text: 'Handling hostile questions \u2014 calm, concise, pivot' },
      { icon: '\u23F1\uFE0F', text: 'The 30-second rule \u2014 one focused question, not three' }
    ] },
  { id: 'tournament-day',       unit: 4, num: '4.8', title: 'Tournament Day Execution',           icon: '\uD83D\uDDD3\uFE0F', duration: '15 min', activities: 4, badge: null,
    desc: 'From the night before to the final round \u2014 the routines, mindset, and adaptations that produce peak performance.',
    file: 'modules/tournament-day.html',
    lessons: [
      { icon: '\uD83C\uDF19', text: 'The night before \u2014 read bills, preliminary research, get sleep' },
      { icon: '\u2600\uFE0F', text: 'Morning routine \u2014 arrive early, review, trust your prep' },
      { icon: '\uD83D\uDD04', text: 'Between rounds \u2014 ballots, adjustments, switching backup angles' },
      { icon: '\uD83C\uDFC6', text: 'The finals mindset \u2014 execution over preparation at the top level' }
    ] }
];

var UNITS = [
  { num: 1, title: 'Foundations of Congressional Debate' },
  { num: 2, title: 'Building Championship Arguments' },
  { num: 3, title: 'Research & Case Preparation' },
  { num: 4, title: 'Performance, Presence & Strategy' }
];

var BADGES = [
  { id: 'first-step',        emoji: '\uD83D\uDE80', name: 'First Step' },
  { id: 'presiding-officer', emoji: '\u2696\uFE0F', name: 'PO Expert' },
  { id: 'block-master',      emoji: '\uD83E\uDDF1', name: 'Block Master' },
  { id: 'researcher',        emoji: '\uD83D\uDD0D', name: 'Researcher' },
  { id: 'presence',          emoji: '\uD83C\uDFA4', name: 'Presence' },
  { id: 'strategist',        emoji: '\u265F\uFE0F', name: 'Strategist' },
  { id: 'unit-1-complete',   emoji: '\uD83C\uDFDB\uFE0F', name: 'Foundations' },
  { id: 'unit-2-complete',   emoji: '\u2694\uFE0F', name: 'Argument Architect' },
  { id: 'unit-3-complete',   emoji: '\uD83D\uDCDA', name: 'Prep Machine' },
  { id: 'unit-4-complete',   emoji: '\uD83C\uDFAD', name: 'Performer' },
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
      var statusClass = completed ? 'status-completed' : (isBuilt ? 'status-available' : 'status-locked');
      var statusText = completed ? 'Completed \u2713' : (isBuilt ? 'Available' : 'Coming Soon');
      var cardClass = 'module-card' + (completed ? ' completed' : '') + (isBuilt ? ' active' : ' locked');
      return '<div class="' + cardClass + '"' + (isBuilt ? ' onclick="openModule(\'' + mod.id + '\')"' : '') + ' id="card-' + mod.id + '">' +
        '<div class="module-top">' +
          '<div class="module-icon">' + mod.icon + '</div>' +
          '<span class="module-status ' + statusClass + '" id="status-' + mod.id + '">' + statusText + '</span>' +
        '</div>' +
        '<div class="module-num">Module ' + mod.num + '</div>' +
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
  var unitBadgeMap = { 1: 'unit-1-complete', 2: 'unit-2-complete', 3: 'unit-3-complete', 4: 'unit-4-complete' };
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
    // Unbuilt module — coming soon
    panel.innerHTML =
      '<div class="panel-hero">' +
        '<div class="panel-eyebrow">Coming Soon</div>' +
        '<div class="panel-title">' + mod.title + '</div>' +
        '<div class="panel-desc">' + mod.desc + '</div>' +
      '</div>' +
      '<div class="panel-body">' +
        '<p style="color:#666;font-size:14px;">This module is in development. Check back soon \u2014 we\u2019re building the full Ascend curriculum here.</p>' +
      '</div>';
    document.getElementById('moduleOverlay').classList.add('open');
    return;
  }

  // Built module — show lesson list + launch
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
      window.removeEventListener('message', handler);
    }
  }
  window.addEventListener('message', handler);
}

function closeModule() {
  document.getElementById('moduleOverlay').classList.remove('open');
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', function () {
  renderBadgeShelf();
  renderModuleCards();
  updateProgress();

  // Close overlay on backdrop click
  document.getElementById('moduleOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeModule();
  });
});
