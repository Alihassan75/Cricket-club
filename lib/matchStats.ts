import Team from "@/models/Team";
import Match from "@/models/Match";
import Tournament from "@/models/Tournament";

/**
 * Called when a match is marked Completed with a winner. Updates both teams'
 * lifetime played/won/lost counts. Idempotent guard is handled by the caller
 * (only fires on the Scheduled/Live -> Completed transition).
 */
export async function applyMatchResult(teamAId: string, teamBId: string, winnerId?: string) {
  await Team.findByIdAndUpdate(teamAId, { $inc: { matchesPlayed: 1 } });
  await Team.findByIdAndUpdate(teamBId, { $inc: { matchesPlayed: 1 } });

  if (!winnerId) return; // tie / no result — played count still increments, no win/loss

  const loserId = winnerId === teamAId ? teamBId : teamAId;
  await Team.findByIdAndUpdate(winnerId, { $inc: { matchesWon: 1 } });
  await Team.findByIdAndUpdate(loserId, { $inc: { matchesLost: 1 } });
}

function oversToDecimal(overs: number, balls: number) {
  // Cricket overs (12.4 = 12 overs + 4 balls) converted to true decimal overs for rate math.
  return overs + balls / 6;
}

export interface PointsRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  netRunRate: number;
}

/**
 * Computes a points table for a tournament from its Completed matches.
 * Points: 2 per win, 0 per loss (ties/no-result score 1 each, matching common
 * local league rules). NRR = (runs scored / overs faced) - (runs conceded / overs bowled),
 * summed across every completed match the team played in this tournament.
 */
export async function computePointsTable(tournamentId: string): Promise<PointsRow[]> {
  const tournament = await Tournament.findById(tournamentId).populate("registeredTeams", "name");
  if (!tournament) return [];

  const matches = await Match.find({ tournament: tournamentId, status: "Completed" });

  const table = new Map<string, PointsRow>();
  for (const team of tournament.registeredTeams as any[]) {
    table.set(team._id.toString(), {
      teamId: team._id.toString(),
      teamName: team.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      netRunRate: 0,
    });
  }

  // Track raw runs/overs totals per team so NRR is computed once at the end
  // (averaging per-match NRRs would be mathematically wrong).
  const runTotals = new Map<string, { runsFor: number; oversFor: number; runsAgainst: number; oversAgainst: number }>();
  const ensure = (id: string) => {
    if (!runTotals.has(id)) runTotals.set(id, { runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0 });
    return runTotals.get(id)!;
  };

  for (const m of matches) {
    const aId = m.teamA.toString();
    const bId = m.teamB.toString();
    if (!table.has(aId) || !table.has(bId)) continue;

    const rowA = table.get(aId)!;
    const rowB = table.get(bId)!;
    rowA.played += 1;
    rowB.played += 1;

    const winnerId = m.winner?.toString();
    if (winnerId === aId) {
      rowA.won += 1;
      rowA.points += 2;
      rowB.lost += 1;
    } else if (winnerId === bId) {
      rowB.won += 1;
      rowB.points += 2;
      rowA.lost += 1;
    } else {
      rowA.points += 1;
      rowB.points += 1;
    }

    const oversA = oversToDecimal(m.scoreA.overs, m.scoreA.balls);
    const oversB = oversToDecimal(m.scoreB.overs, m.scoreB.balls);
    const totA = ensure(aId);
    const totB = ensure(bId);
    totA.runsFor += m.scoreA.runs;
    totA.oversFor += oversA;
    totA.runsAgainst += m.scoreB.runs;
    totA.oversAgainst += oversB;
    totB.runsFor += m.scoreB.runs;
    totB.oversFor += oversB;
    totB.runsAgainst += m.scoreA.runs;
    totB.oversAgainst += oversA;
  }

  for (const [id, row] of table) {
    const tot = runTotals.get(id);
    if (tot && tot.oversFor > 0 && tot.oversAgainst > 0) {
      row.netRunRate = Number((tot.runsFor / tot.oversFor - tot.runsAgainst / tot.oversAgainst).toFixed(3));
    }
  }

  return [...table.values()].sort((a, b) => b.points - a.points || b.netRunRate - a.netRunRate);
}
