/**
 * Three synthetic demonstration workspaces.
 *
 * Everything here is invented: the "studies", numbers, and identifiers are
 * fictional and exist only to show how the tool behaves. No real patients,
 * papers, DOIs, or unpublished results are used.
 */
import type { ID, Workspace } from '../core/types'
import {
  addBinding,
  addClaim,
  addDependency,
  addReview,
  addSource,
  createWorkspace,
  locateExcerpt,
  reviseSource,
  type Clock,
  systemClock,
} from '../core/workspace'

export type DemoId = 'correction-impact' | 'scope-check' | 'missing-then-supplemented'

export interface DemoDescriptor {
  id: DemoId
  title: { en: string; 'zh-CN': string }
  summary: { en: string; 'zh-CN': string }
}

export const DEMOS: DemoDescriptor[] = [
  {
    id: 'correction-impact',
    title: { en: 'Correction impact', 'zh-CN': '更正影响' },
    summary: {
      en: 'Source A is corrected. Which of five claims need another look, and which are untouched?',
      'zh-CN': '来源 A 被更正。五条主张里哪些需要复核，哪些不受影响？',
    },
  },
  {
    id: 'scope-check',
    title: { en: 'Scope check', 'zh-CN': '范围核查' },
    summary: {
      en: 'A source reports an association in one population. The draft sentence generalises and turns it causal.',
      'zh-CN': '来源只报告了特定人群里的关联，写作句子却扩大了范围并改成因果措辞。',
    },
  },
  {
    id: 'missing-then-supplemented',
    title: { en: 'Missing, then supplemented', 'zh-CN': '缺失与补充' },
    summary: {
      en: 'A claim cannot be judged at first. Material is added later and the claim is re-reviewed; the old verdict stays in history.',
      'zh-CN': '主张起初无法判断；之后补入材料并重新审阅，旧结论仍可追溯。',
    },
  },
]

export interface BuiltDemo {
  ws: Workspace
  /** For the correction demo: the text to paste as the corrected source. */
  suggestedCorrection?: { sourceId: ID; text: string; note: string }
}

function bind(ws: Workspace, claimId: ID, sourceId: ID, excerpt: string, clock: Clock): Workspace {
  const source = ws.sources[sourceId]
  const text = ws.sourceVersions[source.headVersionId].text
  const span = locateExcerpt(text, excerpt)
  if (!span) throw new Error(`Demo excerpt not found exactly once: ${excerpt}`)
  return addBinding(ws, { claimId, sourceId, start: span.start, end: span.end }, clock).ws
}

// ---------------------------------------------------------------------------
// Demo 1: correction impact  (A -> C1 -> C4; B -> C2; C -> C3; C2, C3 -> C5)
// ---------------------------------------------------------------------------

const A_V1 = `Synthetic cohort report A (fictional). Setting: one made-up orthopaedic unit. Participants: 412 adults aged 60 to 75 who had elective knee replacement between 2021 and 2023.
Exposure: enrolment in a supervised early-walking programme starting on postoperative day 1.
Primary finding: participants in the early-walking programme had a shorter median hospital stay (4 days versus 5 days; adjusted difference -0.9 days, 95% CI -1.4 to -0.4).
Secondary finding: no difference in 30-day readmission (6.1% versus 6.4%).
The authors note that the programme was offered only to patients without a documented fall in the previous year.`

const A_V2 = `Synthetic cohort report A (fictional), corrected version. Setting: one made-up orthopaedic unit. Participants: 412 adults aged 60 to 75 who had elective knee replacement between 2021 and 2023.
Exposure: enrolment in a supervised early-walking programme starting on postoperative day 1.
Primary finding (corrected): after correcting a coding error in the discharge-date field, median hospital stay was 5 days in both groups (adjusted difference -0.1 days, 95% CI -0.6 to 0.4). The previously reported difference is withdrawn.
Secondary finding: no difference in 30-day readmission (6.1% versus 6.4%).
The authors note that the programme was offered only to patients without a documented fall in the previous year.`

const B_V1 = `Synthetic survey report B (fictional). A questionnaire study of 180 made-up physiotherapists across three imaginary regions.
Finding: 71% of respondents said that early-walking programmes were "feasible to deliver" on a standard ward roster; 22% said feasibility depended on weekend staffing.
Response rate: 48%.`

const C_V1 = `Synthetic cost note C (fictional). A short economic sketch attached to the fictional programme.
Estimate: each inpatient day at the made-up unit was costed at 620 imaginary currency units (ICU) in 2023 prices.
The note explicitly states that it does not measure whether the programme changes length of stay; it only prices a bed-day.`

export function buildCorrectionImpact(clock: Clock): BuiltDemo {
  let ws = createWorkspace(
    {
      title: 'Synthetic demo 1: correction impact',
      synthetic: true,
      description:
        'Five draft claims are bound to three fictional sources. Source A later corrects its main result. The tool shows which claims are affected through recorded bindings and confirmed dependencies.',
    },
    clock,
  )
  const A = addSource(ws, { title: 'Synthetic cohort report A', text: A_V1, note: 'initial version' }, clock)
  ws = A.ws
  const B = addSource(ws, { title: 'Synthetic survey report B', text: B_V1 }, clock)
  ws = B.ws
  const C = addSource(ws, { title: 'Synthetic cost note C', text: C_V1 }, clock)
  ws = C.ws

  const c1 = addClaim(ws, { label: 'C1', text: 'In the fictional cohort A, the early-walking programme was associated with a shorter median hospital stay (4 versus 5 days).' }, clock)
  ws = c1.ws
  const c2 = addClaim(ws, { label: 'C2', text: 'Most surveyed physiotherapists in fictional survey B considered early-walking programmes feasible on a standard ward roster.' }, clock)
  ws = c2.ws
  const c3 = addClaim(ws, { label: 'C3', text: 'The fictional cost note C prices one inpatient bed-day at 620 imaginary currency units.' }, clock)
  ws = c3.ws
  const c4 = addClaim(ws, { label: 'C4', text: 'Because stay was shorter in cohort A, the programme may reduce bed-day use in similar patients.' }, clock)
  ws = c4.ws
  const c5 = addClaim(ws, { label: 'C5', text: 'Feasibility and bed-day pricing information exist, so a delivery-cost estimate for the programme could be attempted.' }, clock)
  ws = c5.ws

  ws = bind(ws, c1.claimId, A.sourceId, 'participants in the early-walking programme had a shorter median hospital stay (4 days versus 5 days; adjusted difference -0.9 days, 95% CI -1.4 to -0.4)', clock)
  ws = bind(ws, c2.claimId, B.sourceId, '71% of respondents said that early-walking programmes were "feasible to deliver" on a standard ward roster', clock)
  ws = bind(ws, c3.claimId, C.sourceId, 'each inpatient day at the made-up unit was costed at 620 imaginary currency units (ICU) in 2023 prices', clock)

  ws = addDependency(ws, { claimId: c4.claimId, dependsOnClaimId: c1.claimId, status: 'confirmed', note: 'C4 reasons from the stay difference stated in C1.' }, clock).ws
  ws = addDependency(ws, { claimId: c5.claimId, dependsOnClaimId: c2.claimId, status: 'confirmed', note: 'Feasibility input.' }, clock).ws
  ws = addDependency(ws, { claimId: c5.claimId, dependsOnClaimId: c3.claimId, status: 'confirmed', note: 'Pricing input.' }, clock).ws

  ws = addReview(ws, { claimId: c1.claimId, label: 'supported-in-scope', rationale: 'The bound passage states the 4 versus 5 day median difference for this cohort. The claim keeps the cohort-specific wording.', reviewer: 'Reviewer (synthetic)' }, clock).ws
  ws = addReview(ws, { claimId: c2.claimId, label: 'supported-in-scope', rationale: '71% is a majority of respondents; the claim says "most surveyed", which matches. Response rate 48% is a limitation but does not change the wording.', reviewer: 'Reviewer (synthetic)' }, clock).ws
  ws = addReview(ws, { claimId: c3.claimId, label: 'supported-in-scope', rationale: 'Direct restatement of the priced bed-day.', reviewer: 'Reviewer (synthetic)' }, clock).ws
  ws = addReview(ws, { claimId: c4.claimId, label: 'partially-supported', rationale: 'Follows from C1 only as a possibility ("may"). No source measures bed-day use directly; the inference rests on C1.', reviewer: 'Reviewer (synthetic)' }, clock).ws
  ws = addReview(ws, { claimId: c5.claimId, label: 'supported-in-scope', rationale: 'Claims only that an estimate could be attempted given C2 and C3; it does not state a result.', reviewer: 'Reviewer (synthetic)' }, clock).ws

  return {
    ws,
    suggestedCorrection: {
      sourceId: A.sourceId,
      text: A_V2,
      note: 'Corrected: discharge-date coding error; stay difference withdrawn.',
    },
  }
}

// ---------------------------------------------------------------------------
// Demo 2: scope check
// ---------------------------------------------------------------------------

const D_V1 = `Synthetic registry analysis D (fictional). Data: a made-up national joint registry, 2018 to 2022.
Population: adults aged 70 and over who had a first hip replacement for osteoarthritis. Patients with a prior fracture were excluded.
Finding: living alone before surgery was associated with a higher probability of discharge to a rehabilitation facility rather than home (adjusted odds ratio 1.6, 95% CI 1.3 to 2.0).
Follow-up: discharge destination only; no outcomes after discharge were collected.
The authors state that the design cannot establish whether living alone causes the difference.`

export function buildScopeCheck(clock: Clock): BuiltDemo {
  let ws = createWorkspace(
    {
      title: 'Synthetic demo 2: scope check',
      synthetic: true,
      description:
        'One fictional registry analysis, three draft sentences. The reviewer checks population, time window and causal wording against the bound passage and records the reasons.',
    },
    clock,
  )
  const D = addSource(ws, { title: 'Synthetic registry analysis D', text: D_V1 }, clock)
  ws = D.ws

  const s1 = addClaim(ws, { label: 'S1', text: 'In the fictional registry D, older adults who lived alone before a first hip replacement were more often discharged to a rehabilitation facility than home (adjusted OR 1.6).' }, clock)
  ws = s1.ws
  const s2 = addClaim(ws, { label: 'S2', text: 'Living alone increases the risk of poor recovery after surgery.' }, clock)
  ws = s2.ws
  const s3 = addClaim(ws, { label: 'S3', text: 'Among adults over 70 in registry D, living alone was linked to discharge destination, although the study did not follow patients after discharge.' }, clock)
  ws = s3.ws

  ws = bind(ws, s1.claimId, D.sourceId, 'living alone before surgery was associated with a higher probability of discharge to a rehabilitation facility rather than home (adjusted odds ratio 1.6, 95% CI 1.3 to 2.0)', clock)
  ws = bind(ws, s2.claimId, D.sourceId, 'living alone before surgery was associated with a higher probability of discharge to a rehabilitation facility rather than home', clock)
  ws = bind(ws, s3.claimId, D.sourceId, 'Follow-up: discharge destination only; no outcomes after discharge were collected.', clock)

  ws = addReview(ws, { claimId: s1.claimId, label: 'supported-in-scope', rationale: 'Population (70+, first hip replacement), exposure (living alone before surgery), outcome (discharge destination) and effect size all match the bound passage. Wording stays associational.', reviewer: 'Reviewer (synthetic)' }, clock).ws
  ws = addReview(ws, {
    claimId: s2.claimId,
    label: 'not-supported',
    rationale:
      'Three scope problems. (1) Population: the source covers adults 70+ after a first hip replacement; the sentence says "after surgery" in general. (2) Outcome: the source measures discharge destination only; "poor recovery" is not measured and the source states no post-discharge outcomes were collected. (3) Causal wording: "increases the risk" asserts causation; the source explicitly says the design cannot establish cause. The bound passage supports an association in a narrower claim, not this sentence.',
    reviewer: 'Reviewer (synthetic)',
  }, clock).ws
  ws = addReview(ws, { claimId: s3.claimId, label: 'supported-in-scope', rationale: 'Restates the association within the stated population and explicitly carries the follow-up limitation from the source.', reviewer: 'Reviewer (synthetic)' }, clock).ws

  return { ws }
}

// ---------------------------------------------------------------------------
// Demo 3: missing, then supplemented
// ---------------------------------------------------------------------------

const E_V1 = `Synthetic trial summary E (fictional). A made-up randomised trial of a preoperative education leaflet versus usual care in 240 adults having day-case hernia repair.
Primary outcome: patient-reported readiness for discharge, scored 0 to 10 on the day of surgery.
Result: mean readiness 7.9 in the leaflet group versus 7.1 with usual care (difference 0.8, 95% CI 0.3 to 1.3).`

const F_V1 = `Synthetic supplementary appendix F (fictional), released with trial E.
Table S2 reports unplanned contacts with the clinic within 7 days: 9 of 120 (7.5%) in the leaflet group and 17 of 120 (14.2%) with usual care (risk difference -6.7 percentage points, 95% CI -14.3 to 0.9).
The appendix notes this was a secondary outcome and the trial was not powered for it.`

export function buildMissingThenSupplemented(clock: Clock): BuiltDemo {
  let ws = createWorkspace(
    {
      title: 'Synthetic demo 3: missing, then supplemented',
      synthetic: true,
      description:
        'A draft sentence about unplanned clinic contacts cannot be judged from the trial summary. The appendix is added later, the sentence is bound to it and re-reviewed. The earlier verdict is kept.',
    },
    clock,
  )
  const E = addSource(ws, { title: 'Synthetic trial summary E', text: E_V1 }, clock)
  ws = E.ws

  const m1 = addClaim(ws, { label: 'M1', text: 'In fictional trial E, the education leaflet improved patient-reported readiness for discharge by 0.8 points on a 10-point scale.' }, clock)
  ws = m1.ws
  const m2 = addClaim(ws, { label: 'M2', text: 'In fictional trial E, fewer patients in the leaflet group made unplanned clinic contacts within 7 days, although the difference was not statistically significant.' }, clock)
  ws = m2.ws

  ws = bind(ws, m1.claimId, E.sourceId, 'mean readiness 7.9 in the leaflet group versus 7.1 with usual care (difference 0.8, 95% CI 0.3 to 1.3)', clock)
  ws = addReview(ws, { claimId: m1.claimId, label: 'supported-in-scope', rationale: 'Difference and scale match the bound passage.', reviewer: 'Reviewer (synthetic)' }, clock).ws
  ws = addReview(ws, {
    claimId: m2.claimId,
    label: 'cannot-determine',
    rationale: 'The trial summary does not report unplanned clinic contacts at all. No passage can be bound. This is a missing-material verdict, not a judgement that the sentence is wrong.',
    reviewer: 'Reviewer (synthetic)',
  }, clock).ws

  // Later: the appendix arrives.
  const F = addSource(ws, { title: 'Synthetic supplementary appendix F', text: F_V1 }, clock)
  ws = F.ws
  ws = bind(ws, m2.claimId, F.sourceId, '9 of 120 (7.5%) in the leaflet group and 17 of 120 (14.2%) with usual care (risk difference -6.7 percentage points, 95% CI -14.3 to 0.9)', clock)
  ws = addReview(ws, {
    claimId: m2.claimId,
    label: 'supported-in-scope',
    rationale: 'Appendix F Table S2 gives 7.5% versus 14.2% with a confidence interval that crosses zero, matching both the direction and the "not statistically significant" qualifier. The appendix flags it as a secondary, underpowered outcome; the sentence does not overstate it.',
    reviewer: 'Reviewer (synthetic)',
  }, clock).ws

  return { ws }
}

export function buildDemo(id: DemoId, clock: Clock = systemClock): BuiltDemo {
  switch (id) {
    case 'correction-impact':
      return buildCorrectionImpact(clock)
    case 'scope-check':
      return buildScopeCheck(clock)
    case 'missing-then-supplemented':
      return buildMissingThenSupplemented(clock)
  }
}

// Re-exported for convenience in the UI's "apply suggested correction" flow.
export { reviseSource }
