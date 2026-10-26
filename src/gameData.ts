import { Building, PrestigeUpgrade } from './types';

export const initialBuildings: Building[] = [
  {
    id: 'mycelium',
    name: 'Мицелий',
    description: 'Простейшая грибница, растит грибы',
    baseCost: 15,
    costMultiplier: 1.15,
    baseProduction: 0.5,
    count: 0,
    emoji: '🌱',
    unlockAt: 0,
  },
  {
    id: 'mushroom_patch',
    name: 'Грибная поляна',
    description: 'Небольшая полянка с грибами',
    baseCost: 100,
    costMultiplier: 1.15,
    baseProduction: 2,
    count: 0,
    emoji: '🍄',
    unlockAt: 50,
  },
  {
    id: 'ant_colony',
    name: 'Муравьиная ферма',
    description: 'Муравьи помогают выращивать грибы',
    baseCost: 1100,
    costMultiplier: 1.15,
    baseProduction: 8,
    count: 0,
    emoji: '🐜',
    unlockAt: 500,
  },
  {
    id: 'beetle_farm',
    name: 'Ферма жуков',
    description: 'Жуки-грибоводы трудятся не покладая лап',
    baseCost: 5000,
    costMultiplier: 1.15,
    baseProduction: 25,
    count: 0,
    emoji: '🪲',
    unlockAt: 2000,
  },
  {
    id: 'forest',
    name: 'Грибной лес',
    description: 'Целый лес, наполненный грибами',
    baseCost: 12000,
    costMultiplier: 1.15,
    baseProduction: 47,
    count: 0,
    emoji: '🌲',
    unlockAt: 5000,
  },
  {
    id: 'fairy_ring',
    name: 'Ведьмин круг',
    description: 'Магический круг из грибов, усиливающий рост',
    baseCost: 50000,
    costMultiplier: 1.15,
    baseProduction: 120,
    count: 0,
    emoji: '🧚',
    unlockAt: 20000,
  },
  {
    id: 'greenhouse',
    name: 'Теплица',
    description: 'Контролируемая среда для идеального роста',
    baseCost: 130000,
    costMultiplier: 1.15,
    baseProduction: 260,
    count: 0,
    emoji: '🏡',
    unlockAt: 50000,
  },
  {
    id: 'lab',
    name: 'Мико-лаборатория',
    description: 'Генетически модифицированные супер-грибы',
    baseCost: 1400000,
    costMultiplier: 1.15,
    baseProduction: 1400,
    count: 0,
    emoji: '🔬',
    unlockAt: 500000,
  },
  {
    id: 'portal',
    name: 'Грибной портал',
    description: 'Портал в грибное измерение',
    baseCost: 20000000,
    costMultiplier: 1.15,
    baseProduction: 7800,
    count: 0,
    emoji: '🌀',
    unlockAt: 5000000,
  },
  {
    id: 'planet',
    name: 'Грибная планета',
    description: 'Целая планета, покрытая грибами',
    baseCost: 330000000,
    costMultiplier: 1.15,
    baseProduction: 44000,
    count: 0,
    emoji: '🪐',
    unlockAt: 50000000,
  },
  {
    id: 'dimension',
    name: 'Грибное измерение',
    description: 'Бесконечное пространство грибов',
    baseCost: 5100000000,
    costMultiplier: 1.15,
    baseProduction: 260000,
    count: 0,
    emoji: '✨',
    unlockAt: 500000000,
  },
  {
    id: 'universe',
    name: 'Грибная вселенная',
    description: 'Вселенная, где всё состоит из грибов',
    baseCost: 75000000000,
    costMultiplier: 1.15,
    baseProduction: 1600000,
    count: 0,
    emoji: '🌌',
    unlockAt: 5000000000,
  },
  {
    id: 'multiverse',
    name: 'Мультивселенная',
    description: 'Бесконечное число вселенных грибов',
    baseCost: 1000000000000,
    costMultiplier: 1.15,
    baseProduction: 10000000,
    count: 0,
    emoji: '🔮',
    unlockAt: 50000000000,
  },
];

export const initialPrestigeUpgrades: PrestigeUpgrade[] = [
  {
    id: 'spore_boost',
    name: 'Усиление спор',
    description: '+25% к производству за уровень',
    cost: 1,
    level: 0,
    maxLevel: 50,
    emoji: '💨',
    effect: 'production',
  },
  {
    id: 'spore_click',
    name: 'Споровый клик',
    description: '+50% к силе клика за уровень',
    cost: 2,
    level: 0,
    maxLevel: 50,
    emoji: '👆',
    effect: 'click',
  },
  {
    id: 'spore_start',
    name: 'Быстрый старт',
    description: 'Начинаете с грибами за уровень (×100)',
    cost: 3,
    level: 0,
    maxLevel: 20,
    emoji: '🚀',
    effect: 'start',
  },
  {
    id: 'spore_discount',
    name: 'Скидка на здания',
    description: '-5% к стоимости зданий за уровень',
    cost: 5,
    level: 0,
    maxLevel: 10,
    emoji: '💰',
    effect: 'discount',
  },
  {
    id: 'spore_autoclick',
    name: 'Автоклик',
    description: '+1 автоклик/сек за уровень',
    cost: 10,
    level: 0,
    maxLevel: 10,
    emoji: '⚡',
    effect: 'autoclick',
  },
  {
    id: 'spore_mega',
    name: 'Мега-споры',
    description: '×2 ко всем спорам за уровень',
    cost: 25,
    level: 0,
    maxLevel: 10,
    emoji: '🌟',
    effect: 'spore_multi',
  },
];

export function formatNumber(num: number): string {
  if (num < 0.01 && num > 0) return num.toFixed(3);
  if (num < 1) return num.toFixed(2);
  if (num < 10) return num.toFixed(1);
  if (num < 1000) return Math.floor(num).toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(2) + 'M';
  if (num < 1000000000000) return (num / 1000000000).toFixed(2) + 'B';
  if (num < 1000000000000000) return (num / 1000000000000).toFixed(2) + 'T';
  return (num / 1000000000000000).toFixed(2) + 'Q';
}

export function getBuildingCost(building: Building, discount: number = 0): number {
  const rawCost = building.baseCost * Math.pow(building.costMultiplier, building.count);
  return Math.floor(rawCost * (1 - discount));
}

export function calculatePrestigeSpores(totalMushrooms: number, currentSpores: number, sporeMulti: number): number {
  const base = Math.floor(Math.pow(totalMushrooms / 1000000, 0.5));
  const newSpores = Math.max(0, base - currentSpores);
  return Math.floor(newSpores * sporeMulti);
}
