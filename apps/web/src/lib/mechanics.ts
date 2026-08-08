/**
 * Raw EI mechanic names that aren't real "boss mechanic fails" and would
 * drown out the ones that matter if shown (auto-tracked achievement/res
 * events that fire constantly) — filtered out wherever failed-mechanic
 * markers are surfaced. "Dead" is handled separately since death events
 * feed a dedicated death-marker UI instead of being discarded outright.
 */
const NOISE_MECHANIC_NAMES = new Set(['Orb Push', 'Res', 'Got up', 'Red.B', 'Spread.B', 'J.Breath.H', 'J.Grasp.H', 'VoidExp.H', 'NopeRopes.Achiv.L', 'S.Green']);

export function isNoiseMechanic(mechanicName: string): boolean {
    return NOISE_MECHANIC_NAMES.has(mechanicName);
}
