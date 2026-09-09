# RFC — ASD-STE100 as the CAROL Documentation Language

**Status:** Draft — for MACHINIST execution after ARCHITECT ratification
**Author:** COUNSELOR (cast session, 2026-09-10)
**Target:** CAROL protocol (~/.carol/) — documentation-language enforcement

---

## 1. Problem

Two wordings of one rule drift. Today a normative document (cast SPEC.md) and its
derived documents (HELP.md, the planned casting guide) each phrase the same law in
their own prose. Every derived rephrasing is shadow state of the law — MANIFESTO S
violated at the documentation layer. The fix is one controlled language for all
technical prose, so derived documents quote the source verbatim instead of rewording
it.

## 2. Proposal

Adopt ASD-STE100 (Simplified Technical English) as the mandatory writing standard for
CAROL-governed technical documents, enforced by protocol.

### 2.1 What ASD-STE100 is

An internationally maintained controlled-language specification (ASD — AeroSpace and
Defence Industries Association of Europe), built for maintenance documentation read by
non-native speakers. Its two halves:

- **Writing rules** — active voice; simple tenses; imperative mood for procedures;
  sentence length limits (approx. 20 words procedural, 25 descriptive); one
  instruction per sentence; short paragraphs; vertical lists for parallel conditions;
  noun-cluster limits; no vague modality.
- **Controlled dictionary** — approx. 900 approved general words, each with exactly
  one approved meaning and one part of speech. Everything else is disallowed —
  **except Technical Names and Technical Verbs**, which the standard explicitly
  exempts: domain vocabulary (`manifest`, `token`, `fence`, `arity`, `wiring`,
  `toolchain`, `APVTS`) is kept as-is.

Facts MACHINIST must verify on acquisition (stated here from general knowledge, not
from a read of the standard this session): current issue number, and the distribution
terms (the specification has been distributed free of charge on request/registration
from the official STE site; confirm and record the issue adopted).

### 2.2 Why it fits CAROL

- One meaning per word and explicit short sentences are the same properties CAROL
  demands of agent prompts: deterministic parsing, no inference from tone.
- Derived documents (HELP.md, guides) can quote the STE source verbatim — SSOT for
  wording, zero drift channels.
- The existing house style is already near-STE: declarative present tense, defined
  terms, tabular rule sets.

## 3. Scope — two tiers

### Tier 1 — mandatory STE (technical documents)

- Project SPEC.md files (cast SPEC.md first)
- Derived documents: HELP.md, --help text, user guides
- The planned casting guide and its template-set documentation (dev/ location, name
  pending ARCHITECT ratification)
- ARCHITECTURE.md, README-class documents
- New technical documents from adoption date

### Tier 2 — ARCHITECT decision, not decided by this RFC

- ~/.carol/ contract documents: CAROL.md, MANIFESTO.md, NAMES.md, CODING.md,
  ARCHITECT.md, ODE.md. These carry deliberate rhetorical force; STE flattens voice
  by construction. Options: (a) full STE, (b) STE writing rules only (sentence
  discipline without dictionary restriction), (c) exempt.

### Exempt

- Operational logs: carol/SPRINT-LOG.md, DEBT.md, RFC drafts, chat. Logs record;
  they do not instruct.
- Code comments and doxygen (governed by CODING.md, written last per Code Hygiene).
- Data files (cast tables ARE the specification of intent; their cells are data, not
  prose).

## 4. Enforcement mechanism (MACHINIST work items)

1. **Acquire the standard.** Obtain the current ASD-STE100 issue from the official
   source; store the PDF (or its rule digest if redistribution terms forbid storing)
   under `~/.carol/ste/`. Record issue number and date in the digest header.
2. **Write the rule digest** — `~/.carol/ste/STE-RULES.md`: the writing rules, the
   Technical Name/Verb exemption, and a violations table for the frequent offenders
   in existing house prose (vague modals, passive constructions, multi-clause
   sentences, unapproved general words with approved substitutes). The digest is
   derived; the standard is normative.
3. **Amend CAROL.md** — one clause in the Documentation section: Tier 1 documents are
   written in ASD-STE100 per `~/.carol/ste/STE-RULES.md`; derived documents quote
   their normative source verbatim; where digest and standard disagree, the standard
   governs.
4. **Wire the output style / skill** — an STE writing skill agents load when
   authoring Tier 1 documents, so enforcement is at authoring time, not review time.
5. **Lint (optional, later).** No official free STE checker exists. A wordlist-based
   lint (sentence length, banned-word scan) is possible as a script under
   `~/.carol/bin/`; full dictionary conformance stays a review discipline. Do not
   block adoption on tooling.

## 5. Migration order (per-project sprints, not MACHINIST's)

1. **cast HELP.md** — derived, no authority, lowest risk. Proves the style.
2. **cast SPEC.md** — clause-by-clause rewrite. Drift audit: engine is at fixpoint
   and unchanged; every clause is re-checked against observed engine behavior; the
   §10.1 fatal table and all syntax blocks survive verbatim (tables and code blocks
   are outside STE sentence rules).
3. **The casting guide** — born STE, quotes SPEC verbatim.
4. Remaining Tier 1 documents per project, as touched.

## 6. Risks

- **Semantic drift during SPEC rewrite** — the one real hazard. Mitigated by
  clause-by-clause audit against the unchanged engine, and by the fatal set
  surviving verbatim.
- **Approximate dictionary conformance** until the official dictionary is on the
  machine — the digest states this openly; conformance tightens after acquisition.
- **Voice loss in Tier 2** — surfaced as an open decision, not incurred silently.

## 7. Open decisions (ARCHITECT)

1. Tier 2 disposition: (a) full STE, (b) writing rules only, (c) exempt.
2. Adoption stamp: which STE issue, recorded where MACHINIST stores it.
3. Whether SPRINT-LOG sprint blocks stay exempt (recommended: exempt).

---

**JRENG!**
