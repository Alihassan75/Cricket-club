# Part 4 — Teams, Players, Matches & Tournaments

Builds on Parts 1-3. Adds team rosters, match scheduling with a live
scoreboard, and tournament management with an auto-computed points table.

## New models
- `models/Team.ts` — name, captain/vice-captain, phone, lifetime played/won/lost
- `models/Player.ts` — belongs to a team; name, photo, age, phone, batting/bowling
  style, role (Batsman / Bowler / All-rounder / Wicket Keeper)
- `models/Match.ts` — teamA/teamB/ground, date/time, allotted overs, match type
  (Friendly/League/Tournament/Practice), status (Scheduled/Live/Completed/Cancelled),
  live `scoreA`/`scoreB` (runs, wickets, overs, balls, extras), optional tournament link
- `models/Tournament.ts` — name, dates, team cap, entry fee, prize money, format
  (Knockout/League/Round Robin), registered teams, status, winner

## Business logic
- `lib/matchStats.ts`:
  - `applyMatchResult()` — on a match's first transition into `Completed`,
    increments both teams' `matchesPlayed`, and the winner's `matchesWon` /
    loser's `matchesLost`. Guarded so re-saving an already-completed match
    doesn't double-count.
  - `computePointsTable()` — built fresh from a tournament's `Completed`
    matches (not stored redundantly, so it's never out of sync): 2 points per
    win, 1 each for a tie, sorted by points then Net Run Rate. NRR is computed
    from **summed** runs/overs across all matches (not averaged per-match,
    which is the standard cricket convention).
- Winner auto-detection: marking a match `Completed` without explicitly
  setting a winner compares final scores automatically; ties are supported.

## New API routes
- `GET/POST /api/teams`, `GET/PATCH/DELETE /api/teams/[id]`
- `GET/POST /api/teams/[id]/players`, `PATCH/DELETE /api/players/[id]`
- `GET/POST /api/matches` (filters: `status`, `tournamentId`, `teamId`, `date`)
- `GET/PATCH /api/matches/[id]` — status transitions, live score updates, winner
- `GET/POST /api/tournaments`, `GET/PATCH /api/tournaments/[id]`
- `POST/DELETE /api/tournaments/[id]/register` — register/unregister a team
- `GET /api/tournaments/[id]/points-table`

## New pages
- `/dashboard/teams` — team list + create
- `/dashboard/teams/[id]` — roster management (add/remove players), win/loss record
- `/dashboard/matches` — schedule matches; a "Manage" panel drives status
  (Scheduled → Live → Completed → Cancelled), live score entry for both
  innings, and winner selection once completed
- `/dashboard/tournaments` — tournament list + create
- `/dashboard/tournaments/[id]` — team registration, live points table, fixture list

## Build-tested
`next build` passes clean (31 routes, 0 type errors) — this was actually run,
not just inspected. One real bug caught and fixed in this part: an implicit
`any` on the team-unregister filter in `app/api/tournaments/[id]/register/route.ts`.

## Try it
1. **Teams** → add two teams, then open each and add a few players
2. **Matches** → schedule a match between them on a ground from Part 2
3. Open **Manage** → set status to **Live** → enter live scores for both
   sides → set status to **Completed** → pick the winner (or let it
   auto-detect from the scores)
4. Go back to **Teams** → both teams' played/won/lost updated automatically
5. **Tournaments** → create one, register both teams, schedule a match with
   that tournament selected → complete it → check the **Points table** updates
