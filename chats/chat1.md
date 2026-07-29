# Teacher wellness tracker

_Started 2026-07-29 02:13 UTC_

---

## User

Design a mobile app for teachers to track their mental health wellness

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- context: Decide for me
- who: K-12 public school classroom teachers
- deployment: Personal, fully private — nobody at school sees anything
- core: Fast daily check-in (mood/energy/stress), Spotting burnout trends over weeks, In-the-moment coping tools (breathing, reset between classes), Nudges tied to the school day schedule, Connecting to peers or counseling resources
- checkin_time: Under 10 seconds — one tap
- school_day: Explore a few options
- framing: Explore a few options
- risk: Decide for me
- screens: Onboarding, Home / today, Check-in flow, Trends & insights, Coping tool in action, Resources, Notification/lockscreen moment
- variations: Multiple takes on the check-in interaction, Multiple takes on how trends are visualized, Different core metaphors for wellbeing, Different visual treatments
- platform: iOS
- anything: Ideally, it would be great to see a heatmap for wellbeing in an area. For instance, the moods are all users are anonymously mapped.

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- aesthetic: Explore a few options

## Assistant

_[tool: copy_starter_component]_

_[tool: grep]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Four options on one canvas, iOS frames, pan/zoom to explore:

- **1a** — the whole core loop in a quiet-clinical treatment: private onboarding, last-bell notification with one-tap faces, a home built on the bell schedule, the 8-second check-in, and 6-week trends (line + period heatmap that fingers lunch duty).
- **1b** — three live check-in interactions: a two-axis tap pad, a weather metaphor, and a draggable strain dial. All three respond to clicks.
- **1c** — your anonymous heatmap, warm-paper treatment: county mood by 5km cell with a 40-teacher minimum, plus a "you're not the only one" aggregate view.
- **1d** — soft-dusk: a live 4-in/6-out breathing reset sized to a passing period, and resources where 988 escalation sits calmly at the top.

The map in 1c is schematic (grid cells), not real geography — say the word and I'll build it on actual geo data.

## User

Found issues — fixing…

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: copy_files]_

_[tool: dc_write]_

Rebuilding from scratch with the reminder system, Tended Collective brand, and monetization.

_[tool: dc_write]_

_[tool: web_fetch]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Rebuilt on your Classical system (Cormorant/Lora, gold stroke, hairlines, Lucide) and expanded into the full system — five stacked options:

- **2a** Setup + daily loop: privacy onboarding, contract hours / commute / sick-day balance / duty rotation, today's rhythm, check-in, trends (which now finger cafeteria duty as the worst block).
- **2b** The reminder system: leave-for-work countdown ring on the lock screen, "sit down and eat" with a silent 22-min lunch timer, duty heads-up, and a "contract day ended 15 min ago — 4h20 unpaid this week" nudge, plus the reminder library. Nothing fires during instruction time.
- **2c** ZIP-code signal: heatmap with a 40-teacher floor, your-ZIP card, named causes, and a one-page brief a teacher can send to their union rep.
- **2d** Passing-period reset, 988/EAP escalation, and The Safety / Let It Out / HELD living inside the app.
- **2e** Monetization: membership screen (free core, Tended+ $5.99, journal) plus a business-model board — individual subscription, commerce, institutional consultancy — with an explicit "never for sale" list and four open questions for you.

What's next, my recommendation in order: answer those four questions on the 2e board, then let me design the union brief PDF (it's the artifact that makes the policy story real), the schedule-import-from-photo flow, and a real geographic ZIP map.

## User

Found issues — fixing…

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: run_script]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Simplified into a single working prototype — **Tended App v2.dc.html**. Tap the tabs.

- **Today** — one-tap check (Good → Rough), optional tags, saves locally. Plain language throughout; no bells, no staffrooms.
- **Record** — seven days free, then the Tended+ card ($4.99/mo) with the six-week view visibly locked behind it. That's the only paywall.
- **Your area** — ZIP heatmap, what people named nearby, and a real toggle for contributing your own check-ins (40-teacher floor).
- **Support** — 988, EAP's six free sessions, therapist finder, union assistance, mental-health-day guidance.

The panel beside the phone spells out the data model: one row per day (1–5, up to three tags, date, ZIP) — everything else is a view of that table, which should keep the build small. The old fuller version is still in `Teacher Wellness App.dc.html` if you want reminders or schedule setup back later.

## User

I'd like to use the design style of 1b.

## Assistant

_[tool: dc_write]_

_[tool: ready_for_verification]_

**Tended App v3.dc.html** — the simplified four-tab app rebuilt in 1b's treatment: warm off-white ground, white cards, light Newsreader headlines, mono labels, one teal accent for interactive elements, and the five-step mood ramp carrying meaning across the bars, tiles and map.

Same functionality as v2 — daily check, seven-day record with the Tended+ lock, ZIP map with contribution toggle, support tab. v2 is untouched if you want to compare.

## User

Found issues — fixing…

## Assistant

_[tool: show_html]_

_[tool: show_html]_

_[tool: dc_write]_

_[tool: show_html]_

_[tool: write_file]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: delete_file]_

_[tool: ready_for_verification]_

I chased the hang down and it isn't in the design: I wrote two throwaway probes — a one-line Design Component and a 161-character plain HTML page — and **both** timed out identically with zero console output. The screenshot/inspection harness in this preview session is stuck, not v3.

Reassuring signal: this last load reported no console errors. So v3 should be fine on your end — please confirm the tabs, the mood selection and the ZIP toggle respond for you. If your tab is also blank or frozen, reload it once; if it persists, it's the session, and I'd rather not "fix" working code around a broken inspector.

## User

Question is: How are you doing, right now? Remove the "One tap. Nobody, but you ever sees it." and the 'Stored on this phone. Change any time before midnight."
On the support tab, there should be some type of tracker for self-care (based on the preferences that the user set up); there should also be a space with other resources (such as 988, EAP, Grow Theraopy, etc) but it shouldn't be the main focal point; and a space for blog posts etc.  Considering about adding a live anonymous feed that is location based.

## Assistant

_[tool: run_script]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Done in v3:

- **Today** — now "How are you doing, right now?", both explanatory lines removed.
- **Support** — rebuilt around a self-care tracker: your chosen practices (eat lunch sitting down, out of the building by 4, twenty minutes outside) as tappable seven-day rows, with a line reading the pattern back and an "edit my practices" path. Below it, three reading/listening cards with striped image placeholders. Crisis and clinical help (988, EAP, Grow Therapy, union) is now a quiet compact list near the bottom, not the focal point.
- **Your area** — added the live anonymous nearby feed, marked EXPLORING: rolling check-ins within 15 miles reduced to a number and a tag, with a note on why there's no free text or replies (it's the thing that keeps it from becoming a venting board).

Open question for you: should the feed be opt-in separately from contributing to the map, or ride the same toggle?

