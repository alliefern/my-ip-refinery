/**
 * Seeded demo project: "The Aligned Offer Suite" — a business coach with
 * six recorded trainings about designing and selling a signature offer.
 * Every entity here exercises a real UI surface. Demo data is clearly
 * labelled in the UI; nothing in it is presented as a real customer.
 */

import type {
  CourseBlueprint,
  CourseOpportunity,
  GapQuestion,
  IpItem,
  Lesson,
  LessonSource,
  Module,
  ProcessingJob,
  Project,
  SourceAsset,
  TranscriptChunk,
  UsageEvent,
  VaultEntry,
} from "../types";

export const DEMO_USER = {
  id: "demo-user-1",
  email: "demo@myiprefinery.com",
  displayName: "Demo Creator",
};

const now = "2026-07-20T16:00:00.000Z";

export const demoProject: Project = {
  id: "demo-project-1",
  userId: DEMO_USER.id,
  name: "Signature Offer Trainings",
  status: "AWAITING_BLUEPRINT_APPROVAL",
  selectedCourseOpportunityId: "opp-1",
  intake: {
    coursePurpose: "paid_mini_course",
    topic: "Designing and selling a signature offer",
    studentResult:
      "Package their expertise into one clear signature offer and sell the first five spots",
    resultTimeframe: "30 days",
    audience: "Service providers and coaches doing custom 1:1 work",
    audienceProblem:
      "They sell bespoke projects, reinvent the wheel for every client, and their income is capped by hours",
    audienceEndAbility:
      "Define, price and pitch one repeatable signature offer",
    depth: "mini_course",
    isPaid: true,
    targetPrice: "$297",
    nextStep: "Join the 12-week group program",
  },
  voiceSettings: {
    languageVariant: "us",
    tone: "conversational",
    profanity: "light",
    preserveSignaturePhrases: true,
  },
  ipMap: {
    dominant_themes: [
      "Offers fail on targeting before they fail on price",
      "Package one sharp outcome, not a menu of deliverables",
      "Validate with real buyers before building anything",
    ],
    signature_frameworks: [
      "The Offer Spine (Person / Problem / Process / Proof)",
      "The One Person Principle",
      "The Founding Five",
      "The Red Flag Filter",
      "The 10x Gap",
    ],
    repeated_teachings: [
      "Price the outcome, not the hours (appears in 3 trainings)",
    ],
    unique_insights: [
      "Niche the problem, not the industry (Strategy Audio)",
    ],
    contradictions: [
      {
        topic: "Starting price advice",
        positions: [
          "Start slightly uncomfortable, raise every three clients",
          "Anchor to problem cost first, comfort second",
        ],
        trainings: ["Group Call: Offer Teardowns"],
      },
    ],
    missing_steps: [
      "Red Flag Filter criteria 4–5 referenced but never stated on any recording",
    ],
    bonus_material: [
      "Payment-plan Q&A (Offer Teardowns) — useful, but not on the core path",
    ],
    other_product_material: [
      "Cold-audience validation would need its own training material",
    ],
  },
  createdAt: "2026-07-14T10:00:00.000Z",
  updatedAt: now,
};

export const demoAssets: SourceAsset[] = [
  {
    id: "asset-1",
    projectId: demoProject.id,
    kind: "video",
    originalFilename: "offer-workshop-jan-replay.mp4",
    displayTitle: "Offer Design Workshop (January replay)",
    mimeType: "video/mp4",
    sizeBytes: 1_824_000_000,
    durationSeconds: 4980,
    status: "READY",
    errorMessage: null,
    originalDeletedAt: null,
    createdAt: "2026-07-14T10:12:00.000Z",
  },
  {
    id: "asset-2",
    projectId: demoProject.id,
    kind: "video",
    originalFilename: "zoom_0132_pricing-masterclass.mp4",
    displayTitle: "Pricing Masterclass",
    mimeType: "video/mp4",
    sizeBytes: 1_210_000_000,
    durationSeconds: 3720,
    status: "READY",
    errorMessage: null,
    originalDeletedAt: null,
    createdAt: "2026-07-14T10:14:00.000Z",
  },
  {
    id: "asset-3",
    projectId: demoProject.id,
    kind: "video",
    originalFilename: "q2-group-call-offer-teardowns.mp4",
    displayTitle: "Group Call: Offer Teardowns",
    mimeType: "video/mp4",
    sizeBytes: 2_400_000_000,
    durationSeconds: 5340,
    status: "READY",
    errorMessage: null,
    originalDeletedAt: null,
    createdAt: "2026-07-14T10:15:00.000Z",
  },
  {
    id: "asset-4",
    projectId: demoProject.id,
    kind: "video",
    originalFilename: "webinar-sell-before-you-build.mp4",
    displayTitle: "Webinar: Sell Before You Build",
    mimeType: "video/mp4",
    sizeBytes: 980_000_000,
    durationSeconds: 3240,
    status: "READY",
    errorMessage: null,
    originalDeletedAt: null,
    createdAt: "2026-07-14T10:17:00.000Z",
  },
  {
    id: "asset-5",
    projectId: demoProject.id,
    kind: "audio",
    originalFilename: "voxer-strategy-audio-compilation.m4a",
    displayTitle: "Client Strategy Audio Compilation",
    mimeType: "audio/mp4",
    sizeBytes: 210_000_000,
    durationSeconds: 2460,
    status: "READY",
    errorMessage: null,
    originalDeletedAt: null,
    createdAt: "2026-07-14T10:18:00.000Z",
  },
  {
    id: "asset-6",
    projectId: demoProject.id,
    kind: "slide_deck",
    originalFilename: "offer-workshop-slides.pdf",
    displayTitle: "Offer Workshop Slides",
    mimeType: "application/pdf",
    sizeBytes: 18_000_000,
    durationSeconds: null,
    status: "READY",
    errorMessage: null,
    originalDeletedAt: null,
    createdAt: "2026-07-14T10:19:00.000Z",
  },
];

export const demoChunks: TranscriptChunk[] = [
  {
    id: "chunk-1-1",
    sourceAssetId: "asset-1",
    sequenceNumber: 1,
    startSeconds: 0,
    endSeconds: 600,
    cleanText:
      "Okay, welcome in. Today we're building your signature offer from the ground up. Before we touch pricing, before we touch a sales page, we start with what I call the One Person Principle: your offer is built for one specific person with one expensive problem. Not an avatar deck, not a demographic — one person whose problem costs them real money or real peace every single week. When people tell me their offer isn't selling, nine times out of ten it's not the price, it's that the offer is built for a crowd instead of a person.",
  },
  {
    id: "chunk-1-2",
    sourceAssetId: "asset-1",
    sequenceNumber: 2,
    startSeconds: 595,
    endSeconds: 1200,
    cleanText:
      "So the framework we use is the Offer Spine. Four vertebrae: Person, Problem, Process, Proof. Person — who exactly. Problem — the expensive problem in their words, not yours. Process — your repeatable path, and yes you have one even if you've never written it down, we're going to excavate it. Proof — evidence your path works. Every offer that flops is missing a vertebra. My client Dana, the brand photographer, doubled her booking rate in six weeks just by rebuilding her offer page around the Spine — same price, same service, different skeleton.",
  },
  {
    id: "chunk-1-3",
    sourceAssetId: "asset-1",
    sequenceNumber: 3,
    startSeconds: 1195,
    endSeconds: 1800,
    cleanText:
      "Now the biggest mistake — write this down — is what I call Frankenstein packaging. You take everything you know how to do and staple it together into one giant deliverable list because you're scared of leaving value on the table. Stop it. A signature offer is not a buffet. The market pays for a sharp outcome, not a long menu. If your offer page reads like a CVS receipt, we have work to do today.",
  },
  {
    id: "chunk-2-1",
    sourceAssetId: "asset-2",
    sequenceNumber: 1,
    startSeconds: 0,
    endSeconds: 600,
    cleanText:
      "Pricing. Everyone's favorite panic attack. Here's my position and I'll die on this hill: price the outcome, not the hours. Hourly pricing punishes you for getting faster at your craft. The better you get, the less you earn per project — that math is broken. We price against the cost of the problem. If the problem costs the client twenty thousand a year and you fix it, a three thousand dollar offer is not expensive, it's a bargain with a bow on it.",
  },
  {
    id: "chunk-2-2",
    sourceAssetId: "asset-2",
    sequenceNumber: 2,
    startSeconds: 595,
    endSeconds: 1220,
    cleanText:
      "My rule of thumb — the 10x Gap — the transformation should be worth roughly ten times the price to the right buyer. Not because of a magic number, but because that gap is what makes the buying decision feel safe. And run it through the Red Flag Filter before you launch: is the promise measurable, is the timeline honest, is the person actually reachable by your marketing... I think there are two more criteria on the slide, check the workshop deck.",
  },
  {
    id: "chunk-3-1",
    sourceAssetId: "asset-3",
    sequenceNumber: 1,
    startSeconds: 0,
    endSeconds: 640,
    cleanText:
      "Let's tear down Maya's offer first. Maya, you wrote 'brand strategy intensive — $1,500.' Here's the thing: intensive describes your calendar, not their outcome. Nobody wakes up wanting an intensive. They wake up wanting to stop losing proposals to cheaper competitors. See how the Spine fixes this? Person: agency owners losing bids. Problem: undifferentiated positioning. Process: your 90-minute diagnostic plus the roadmap. Proof: the three agencies you've repositioned. Now it's 'Win the bids you keep losing' — same work, real offer.",
  },
  {
    id: "chunk-3-2",
    sourceAssetId: "asset-3",
    sequenceNumber: 2,
    startSeconds: 635,
    endSeconds: 1260,
    cleanText:
      "Someone asked about payment plans. Fine, but hear me: a payment plan is a convenience, not a discount in disguise. Full pay can get a bonus, but never punish the payment plan people with a worse program. And on pricing — look, I used to say start at whatever feels slightly uncomfortable and raise it every three clients. I've evolved on this: now I say anchor to the problem cost first, comfort second. The old advice made people start way too low.",
  },
  {
    id: "chunk-4-1",
    sourceAssetId: "asset-4",
    sequenceNumber: 1,
    startSeconds: 0,
    endSeconds: 630,
    cleanText:
      "The webinar title says it all: sell before you build. You do not need the curriculum finished, the portal branded, the workbook designed. You need five humans who said yes with their wallet. I call it the Founding Five. Five buyers at a founding price validates the offer better than five hundred survey responses. Surveys are people being polite. Payment is people being honest.",
  },
  {
    id: "chunk-4-2",
    sourceAssetId: "asset-4",
    sequenceNumber: 2,
    startSeconds: 625,
    endSeconds: 1250,
    cleanText:
      "How do you get the Founding Five? Direct outreach to people who already trust you — past clients, warm audience, referral partners. The pitch is three sentences: here's who it's for, here's the outcome, here's the founding deal. Then deliver it live, keep receipts, and those receipts become your Proof vertebra for the public launch. This is the whole flywheel.",
  },
  {
    id: "chunk-5-1",
    sourceAssetId: "asset-5",
    sequenceNumber: 1,
    startSeconds: 0,
    endSeconds: 610,
    cleanText:
      "Quick strategy note from a client question this week: she asked whether to niche the offer down further. My take — you niche the problem, not the industry. You can serve photographers and consultants and designers as long as the problem is identical: custom work, capped income, no repeatable offer. The industry-niche advice gets repeated everywhere and it stalls people for months.",
  },
];

export const demoIpItems: IpItem[] = [
  {
    id: "ip-1",
    projectId: demoProject.id,
    sourceAssetId: "asset-1",
    transcriptChunkId: "chunk-1-1",
    type: "signature_framework",
    title: "The One Person Principle",
    content:
      "Build the offer for one specific person with one expensive problem, not an audience segment. Diagnosis: when an offer doesn't sell, the cause is usually crowd-targeting rather than price.",
    startSeconds: 40,
    endSeconds: 300,
    confidenceScore: 0.95,
    distinctivenessScore: 0.85,
    supportType: "source",
  },
  {
    id: "ip-2",
    projectId: demoProject.id,
    sourceAssetId: "asset-1",
    transcriptChunkId: "chunk-1-2",
    type: "signature_framework",
    title: "The Offer Spine (Person / Problem / Process / Proof)",
    content:
      "Four-part structure every offer needs: the exact Person, their expensive Problem in their own words, the repeatable Process, and Proof it works. Missing any vertebra predicts a flop.",
    startSeconds: 600,
    endSeconds: 900,
    confidenceScore: 0.98,
    distinctivenessScore: 0.92,
    supportType: "source",
  },
  {
    id: "ip-3",
    projectId: demoProject.id,
    sourceAssetId: "asset-1",
    transcriptChunkId: "chunk-1-2",
    type: "case_study",
    title: "Dana the brand photographer",
    content:
      "Client rebuilt her offer page around the Offer Spine — same price and service — and doubled her booking rate in six weeks.",
    startSeconds: 980,
    endSeconds: 1150,
    confidenceScore: 0.9,
    distinctivenessScore: 0.8,
    supportType: "source",
  },
  {
    id: "ip-4",
    projectId: demoProject.id,
    sourceAssetId: "asset-1",
    transcriptChunkId: "chunk-1-3",
    type: "common_mistake",
    title: "Frankenstein packaging",
    content:
      "Stapling every capability into one bloated deliverable list out of fear of leaving value on the table. The market pays for a sharp outcome, not a long menu.",
    startSeconds: 1210,
    endSeconds: 1500,
    confidenceScore: 0.95,
    distinctivenessScore: 0.88,
    supportType: "source",
  },
  {
    id: "ip-5",
    projectId: demoProject.id,
    sourceAssetId: "asset-2",
    transcriptChunkId: "chunk-2-1",
    type: "strong_opinion",
    title: "Price the outcome, not the hours",
    content:
      "Hourly pricing punishes skill: the faster you get, the less you earn. Price against the cost of the client's problem instead.",
    startSeconds: 30,
    endSeconds: 350,
    confidenceScore: 0.97,
    distinctivenessScore: 0.7,
    supportType: "source",
  },
  {
    id: "ip-6",
    projectId: demoProject.id,
    sourceAssetId: "asset-2",
    transcriptChunkId: "chunk-2-2",
    type: "concept",
    title: "The 10x Gap",
    content:
      "The transformation should be worth roughly ten times the price to the right buyer — the gap is what makes buying feel safe.",
    startSeconds: 600,
    endSeconds: 800,
    confidenceScore: 0.93,
    distinctivenessScore: 0.75,
    supportType: "source",
  },
  {
    id: "ip-7",
    projectId: demoProject.id,
    sourceAssetId: "asset-2",
    transcriptChunkId: "chunk-2-2",
    type: "signature_framework",
    title: "The Red Flag Filter (incomplete)",
    content:
      "Pre-launch checklist: measurable promise, honest timeline, reachable person — plus two more criteria referenced but never stated on the recording. Flagged as a content gap.",
    startSeconds: 900,
    endSeconds: 1150,
    confidenceScore: 0.85,
    distinctivenessScore: 0.9,
    supportType: "source",
  },
  {
    id: "ip-8",
    projectId: demoProject.id,
    sourceAssetId: "asset-3",
    transcriptChunkId: "chunk-3-1",
    type: "example",
    title: "Maya's offer teardown",
    content:
      "Live rewrite of 'brand strategy intensive — $1,500' into 'Win the bids you keep losing' by walking the offer through the four Spine vertebrae.",
    startSeconds: 20,
    endSeconds: 620,
    confidenceScore: 0.94,
    distinctivenessScore: 0.82,
    supportType: "source",
  },
  {
    id: "ip-9",
    projectId: demoProject.id,
    sourceAssetId: "asset-3",
    transcriptChunkId: "chunk-3-2",
    type: "strong_opinion",
    title: "Payment plans are a convenience, not a discount",
    content:
      "Offer payment plans without degrading the program; reward full pay with a bonus rather than punishing installments.",
    startSeconds: 640,
    endSeconds: 850,
    confidenceScore: 0.9,
    distinctivenessScore: 0.65,
    supportType: "source",
  },
  {
    id: "ip-10",
    projectId: demoProject.id,
    sourceAssetId: "asset-3",
    transcriptChunkId: "chunk-3-2",
    type: "result_or_claim",
    title: "Evolved pricing position (contradiction with earlier advice)",
    content:
      "Older advice: start slightly uncomfortable, raise every three clients. Current position: anchor to problem cost first. The recordings contain both — flagged as a contradiction to resolve.",
    startSeconds: 950,
    endSeconds: 1250,
    confidenceScore: 0.88,
    distinctivenessScore: 0.7,
    supportType: "source",
  },
  {
    id: "ip-11",
    projectId: demoProject.id,
    sourceAssetId: "asset-4",
    transcriptChunkId: "chunk-4-1",
    type: "named_methodology",
    title: "The Founding Five",
    content:
      "Validate by selling five founding-price spots before building anything. 'Surveys are people being polite. Payment is people being honest.'",
    startSeconds: 60,
    endSeconds: 550,
    confidenceScore: 0.96,
    distinctivenessScore: 0.9,
    supportType: "source",
  },
  {
    id: "ip-12",
    projectId: demoProject.id,
    sourceAssetId: "asset-4",
    transcriptChunkId: "chunk-4-2",
    type: "step_or_process",
    title: "Founding Five outreach process",
    content:
      "Direct outreach to warm contacts with a three-sentence pitch (who it's for, the outcome, the founding deal), deliver live, collect receipts, feed receipts into the Proof vertebra for public launch.",
    startSeconds: 630,
    endSeconds: 1100,
    confidenceScore: 0.92,
    distinctivenessScore: 0.84,
    supportType: "source",
  },
  {
    id: "ip-13",
    projectId: demoProject.id,
    sourceAssetId: "asset-5",
    transcriptChunkId: "chunk-5-1",
    type: "strong_opinion",
    title: "Niche the problem, not the industry",
    content:
      "Serve multiple industries as long as the expensive problem is identical; industry-niching advice stalls people for months.",
    startSeconds: 45,
    endSeconds: 400,
    confidenceScore: 0.91,
    distinctivenessScore: 0.86,
    supportType: "source",
  },
  {
    id: "ip-14",
    projectId: demoProject.id,
    sourceAssetId: "asset-1",
    transcriptChunkId: "chunk-1-1",
    type: "distinctive_phrase",
    title: "\"Built for a crowd instead of a person\"",
    content:
      "Recurring diagnostic phrase for why offers fail to sell.",
    startSeconds: 250,
    endSeconds: 300,
    confidenceScore: 0.9,
    distinctivenessScore: 0.8,
    supportType: "source",
  },
  {
    id: "ip-15",
    projectId: demoProject.id,
    sourceAssetId: "asset-6",
    transcriptChunkId: null,
    type: "template_or_resource",
    title: "Offer Spine worksheet (slides)",
    content:
      "The workshop deck contains the full Offer Spine worksheet and — per the pricing masterclass reference — likely the complete Red Flag Filter criteria.",
    startSeconds: null,
    endSeconds: null,
    confidenceScore: 0.8,
    distinctivenessScore: 0.7,
    supportType: "source",
  },
];

export const demoOpportunities: CourseOpportunity[] = [
  {
    id: "opp-1",
    projectId: demoProject.id,
    title: "The Signature Offer Sprint",
    audience: "Custom-work service providers ready to productize",
    transformation:
      "Design one signature offer with the Offer Spine and validate it by selling the Founding Five within 30 days",
    rationale:
      "Strongest cross-training coverage: the Spine, pricing philosophy, teardown examples and the Founding Five method form a complete, sequential path from idea to first sales. Rich in proprietary frameworks and live examples.",
    missingMaterial: [
      "Complete Red Flag Filter criteria (only 3 of ~5 stated on recordings)",
      "A worked example of setting a specific price using the 10x Gap",
    ],
    strengthScore: 0.92,
    isRecommended: true,
  },
  {
    id: "opp-2",
    projectId: demoProject.id,
    title: "Price With a Spine",
    audience: "Established freelancers stuck at hourly billing",
    transformation: "Move from hourly billing to outcome-based pricing",
    rationale:
      "The pricing material is opinionated and distinctive, but it covers roughly one module of depth — better as a lead magnet or as Module 3 of the Sprint.",
    missingMaterial: [
      "Objection handling for price increases with existing clients",
      "More than one pricing case study",
    ],
    strengthScore: 0.68,
    isRecommended: false,
  },
  {
    id: "opp-3",
    projectId: demoProject.id,
    title: "Validate Before You Build",
    audience: "First-time digital product creators",
    transformation: "Pre-sell a program before creating any content",
    rationale:
      "The Founding Five webinar is strong but stands alone; the rest of the library assumes an existing service business, so the material only supports a short workshop, not a full course.",
    missingMaterial: [
      "Audience-building content for creators without a warm list",
    ],
    strengthScore: 0.55,
    isRecommended: false,
  },
];

export const demoGapQuestions: GapQuestion[] = [
  {
    id: "gap-1",
    projectId: demoProject.id,
    question:
      "You reference the Red Flag Filter in the Pricing Masterclass and mention 'two more criteria on the slide,' but the recordings only state three: measurable promise, honest timeline, reachable person. What are the remaining criteria?",
    reason:
      "The Red Flag Filter is scheduled as a core lesson; without the full criteria the lesson would have to invent them.",
    answer:
      "The other two are: the problem is urgent (they want it solved this quarter, not someday) and I have proof I can deliver it (at least one receipt).",
    status: "ANSWERED",
  },
  {
    id: "gap-2",
    projectId: demoProject.id,
    question:
      "Two trainings give different pricing advice: 'start slightly uncomfortable and raise every three clients' (Offer Teardowns, older segment) versus 'anchor to problem cost first' (same call, later). You describe this as having 'evolved.' Should the course teach only the problem-cost anchor?",
    reason:
      "Sources contradict; the course must present a single current position.",
    answer: null,
    status: "OPEN",
  },
  {
    id: "gap-3",
    projectId: demoProject.id,
    question:
      "The Founding Five process assumes a warm audience. What do you tell clients who have no past clients or list at all?",
    reason:
      "Lesson 4.2 promises validation for 'anyone with expertise'; the sources only cover warm outreach.",
    answer: null,
    status: "SKIPPED",
  },
];

export const demoBlueprint: CourseBlueprint = {
  id: "bp-1",
  projectId: demoProject.id,
  version: 1,
  title: "The Signature Offer Sprint",
  subtitle: "Package your expertise into one offer people actually buy",
  promise:
    "In 30 days, turn your custom-work chaos into one signature offer — designed, priced and validated by five real buyers.",
  transformation:
    "From bespoke projects and capped hours to one repeatable, provable signature offer",
  audience: "Service providers and coaches doing custom 1:1 work",
  positioning: {
    idealStudent:
      "An experienced service provider with real client results who reinvents the wheel for every project",
    notFor:
      "Complete beginners with no client history, or founders looking for passive-income shortcuts",
    prerequisites: "At least a handful of past clients and one service you're known for",
    formatAndScope: "4 modules, 11 lessons, ~30 days at 2–3 hours per week",
    outcomeStatement:
      "By the end of this course you will have one signature offer built on the Offer Spine, priced against the 10x Gap, screened through the Red Flag Filter, and validated by your Founding Five.",
    strategicRationale:
      "The curriculum follows the student's build order (person → offer → price → validation), not the order the trainings were recorded. Pricing moved after offer design because the sources consistently diagnose targeting, not price, as the reason offers fail.",
  },
  status: "DRAFT",
  approvedAt: null,
};

export const demoModules: Module[] = [
  {
    id: "mod-1",
    courseBlueprintId: "bp-1",
    position: 1,
    title: "Find the One Person",
    purpose: "Lock the target before touching the offer",
    outcome: "A named target buyer with one expensive, urgent problem",
    rationale:
      "Every source diagnoses crowd-targeting as failure cause #1 — this must come first.",
  },
  {
    id: "mod-2",
    courseBlueprintId: "bp-1",
    position: 2,
    title: "Build the Offer Spine",
    purpose: "Assemble Person, Problem, Process, Proof into one offer",
    outcome: "A complete one-page signature offer",
    rationale: "The Spine is the library's central framework.",
  },
  {
    id: "mod-3",
    courseBlueprintId: "bp-1",
    position: 3,
    title: "Price the Outcome",
    purpose: "Set a price anchored to the problem, not the calendar",
    outcome: "A priced offer that passes the Red Flag Filter",
    rationale:
      "Pricing lands after design so price anchors to a sharp outcome.",
  },
  {
    id: "mod-4",
    courseBlueprintId: "bp-1",
    position: 4,
    title: "Sell the Founding Five",
    purpose: "Validate with real buyers before building anything",
    outcome: "Five founding buyers and receipts for the public launch",
    rationale:
      "The Founding Five converts the offer from a document into a business.",
  },
];

const lessonBase = {
  status: "DRAFT" as const,
  version: 1,
  updatedAt: now,
};

export const demoLessons: Lesson[] = [
  {
    id: "les-1-1",
    moduleId: "mod-1",
    position: 1,
    title: "The One Person Principle",
    objective: "Choose the single person your offer is built for",
    contentMarkdown: `## Why your offer isn't selling

Here's the pattern: when an offer isn't selling, almost nobody has a pricing problem. They have a *targeting* problem. The offer was built for a crowd instead of a person.

The One Person Principle says your signature offer is built for **one specific person with one expensive problem**. Not an avatar deck. Not "women 25–45 who value wellness." One person whose problem costs them real money or real peace every single week.

## The test

Ask of your current offer:

1. Could I name an actual human this was built for?
2. Can I state their problem in *their* words, not mine?
3. Does the problem cost them something measurable — money, hours, sleep?

If any answer is no, the offer is built for a crowd. That's the thing to fix — before price, before the sales page, before the logo.

## Action step

Write one sentence: "*[Name/description of one real person]* struggles with *[expensive problem in their words]*, which costs them *[the real cost]*." Keep it visible; every later lesson checks against it.

## Key takeaways

- Offers fail on targeting far more often than on price.
- One person, one expensive problem — everything else is decoration.
- The problem must have a real, nameable cost.

*Next: the four-part skeleton every sellable offer shares — the Offer Spine.*`,
    sourceStrengthScore: 0.95,
    transformationValueScore: 0.9,
    creatorUniquenessScore: 0.85,
    ...lessonBase,
    warnings: [],
  },
  {
    id: "les-2-1",
    moduleId: "mod-2",
    position: 1,
    title: "The Offer Spine: Person, Problem, Process, Proof",
    objective: "Structure your offer around the four vertebrae",
    contentMarkdown: `## The skeleton under every offer that sells

Every offer that flops is missing a vertebra. The **Offer Spine** has four:

1. **Person** — who exactly this is for (you did this in Module 1).
2. **Problem** — the expensive problem, in their words.
3. **Process** — your repeatable path. You have one, even if you've never written it down; this lesson excavates it.
4. **Proof** — evidence your path works.

When Dana, a brand photographer, rebuilt her offer page around the Spine — same price, same service — she doubled her booking rate in six weeks. The work didn't change. The skeleton did.

## Excavating your Process

List your last three client projects. For each, write what you actually did, in order. The steps that appear all three times *are* your process — name them, and you've got your Process vertebra.

## Exercise

Draft your Spine: one line per vertebra. Weak Proof? Note it — Module 4 exists to manufacture proof with your first five buyers.

## Key takeaways

- Person, Problem, Process, Proof — miss one and the offer wobbles.
- Your process already exists; it's excavated, not invented.
- Proof can be built after validation — don't let it block you.

*Next: the packaging mistake that makes strong offers unsellable.*`,
    sourceStrengthScore: 0.98,
    transformationValueScore: 0.95,
    creatorUniquenessScore: 0.92,
    ...lessonBase,
    warnings: [],
  },
  {
    id: "les-2-2",
    moduleId: "mod-2",
    position: 2,
    title: "Stop Frankenstein Packaging",
    objective: "Cut the offer down to one sharp outcome",
    contentMarkdown: `## The buffet problem

Frankenstein packaging: stapling everything you know how to do into one giant deliverable list because you're scared of leaving value on the table. If your offer page reads like a CVS receipt, this is your lesson.

The market pays for a **sharp outcome**, not a long menu…

## Action step

Cross out every deliverable on your current offer that doesn't directly serve the one outcome. Park them — some become bonuses, most become future products.

*Next module: putting a price on the outcome.*`,
    sourceStrengthScore: 0.9,
    transformationValueScore: 0.85,
    creatorUniquenessScore: 0.88,
    ...lessonBase,
    warnings: [],
  },
  {
    id: "les-3-1",
    moduleId: "mod-3",
    position: 1,
    title: "Price the Outcome, Not the Hours",
    objective: "Anchor your price to the cost of the problem",
    contentMarkdown: `## The broken math of hourly pricing

Hourly pricing punishes you for getting better. The faster you get, the less you earn per project. So we price against the **cost of the problem**: if the problem costs the client $20,000 a year and you fix it, a $3,000 offer isn't expensive — it's a bargain with a bow on it.

## The 10x Gap

The transformation should be worth roughly **ten times the price** to the right buyer — that gap is what makes the buying decision feel safe…

> **Note on the sources:** the recordings contain an older rule ("start slightly uncomfortable, raise every three clients") that the creator has since revised. This lesson teaches only the current position, pending creator confirmation.

## Key takeaways

- Hourly pricing caps income at the speed of your calendar.
- Anchor to problem cost; use the 10x Gap as the safety check.`,
    sourceStrengthScore: 0.88,
    transformationValueScore: 0.9,
    creatorUniquenessScore: 0.75,
    ...lessonBase,
    warnings: [
      "Sources contradict on starting-price advice; awaiting creator answer to gap question #2.",
    ],
  },
  {
    id: "les-3-2",
    moduleId: "mod-3",
    position: 2,
    title: "The Red Flag Filter",
    objective: "Screen the offer before launch",
    contentMarkdown: `## Five checks before you launch

Run your priced offer through the **Red Flag Filter**:

1. Is the promise measurable?
2. Is the timeline honest?
3. Is the person reachable by your marketing?
4. Is the problem urgent — do they want it solved this quarter? *(creator-supplied)*
5. Do you have at least one receipt proving you can deliver? *(creator-supplied)*

Any red flag → fix the offer, not the ad spend…`,
    sourceStrengthScore: 0.82,
    transformationValueScore: 0.85,
    creatorUniquenessScore: 0.9,
    ...lessonBase,
    warnings: [
      "Criteria 4 and 5 come from the creator's gap answer, not the recordings — labelled creator-supplied.",
    ],
  },
  {
    id: "les-4-1",
    moduleId: "mod-4",
    position: 1,
    title: "The Founding Five",
    objective: "Validate by selling five founding spots",
    contentMarkdown: `## Payment is people being honest

You don't need the curriculum finished or the portal branded. You need **five humans who said yes with their wallet**. Five buyers at a founding price validates an offer better than five hundred survey responses — surveys are people being polite; payment is people being honest…

## The three-sentence pitch

Here's who it's for. Here's the outcome. Here's the founding deal. Send it to past clients, warm audience, referral partners…`,
    sourceStrengthScore: 0.94,
    transformationValueScore: 0.95,
    creatorUniquenessScore: 0.9,
    ...lessonBase,
    warnings: [
      "Cold-audience path unsupported by sources (gap question #3 skipped) — lesson scoped to warm outreach only.",
    ],
  },
];

export const demoLessonSources: LessonSource[] = [
  {
    id: "ls-1",
    lessonId: "les-1-1",
    sourceAssetId: "asset-1",
    transcriptChunkId: "chunk-1-1",
    startSeconds: 40,
    endSeconds: 300,
    supportNote: "One Person Principle definition and diagnosis",
    supportType: "source",
  },
  {
    id: "ls-2",
    lessonId: "les-2-1",
    sourceAssetId: "asset-1",
    transcriptChunkId: "chunk-1-2",
    startSeconds: 600,
    endSeconds: 1150,
    supportNote: "Offer Spine framework and Dana case study",
    supportType: "source",
  },
  {
    id: "ls-3",
    lessonId: "les-2-2",
    sourceAssetId: "asset-1",
    transcriptChunkId: "chunk-1-3",
    startSeconds: 1210,
    endSeconds: 1500,
    supportNote: "Frankenstein packaging warning",
    supportType: "source",
  },
  {
    id: "ls-4",
    lessonId: "les-3-1",
    sourceAssetId: "asset-2",
    transcriptChunkId: "chunk-2-1",
    startSeconds: 30,
    endSeconds: 350,
    supportNote: "Outcome pricing position",
    supportType: "source",
  },
  {
    id: "ls-5",
    lessonId: "les-3-1",
    sourceAssetId: "asset-2",
    transcriptChunkId: "chunk-2-2",
    startSeconds: 600,
    endSeconds: 800,
    supportNote: "10x Gap rule",
    supportType: "source",
  },
  {
    id: "ls-6",
    lessonId: "les-3-2",
    sourceAssetId: "asset-2",
    transcriptChunkId: "chunk-2-2",
    startSeconds: 900,
    endSeconds: 1150,
    supportNote: "Red Flag Filter criteria 1–3",
    supportType: "source",
  },
  {
    id: "ls-7",
    lessonId: "les-3-2",
    sourceAssetId: "asset-5",
    transcriptChunkId: null,
    startSeconds: null,
    endSeconds: null,
    supportNote: "Criteria 4–5 from creator gap answer",
    supportType: "creator_answer",
  },
  {
    id: "ls-8",
    lessonId: "les-4-1",
    sourceAssetId: "asset-4",
    transcriptChunkId: "chunk-4-1",
    startSeconds: 60,
    endSeconds: 550,
    supportNote: "Founding Five method",
    supportType: "source",
  },
  {
    id: "ls-9",
    lessonId: "les-4-1",
    sourceAssetId: "asset-4",
    transcriptChunkId: "chunk-4-2",
    startSeconds: 630,
    endSeconds: 1100,
    supportNote: "Outreach process and three-sentence pitch",
    supportType: "source",
  },
];

export const demoVault: VaultEntry[] = [
  {
    id: "vault-1",
    projectId: demoProject.id,
    sourceAssetId: "asset-1",
    cleanTitle: "Offer Design Workshop",
    description:
      "The foundational workshop: the One Person Principle, the full Offer Spine walkthrough, and the Frankenstein packaging teardown.",
    keyTopics: ["Offer Spine", "targeting", "packaging"],
    watchThisIf:
      "You're starting your offer from scratch or rebuilding one that isn't selling.",
    chapters: [
      { title: "The One Person Principle", startSeconds: 40 },
      { title: "The Offer Spine", startSeconds: 600 },
      { title: "Frankenstein packaging", startSeconds: 1210 },
    ],
    relatedLessonIds: ["les-1-1", "les-2-1", "les-2-2"],
    suggestedOrder: 1,
  },
  {
    id: "vault-2",
    projectId: demoProject.id,
    sourceAssetId: "asset-2",
    cleanTitle: "Pricing Masterclass",
    description:
      "Outcome pricing philosophy, the 10x Gap, and the Red Flag Filter.",
    keyTopics: ["pricing", "10x Gap", "Red Flag Filter"],
    watchThisIf: "You're stuck on what to charge.",
    chapters: [
      { title: "Price the outcome", startSeconds: 30 },
      { title: "The 10x Gap", startSeconds: 600 },
      { title: "Red Flag Filter", startSeconds: 900 },
    ],
    relatedLessonIds: ["les-3-1", "les-3-2"],
    suggestedOrder: 3,
  },
  {
    id: "vault-3",
    projectId: demoProject.id,
    sourceAssetId: "asset-3",
    cleanTitle: "Live Offer Teardowns",
    description:
      "Real member offers rewritten live through the Spine, plus payment-plan and pricing-evolution Q&A.",
    keyTopics: ["teardowns", "payment plans"],
    watchThisIf: "You want to see the Spine applied to messy real offers.",
    chapters: [
      { title: "Maya's teardown", startSeconds: 20 },
      { title: "Payment plans Q&A", startSeconds: 640 },
    ],
    relatedLessonIds: ["les-2-1", "les-3-1"],
    suggestedOrder: 2,
  },
  {
    id: "vault-4",
    projectId: demoProject.id,
    sourceAssetId: "asset-4",
    cleanTitle: "Sell Before You Build",
    description: "The Founding Five method end to end.",
    keyTopics: ["validation", "pre-selling", "Founding Five"],
    watchThisIf: "You're tempted to build the course portal before selling.",
    chapters: [
      { title: "Why pre-sell", startSeconds: 0 },
      { title: "The outreach flywheel", startSeconds: 625 },
    ],
    relatedLessonIds: ["les-4-1"],
    suggestedOrder: 4,
  },
  {
    id: "vault-5",
    projectId: demoProject.id,
    sourceAssetId: "asset-5",
    cleanTitle: "Strategy Audio: Niching",
    description:
      "Short client-question audios, including 'niche the problem, not the industry.'",
    keyTopics: ["niching", "positioning"],
    watchThisIf: "You're agonizing over picking an industry niche.",
    chapters: [{ title: "Niche the problem", startSeconds: 45 }],
    relatedLessonIds: ["les-1-1"],
    suggestedOrder: 5,
  },
];

export const demoWorkbook = {
  roadmap:
    "Four modules, one build: find your one person (Module 1), assemble the Offer Spine (Module 2), price the outcome (Module 3), and sell your Founding Five (Module 4). Work through in order — each module's output is the next module's input.",
  quick_start_checklist: [
    "Write your one-sentence target: who, expensive problem, real cost",
    "List your last three client projects for the Process excavation",
    "Block two hours this week for Module 1",
  ],
  module_checklists: [
    {
      module_title: "Find the One Person",
      items: [
        "Named one real person your offer is built for",
        "Wrote their problem in their words",
        "Attached a measurable cost to the problem",
      ],
    },
    {
      module_title: "Build the Offer Spine",
      items: [
        "Drafted all four vertebrae",
        "Cut every deliverable that doesn't serve the outcome",
      ],
    },
    {
      module_title: "Price the Outcome",
      items: [
        "Estimated the problem's annual cost",
        "Set a price inside the 10x Gap",
        "Passed all five Red Flag Filter checks",
      ],
    },
    {
      module_title: "Sell the Founding Five",
      items: [
        "Listed 20 warm contacts",
        "Sent the three-sentence pitch to 10",
        "Booked five founding buyers",
      ],
    },
  ],
  lesson_exercises: [
    {
      lesson_title: "The One Person Principle",
      exercise:
        "Write: '[one real person] struggles with [expensive problem in their words], which costs them [the real cost].'",
    },
    {
      lesson_title: "The Offer Spine: Person, Problem, Process, Proof",
      exercise: "Draft your Spine — one line per vertebra.",
    },
  ],
  reflection_prompts: [
    "Which vertebra of your Spine is weakest right now — and what would strengthen it fastest?",
    "What did you cross off your deliverable list, and why were you holding onto it?",
  ],
  implementation_plan:
    "Week 1: Modules 1–2 (target + Spine). Week 2: Module 3 (price + filter). Weeks 3–4: Module 4 outreach until five founding buyers say yes.",
  completion_checklist: [
    "One-page signature offer written",
    "Price anchored to problem cost",
    "Five founding buyers enrolled",
    "Receipts collected for the public launch",
  ],
};

export const demoJobs: ProcessingJob[] = [
  {
    id: "job-1",
    projectId: demoProject.id,
    sourceAssetId: "asset-1",
    jobType: "transcribe_asset",
    status: "SUCCEEDED",
    progressPercent: 100,
    attemptCount: 1,
    errorCode: null,
    errorMessage: null,
    startedAt: "2026-07-14T10:20:00.000Z",
    completedAt: "2026-07-14T10:41:00.000Z",
  },
  {
    id: "job-2",
    projectId: demoProject.id,
    sourceAssetId: "asset-3",
    jobType: "transcribe_asset",
    status: "SUCCEEDED",
    progressPercent: 100,
    attemptCount: 2,
    errorCode: null,
    errorMessage: null,
    startedAt: "2026-07-14T10:22:00.000Z",
    completedAt: "2026-07-14T10:58:00.000Z",
  },
  {
    id: "job-3",
    projectId: demoProject.id,
    sourceAssetId: null,
    jobType: "build_ip_map",
    status: "SUCCEEDED",
    progressPercent: 100,
    attemptCount: 1,
    errorCode: null,
    errorMessage: null,
    startedAt: "2026-07-14T11:20:00.000Z",
    completedAt: "2026-07-14T11:26:00.000Z",
  },
];

export const demoUsage: UsageEvent[] = [
  {
    id: "use-1",
    projectId: demoProject.id,
    operation: "transcription",
    model: "gpt-4o-transcribe",
    audioSeconds: 19740,
    inputTokens: null,
    outputTokens: null,
    estimatedCostMinorUnits: 197,
    createdAt: "2026-07-14T11:00:00.000Z",
  },
  {
    id: "use-2",
    projectId: demoProject.id,
    operation: "ip_extraction",
    model: "gpt-4.1",
    audioSeconds: null,
    inputTokens: 184_000,
    outputTokens: 42_000,
    estimatedCostMinorUnits: 132,
    createdAt: "2026-07-14T11:15:00.000Z",
  },
  {
    id: "use-3",
    projectId: demoProject.id,
    operation: "blueprint_generation",
    model: "gpt-4.1",
    audioSeconds: null,
    inputTokens: 96_000,
    outputTokens: 18_000,
    estimatedCostMinorUnits: 61,
    createdAt: "2026-07-14T11:40:00.000Z",
  },
];
