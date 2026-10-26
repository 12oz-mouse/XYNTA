export interface Building {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  baseProduction: number;
  count: number;
  emoji: string;
  unlockAt: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
  effect: () => void;
  emoji: string;
  unlockAt: number;
  category: 'click' | 'building' | 'global';
  targetBuilding?: string;
  multiplier?: number;
}

export interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  emoji: string;
  effect: string;
}

export interface GardenPlot {
  id: string;
  name: string;
  description: string;
  emoji: string;
  baseCost: number;
  costMultiplier: number;
  level: number;
  maxLevel: number;
  effect: string;
  effectValue: number; // значение эффекта за уровень
  unlockAtPrestige: number; // требуемое количество престижей
}

export interface GameState {
  mushrooms: number;
  totalMushrooms: number;
  totalMushroomsAllTime: number;
  mushroomsPerClick: number;
  mushroomsPerSecond: number;
  buildings: Building[];
  upgrades: Upgrade[];
  spores: number;
  totalSpores: number;
  prestigeCount: number;
  prestigeUpgrades: PrestigeUpgrade[];
  clickMultiplier: number;
  globalMultiplier: number;
  gardenPlots: GardenPlot[];
  lastSave: number;
}
