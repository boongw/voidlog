import type { BossCuration } from "./types";

/**
 * Harvest Temple CM (Dragon's End, Soo-Won) — bossId 43488. See
 * docs/ADR-GW2-Log-Analyse-Plattform.md ADR-009 for why this is
 * hand-curated code rather than an editable DB table.
 */

const MAIN_PHASE_NAMES = [
  "Jormag",
  "Primordus",
  "Kralkatorrik",
  "Mordremoth",
  "Zhaitan",
  "Soo-Won",
];

// Elder Dragon phases get their design-matched color instead of the
// generic cyclic palette, per each dragon's theme.
const DRAGON_COLORS: Record<string, string> = {
  Jormag: "#5FC9E8", // ice
  Primordus: "#E8734C", // molten fire
  Kralkatorrik: "#A98FDB", // crystal
  Mordremoth: "#4CA64C", // toxic growth
  Zhaitan: "#6B4C8A", // undead plague
  "Soo-Won": "#3DBFA6", // pearlescent water
};

// Intermission phases between dragons — shown in the timeline but not
// tied to any dragon's theme, so they get a neutral color instead.
const PURIFICATION_COLOR = "#2e2845";

/**
 * Human-readable German names for raw EI mechanic names (the
 * `mechanicName` field, e.g. "J.Breath.H"). These short codes come
 * straight from EI's boss-specific mechanic definitions in
 * `GW2EIEvtcParser` — verified against that source, not guessed. Each
 * entry there defines (short code, description, display name), e.g.:
 *
 *   new PlayerDstHealthDamageHitMechanic(BreathOfJormag, ..., "J.Breath.H",
 *     "Hit by Jormag Breath", "Jormag Breath", Sev1, 150)
 *
 * The suffix codes mean: .H = Hit (getroffen), .B = Bait (intentionally
 * assigned to solo-take a mechanic — not a fail, see noiseMechanicNames),
 * .D = Debuff received, .CC = crowd-controlled/stunned, .L/.K =
 * achievement Lost/Kept.
 *
 * Entries not sourced from EI's Harvest Temple definitions (generic
 * cross-encounter mechanics like "Dead"/"Downed", or codes not yet seen
 * in this list) are marked "(vermutlich)" — best-effort guess, not
 * verified.
 */
const MECHANIC_NAMES: Record<string, string> = {
  // Generic, cross-encounter (not from the Harvest Temple mechanic list)
  Dead: "Gestorben",
  Downed: "Downstate",
  Res: "Wiederbelebt",
  Resp: "Wiederbelebung",
  "Got up": "Aufgestanden",
  DC: "Disconnect",
  Lckt: "Anvisiert (vermutlich)",
  Lnch: "Hochgeschleudert (vermutlich)",
  "Knck.Dwn": "Knockdown",
  "Knck.Pll": "Weggezogen (Pull, vermutlich)",
  Debilitated: "Geschwächt (Debilitated)",
  Infirmity: "Gebrechlichkeit (Infirmity)",

  // General (Harvest Temple, all phases)
  "Spread.B": "Spread Bait",
  "Red.B": "Red Bait",
  "Void.D": "Void-Debuff erhalten",
  "Void.H": "Void — getroffen",
  "Red.H": "Red Hit",
  "Spread.H": "Spread Hit",
  "Orb Push": "Orb gestoßen",
  "NopeRopes.Achiv.L": "Erfolg „Nope Ropes“ verpasst",
  "NopeRopes.Achiv.K": "Erfolg „Nope Ropes“ behalten",
  "VoidExp.H": "Void-Explosion — getroffen",
  "VoidExp.Champ.H": "Void-Explosion (Champion) — getroffen",
  "MagicDisc.H": "Magieentladung — getroffen",
  "S.Green": "Grünkreis — erfolgreich",
  "F.Green": "Grünkreis — verfehlt",
  // Synthetic marker (not a raw EI mechanic) — one per Greens occurrence,
  // clustered from S.Green/F.Green timestamps (see
  // CLUSTER_SPAWN_MARKERS_BY_BOSS in the worker's cast-markers.ts). Labeled
  // "aufgelöst" (resolved), not "erscheinen" (spawn): S.Green/F.Green only
  // fire when the mechanic resolves pass/fail, ~6.3s after the circles
  // actually appear (confirmed via EiTarget.firstAware vs. the first
  // S.Green timestamp on a real log) — the true spawn instant isn't
  // available from this data source. Only exists for Jormag/Primordus/
  // Zhaitan — Kralkatorrik/Mordremoth/Soo-Won don't have this mechanic.
  "Green.Spawn": "Grünkreise — aufgelöst",

  // Purification 1
  "Light.H": "Blitz Jormags — getroffen",
  "Flame.H": "Flammen Primordus' — getroffen",
  "Storm.H": "Kralkatorriks Sturmfall — getroffen",

  // Jormag
  "J.Breath.H": "Atem Jormags — getroffen",
  "J.Grasp.H": "Griff Jormags — getroffen",
  "J.Meteor.H": "Meteor Jormags — getroffen",

  // Primordus
  "Slam.H": "Lava Slam (Chin) Hit",
  "Jaws.H": "Kiefer der Zerstörung (Bite) Hit",
  // Synthetic markers (not a raw EI mechanic) — every cast from the boss's
  // own cast log (targets[].rotation), not just the ones that hit.
  "Jaws.Cast": "Kiefer der Zerstörung (Bite)",
  "Slam.Cast": "Lava Slam (Chin)",

  // Kralkatorrik
  "Barrage.H": "Meteor Hit",
  "Beam.H": "Gebrandeter Strahl",
  "Beam.Cast": "Branding Beam",
  "Artillery.H": "Brandbomber-Artillerie — getroffen",
  "K.Pool.H": "Kralkatorriks Void-Pool — getroffen",

  // Purification 2
  "Goop.H": "Herz-Schleim — getroffen",
  "Bees.H": "Bienen des Herzens Hit",
  "Grav.Cru.H": "Schwerkraft-Zerquetschen — getroffen",
  "NigEpoch.H": "Alptraum-Epoche — getroffen",

  // Mordremoth
  "ShckWv.H": "Mordremoths Schockwelle — getroffen",
  "ShckWv.Start": "Mordremoths Schockwelle — gestartet",
  "ShckWv.Cast": "Mordremoths Schockwelle — Angriff",
  "M.Poison.H": "Mordremoths Giftgebrüll Hit",
  "Kick.H": "Tritt des Void-Schädelspalters",
  "ChrgShot.H": "Schädelspalters Schuss",

  // Giants
  "Scream.G.CC": "Todesschrei des Riesen — betäubt",
  "RotBile.H": "Fauliger Auswurf des Riesen — getroffen",
  "Stomp.CC": "Stampfer des Riesen — betäubt",

  // Zhaitan
  "Scream.H": "Zhaitans Scream",
  "Scream.Cast": "Zhaitans Schrei — Angriff",
  "Z.Poison.H": "Gift Zhaitans — getroffen",
  "T.Slam.H": "Schwanzschlag Zhaitans — getroffen",

  // Purification 3
  "Prjtile.H": "Herz-Geschoss (Corrupted Waters) — getroffen",
  "Whrlpl.H": "Hydro-Ausbruch (Whirlpool) — getroffen",
  "CallLigh.H": "Herbeigerufener Blitz — getroffen",
  "FrozFury.H": "Gefrorene Wut — getroffen",
  "RollFlame.H": "Rollende Flamme — getroffen",
  "ShatEarth.H": "Erdbeben (Shatter Earth) — getroffen",

  // Soo-Won
  "Tsunami.H": "Soo-Wons Tsunami — getroffen",
  "Claw.H": "Klaue Soo-Wons — getroffen",
  "SW.Pool.H": "Soo-Wons Void-Pool — getroffen",
  "Tail.H": "Schwanz Soo-Wons — getroffen",
  "Torment.H": "Qual der Leere (Torment of the Void) — getroffen",
  "MagHail.H": "Magischer Hagel — getroffen",
  "Firebomb.H": "Feuerbombe — getroffen",
  "WyvBreath.H": "Wyvernatem — getroffen",
  "Charge.H": "Ansturm des Vernichters — getroffen",
  "Charge.CC": "Ansturm des Vernichters — betäubt",
  "GlaSlam.H": "Eisiger Schlag — getroffen",
  "GlaSlam.CC": "Eisiger Schlag — betäubt",

  // Purification 4
  "GraspVoid.H": "Griff der Leere (finales Orb-Geschoss) — getroffen",
};

// Raw EI mechanic names that aren't real "boss mechanic fails" and would
// drown out the ones that matter if shown (auto-tracked achievement/res
// events that fire constantly) — filtered out wherever failed-mechanic
// markers are surfaced. "Dead" is handled separately since death events
// feed a dedicated death-marker UI instead of being discarded outright.
const NOISE_MECHANIC_NAMES = new Set([
  "Orb Push",
  "Res",
  "Got up",
  "Spread.H",
  "J.Breath.H",
  "J.Grasp.H",
  "VoidExp.H",
  "NopeRopes.Achiv.L",
  "NopeRopes.Achiv.K",
  "S.Green",
]);

// The handful of boss-cast markers (see cast-markers.ts on the worker)
// that are individually curated and shown as distinct timeline ticks —
// everything else matching "<Group>.Cast.<skillId>" is bulk-captured for
// later analysis but has no UI treatment yet.
const VISIBLE_CAST_MARKERS = new Set([
  "Jaws.Cast",
  "Slam.Cast",
  "Beam.Cast",
  "ShckWv.Cast",
  "Scream.Cast",
  "Green.Spawn",
]);

export const harvestTemple: BossCuration = {
  bossId: "43488",
  isMainPhase: (phaseName) =>
    MAIN_PHASE_NAMES.includes(phaseName) || phaseName.startsWith("Purification"),
  phaseColor: (_order, phaseName) => {
    if (phaseName.startsWith("Purification")) return PURIFICATION_COLOR;
    return DRAGON_COLORS[phaseName];
  },
  mechanicNames: MECHANIC_NAMES,
  noiseMechanicNames: NOISE_MECHANIC_NAMES,
  visibleCastMarkers: VISIBLE_CAST_MARKERS,
};
