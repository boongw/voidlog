/**
 * Human-readable German names for raw EI mechanic names (the `mechanicName`
 * field, e.g. "J.Breath.H"). These short codes come straight from EI's
 * boss-specific mechanic definitions in `GW2EIEvtcParser` (Harvest Temple
 * CM) — verified against that source, not guessed. Each entry there defines
 * (short code, description, display name), e.g.:
 *
 *   new PlayerDstHealthDamageHitMechanic(BreathOfJormag, ..., "J.Breath.H",
 *     "Hit by Jormag Breath", "Jormag Breath", Sev1, 150)
 *
 * The suffix codes mean: .H = Hit (getroffen), .B = Bait (intentionally
 * assigned to solo-take a mechanic — not a fail, see isNoiseMechanic),
 * .D = Debuff received, .CC = crowd-controlled/stunned, .L/.K = achievement
 * Lost/Kept.
 *
 * Entries not sourced from EI's Harvest Temple definitions (generic
 * cross-encounter mechanics like "Dead"/"Downed", or codes not yet seen in
 * this list) are marked "(vermutlich)" — best-effort guess, not verified.
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
  "NopeRopes.Achiv.K": "Erfolg „Nope Ropes“ erhalten",
  "VoidExp.H": "Void-Explosion — getroffen",
  "VoidExp.Champ.H": "Void-Explosion (Champion) — getroffen",
  "MagicDisc.H": "Magieentladung — getroffen",
  "S.Green": "Grünkreis — erfolgreich",
  "F.Green": "Grünkreis — verfehlt",

  // Purification 1
  "Light.H": "Blitz Jormags — getroffen",
  "Flame.H": "Flammen Primordus' — getroffen",
  "Storm.H": "Kralkatorriks Sturmfall — getroffen",

  // Jormag
  "J.Breath.H": "Atem Jormags — getroffen",
  "J.Grasp.H": "Griff Jormags — getroffen",
  "J.Meteor.H": "Meteor Jormags — getroffen",

  // Primordus
  "Slam.H": "Schlag Primordus' — getroffen",
  "Jaws.H": "Kiefer der Zerstörung — getroffen",

  // Kralkatorrik
  "Barrage.H": "Kristall-Sperrfeuer — getroffen",
  "Beam.H": "Gebrandeter Strahl Kralkatorriks — getroffen",
  "Artillery.H": "Brandbomber-Artillerie — getroffen",
  "K.Pool.H": "Kralkatorriks Void-Pool — getroffen",

  // Purification 2
  "Goop.H": "Herz-Schleim — getroffen",
  "Bees.H": "Bienen des Herzens — getroffen",
  "Grav.Cru.H": "Schwerkraft-Zerquetschen — getroffen",
  "NigEpoch.H": "Alptraum-Epoche — getroffen",

  // Mordremoth
  "ShckWv.H": "Mordremoths Schockwelle — getroffen",
  "ShckWv.Start": "Mordremoths Schockwelle — gestartet",
  "M.Poison.H": "Mordremoths Giftgebrüll — getroffen",
  "Kick.H": "Tritt des Void-Schädelspalters — getroffen",
  "ChrgShot.H": "Aufgeladener Schuss des Schädelspalters — getroffen",

  // Giants
  "Scream.G.CC": "Todesschrei des Riesen — betäubt",
  "RotBile.H": "Fauliger Auswurf des Riesen — getroffen",
  "Stomp.CC": "Stampfer des Riesen — betäubt",

  // Zhaitan
  "Scream.H": "Schrei Zhaitans — getroffen",
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

/**
 * Best-effort fallback for raw names not in the curated list above: split
 * "Foo.Bar.H" into "Foo Bar" and expand the trailing suffix code, so an
 * unmapped mechanic still reads as words instead of an opaque EI code.
 * Suffix meanings per the verified EI source (see header comment).
 */
function humanizeFallback(mechanicName: string): string {
  const parts = mechanicName.split(".");
  const suffix = parts.at(-1);
  const suffixLabels: Record<string, string> = {
    H: "getroffen",
    B: "Köder (Bait)",
    D: "Debuff erhalten",
    CC: "betäubt",
    L: "Erfolg verpasst",
    K: "Erfolg erhalten",
  };
  const label = suffix ? suffixLabels[suffix] : undefined;
  const stem = (label ? parts.slice(0, -1) : parts).join(" ");
  return label ? `${stem} — ${label} (vermutlich)` : `${stem} (vermutlich)`;
}

/**
 * `curatedDisplayName` is the worker's own `MechanicEvent.displayName` —
 * only meaningful when a per-boss `BossConfig.mechanics` mapping actually
 * curated it (ADR-009); otherwise the worker just falls back to the raw
 * `mechanicName`, so it's indistinguishable from "no curation" here. When
 * it *is* curated (differs from the raw name), prefer it over our own
 * best-effort guess — it was hand-authored for that specific boss.
 */
export function translateMechanicName(
  mechanicName: string,
  curatedDisplayName?: string,
): string {
  if (MECHANIC_NAMES[mechanicName]) return MECHANIC_NAMES[mechanicName];
  if (curatedDisplayName && curatedDisplayName !== mechanicName) return curatedDisplayName;
  return humanizeFallback(mechanicName);
}
