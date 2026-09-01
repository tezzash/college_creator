export type CombatAction = 'punch' | 'face-off' | 'fight' | 'prank' | 'spy';

export interface CombatStats {
  power: number;
  smartness: number;
}

export interface CombatResult {
  action: CombatAction;
  success: boolean;
  winProbability: number;
}

