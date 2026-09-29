## Plan Revision Direction: FlipLoop

### Gatekeeper's finding
REVISIONS NEEDED, four findings, all in 02 plus one styling line in 03:
1. No memory warning. The packet asks for a message when "storage/memory approaches its limit"; the undo budget (02 line 65) evicts steps silently.
2. Canvas tap rule contradicts itself: line 90 says a tap stops Play, line 95 says it toggles.
3. Challenge label, days left and theme index are undefined; the sample does not match the formula, and a clock before the epoch gives a negative index.
4. Lesson detail and Gallery gaps: the exercise line formula (and the zero K frames case), whose frames a starter copies, and what "duplicate" does to a lesson or challenge project.

### Who owns the fix, and why
- **Finding 1: Site Planner (W5 row, trace to 25/25), then Web Designer (one Banners line in 03).** Warning states are structure; the toast styling follows them. Not a documented weakness for either role. The live cause sits with me: my 03b walkthrough counted "storage warning" as covering "storage/memory" and accepted the undo deviation without asking that the user be told. That is the Round 12 shared-claim miss, and I own it.
- **Finding 2: Site Planner.** A slip on a real strength. The Editor state table was the kickoff's named check, and it held; only the prose line below it drifted.
- **Finding 3: Site Planner.** Off day on a strength. Deterministic, serverless state is Track B structure, and the rule is mostly there. The sample was written by hand, not derived from the formula.
- **Finding 4: Site Planner.** Close to the documented Track B weakness, not a match. The pattern is leaving a structural call for someone else to make; here the data model rules for starters and duplicates were left for the Developer to guess.

### Direction (diagnosis, not prescription)
One cause runs through 2, 3 and 4: rules were stated once in a table or formula, then restated in prose or sample text that was never checked against them. The revision should re-derive every sample value and restated rule in the touched sections from its own source line. Finding 1 is different: a packet requirement was folded into a near neighbor. Its fix should name the memory case separately. Gatekeeper's suggested wording is a sound default; the exact trigger and copy stay Site Planner's call. Revise only the flagged lines, not a replan.

### Soft notes to fold in now
- **Yes, Site Planner:** name the OG image (1200x630) and the 192/512 px maskable icons in 02; record the PDF image encoding as a stated default the Developer may change; Lesson 12, say "on any blank frame" and keep the face out of Done. It sits beside finding 4a in the same lessons section.
- **Yes, Web Designer:** hide the header wordmark on Home only; mirror the icon sizes in 03 line 58.
- **Leave:** the Challenge editor Back going to the Gallery. It matches the parent map and is not a dead end.

### If this spans more than one role
ERROR, not a TIE: no two valid choices conflict. Order: Site Planner first (findings 1 to 4 plus its three soft notes), then Web Designer, because the W5 styling line has to style a row that exists. Web Designer is Informed on W5, not a second decider. Both edits go into `_process/04-plan-revision.md`. Gatekeeper then re-checks the fixed lines and the warning table, the Challenge section and the Gallery section as wholes.
