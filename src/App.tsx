import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState } from './types';
import {
  initialBuildings,
  initialPrestigeUpgrades,
  formatNumber,
  getBuildingCost,
  calculatePrestigeSpores,
} from './gameData';

const SAVE_KEY = 'mushroom_empire_save_v3';

// Achievement definitions
const ACHIEVEMENTS = [
  { id: 'first_click', name: 'Первый гриб', desc: 'Собрать первый гриб', emoji: '🎉', check: (g: GameState) => g.totalMushroomsAllTime >= 1 },
  { id: 'hundred', name: 'Сотня', desc: 'Собрать 100 грибов', emoji: '💯', check: (g: GameState) => g.totalMushroomsAllTime >= 100 },
  { id: 'thousand', name: 'Тысячник', desc: 'Собрать 1,000 грибов', emoji: '🏆', check: (g: GameState) => g.totalMushroomsAllTime >= 1000 },
  { id: 'million', name: 'Миллионер', desc: 'Собрать 1,000,000 грибов', emoji: '💎', check: (g: GameState) => g.totalMushroomsAllTime >= 1000000 },
  { id: 'billion', name: 'Миллиардер', desc: 'Собрать 1B грибов', emoji: '👑', check: (g: GameState) => g.totalMushroomsAllTime >= 1000000000 },
  { id: 'first_building', name: 'Застройщик', desc: 'Купить первое здание', emoji: '🏗️', check: (g: GameState) => g.buildings.some(b => b.count > 0) },
  { id: 'ten_buildings', name: 'Поселение', desc: 'Иметь 10 зданий одного типа', emoji: '🏘️', check: (g: GameState) => g.buildings.some(b => b.count >= 10) },
  { id: 'fifty_buildings', name: 'Город', desc: 'Иметь 50 зданий одного типа', emoji: '🌆', check: (g: GameState) => g.buildings.some(b => b.count >= 50) },
  { id: 'hundred_buildings', name: 'Мегаполис', desc: 'Иметь 100 зданий одного типа', emoji: '🌇', check: (g: GameState) => g.buildings.some(b => b.count >= 100) },
  { id: 'first_prestige', name: 'Перерождение', desc: 'Выполнить первый престиж', emoji: '🌀', check: (g: GameState) => g.prestigeCount >= 1 },
  { id: 'five_prestige', name: 'Ветеран', desc: 'Выполнить 5 престижей', emoji: '⭐', check: (g: GameState) => g.prestigeCount >= 5 },
  { id: 'ten_prestige', name: 'Легенда', desc: 'Выполнить 10 престижей', emoji: '🌟', check: (g: GameState) => g.prestigeCount >= 10 },
  { id: 'all_types', name: 'Коллекционер', desc: 'Иметь все типы зданий', emoji: '🎪', check: (g: GameState) => g.buildings.every(b => b.count > 0) },
  { id: 'combo_10', name: 'Комбо-мастер', desc: 'Достичь комбо ×10', emoji: '🔥', check: (_g: GameState) => false },
  { id: 'golden', name: 'Золотая лихорадка', desc: 'Поймать золотой гриб', emoji: '🌟', check: (_g: GameState) => false },
];

// Building milestone bonuses
const BUILDING_MILESTONES = [10, 25, 50, 100, 150, 200];

// Random events
const RANDOM_EVENTS = [
  { id: 'spore_rain', name: 'Дождь спор', desc: 'Производство ×3 на 15 сек!', emoji: '🌧️', duration: 15000, multi: 3 },
  { id: 'sunshine', name: 'Солнечный день', desc: 'Клик ×5 на 10 сек!', emoji: '☀️', duration: 10000, multi: 5, type: 'click' },
  { id: 'mycelium_surge', name: 'Всплеск мицелия', desc: 'Производство ×2 на 20 сек!', emoji: '🌿', duration: 20000, multi: 2 },
  { id: 'lucky_day', name: 'Удачный день', desc: 'Всё ×4 на 8 сек!', emoji: '🍀', duration: 8000, multi: 4 },
  { id: 'mushroom_frenzy', name: 'Грибное безумие', desc: 'Производство ×5 на 10 сек!', emoji: '🎪', duration: 10000, multi: 5 },
];

interface GoldenMushroom {
  id: number;
  x: number;
  y: number;
  createdAt: number;
}

interface ActiveEvent {
  event: typeof RANDOM_EVENTS[0];
  endsAt: number;
}

function getInitialState(): GameState {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { ...parsed, mushroomsPerSecond: 0, mushroomsPerClick: 1 };
    } catch {
      // ignore
    }
  }
  return {
    mushrooms: 0,
    totalMushrooms: 0,
    totalMushroomsAllTime: 0,
    mushroomsPerClick: 1,
    mushroomsPerSecond: 0,
    buildings: initialBuildings.map((b) => ({ ...b })),
    upgrades: [],
    spores: 0,
    totalSpores: 0,
    prestigeCount: 0,
    prestigeUpgrades: initialPrestigeUpgrades.map((u) => ({ ...u })),
    clickMultiplier: 1,
    globalMultiplier: 1,
    lastSave: Date.now(),
  };
}

export default function App() {
  const [game, setGame] = useState<GameState>(getInitialState);
  const [activeTab, setActiveTab] = useState<'buildings' | 'upgrades' | 'prestige' | 'achievements'>('buildings');
  const [clickEffects, setClickEffects] = useState<{ id: number; x: number; y: number; value: number; color?: string }[]>([]);
  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false);
  const [mushroomScale, setMushroomScale] = useState(1);
  const [notification, setNotification] = useState<string | null>(null);
  const [goldenMushrooms, setGoldenMushrooms] = useState<GoldenMushroom[]>([]);
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState<number | null>(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  
  const effectIdRef = useRef(0);
  const goldenIdRef = useRef(0);
  const gameRef = useRef(game);
  gameRef.current = game;
  const activeEventsRef = useRef(activeEvents);
  activeEventsRef.current = activeEvents;

  const [purchasedUpgrades, setPurchasedUpgrades] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed.purchasedUpgradeIds || []);
      } catch {
        // ignore
      }
    }
    return new Set();
  });
  const purchasedUpgradesRef = useRef(purchasedUpgrades);
  purchasedUpgradesRef.current = purchasedUpgrades;

  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed.achievements || []);
      } catch {
        // ignore
      }
    }
    return new Set();
  });
  const unlockedRef = useRef(unlockedAchievements);
  unlockedRef.current = unlockedAchievements;

  // Calculate derived values
  const getDiscount = useCallback(() => {
    const discountUpgrade = game.prestigeUpgrades.find((u) => u.id === 'spore_discount');
    return discountUpgrade ? discountUpgrade.level * 0.05 : 0;
  }, [game.prestigeUpgrades]);

  const getBuildingMilestoneMultiplier = useCallback((buildingCount: number): number => {
    let multi = 1;
    for (const milestone of BUILDING_MILESTONES) {
      if (buildingCount >= milestone) {
        multi *= 2;
      }
    }
    return multi;
  }, []);

  const getEventMultiplier = useCallback((type: 'production' | 'click' | 'all'): number => {
    const now = Date.now();
    let multi = 1;
    for (const ae of activeEventsRef.current) {
      if (ae.endsAt > now) {
        if (ae.event.type === 'click' && (type === 'click' || type === 'all')) {
          multi *= ae.event.multi;
        } else if (!ae.event.type && (type === 'production' || type === 'all')) {
          multi *= ae.event.multi;
        }
      }
    }
    return multi;
  }, []);

  const getProductionMultiplier = useCallback(() => {
    const boostUpgrade = game.prestigeUpgrades.find((u) => u.id === 'spore_boost');
    const boostMulti = boostUpgrade ? 1 + boostUpgrade.level * 0.25 : 1;
    const eventMulti = getEventMultiplier('production');
    return game.globalMultiplier * boostMulti * eventMulti;
  }, [game.prestigeUpgrades, game.globalMultiplier, getEventMultiplier]);

  const getClickPower = useCallback(() => {
    const clickUpgrade = game.prestigeUpgrades.find((u) => u.id === 'spore_click');
    const clickMulti = clickUpgrade ? 1 + clickUpgrade.level * 0.5 : 1;
    const comboMulti = 1 + combo * 0.1; // +10% per combo level
    const eventMulti = getEventMultiplier('click');
    return game.mushroomsPerClick * game.clickMultiplier * clickMulti * comboMulti * eventMulti;
  }, [game.prestigeUpgrades, game.mushroomsPerClick, game.clickMultiplier, combo, getEventMultiplier]);

  const getAutoClicks = useCallback(() => {
    const autoUpgrade = game.prestigeUpgrades.find((u) => u.id === 'spore_autoclick');
    return autoUpgrade ? autoUpgrade.level : 0;
  }, [game.prestigeUpgrades]);

  const getSporeMultiplier = useCallback(() => {
    const megaUpgrade = game.prestigeUpgrades.find((u) => u.id === 'spore_mega');
    return megaUpgrade ? Math.pow(2, megaUpgrade.level) : 1;
  }, [game.prestigeUpgrades]);

  // Calculate MPS
  const calculateMPS = useCallback(() => {
    const multi = getProductionMultiplier();
    let total = 0;
    for (const building of game.buildings) {
      const milestoneMulti = getBuildingMilestoneMultiplier(building.count);
      total += building.baseProduction * building.count * milestoneMulti;
    }
    return total * multi;
  }, [game.buildings, getProductionMultiplier, getBuildingMilestoneMultiplier]);

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      setGame((prev) => {
        const boostUpgrade = prev.prestigeUpgrades.find((u) => u.id === 'spore_boost');
        const boostMulti = boostUpgrade ? 1 + boostUpgrade.level * 0.25 : 1;
        
        // Event multiplier
        const now = Date.now();
        let eventMulti = 1;
        for (const ae of activeEventsRef.current) {
          if (ae.endsAt > now && !ae.event.type) {
            eventMulti *= ae.event.multi;
          }
        }
        
        const multi = prev.globalMultiplier * boostMulti * eventMulti;

        let production = 0;
        for (const building of prev.buildings) {
          let milestoneMulti = 1;
          for (const milestone of BUILDING_MILESTONES) {
            if (building.count >= milestone) milestoneMulti *= 2;
          }
          production += building.baseProduction * building.count * milestoneMulti;
        }
        production *= multi;

        const autoClickUpgrade = prev.prestigeUpgrades.find((u) => u.id === 'spore_autoclick');
        const autoClicks = autoClickUpgrade ? autoClickUpgrade.level : 0;
        const clickUpgrade = prev.prestigeUpgrades.find((u) => u.id === 'spore_click');
        const clickMulti = clickUpgrade ? 1 + clickUpgrade.level * 0.5 : 1;
        const clickPower = prev.mushroomsPerClick * prev.clickMultiplier * clickMulti;
        const autoClickProduction = autoClicks * clickPower;

        const totalGain = (production + autoClickProduction) / 10;

        return {
          ...prev,
          mushrooms: prev.mushrooms + totalGain,
          totalMushrooms: prev.totalMushrooms + totalGain,
          totalMushroomsAllTime: prev.totalMushroomsAllTime + totalGain,
          mushroomsPerSecond: production + autoClickProduction,
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Golden mushroom spawner
  useEffect(() => {
    const spawnGolden = () => {
      const delay = 30000 + Math.random() * 60000; // 30-90 seconds
      const timeout = setTimeout(() => {
        const id = goldenIdRef.current++;
        const x = 10 + Math.random() * 80;
        const y = 10 + Math.random() * 70;
        setGoldenMushrooms(prev => [...prev, { id, x, y, createdAt: Date.now() }]);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
          setGoldenMushrooms(prev => prev.filter(g => g.id !== id));
        }, 10000);
        
        spawnGolden();
      }, delay);
      return timeout;
    };
    
    const timeout = spawnGolden();
    return () => clearTimeout(timeout);
  }, []);

  // Random event spawner
  useEffect(() => {
    const spawnEvent = () => {
      const delay = 45000 + Math.random() * 90000; // 45-135 seconds
      const timeout = setTimeout(() => {
        const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        const endsAt = Date.now() + event.duration;
        setActiveEvents(prev => [...prev, { event, endsAt }]);
        setNotification(`${event.emoji} ${event.name}: ${event.desc}`);
        setTimeout(() => setNotification(null), 3000);
        
        // Clean up expired events
        setTimeout(() => {
          setActiveEvents(prev => prev.filter(ae => ae.endsAt > Date.now()));
        }, event.duration + 100);
        
        spawnEvent();
      }, delay);
      return timeout;
    };
    
    // Start after 60 seconds
    const initialTimeout = setTimeout(() => {
      spawnEvent();
    }, 60000);
    
    return () => clearTimeout(initialTimeout);
  }, []);

  // Achievement checker
  useEffect(() => {
    const interval = setInterval(() => {
      const currentGame = gameRef.current;
      
      for (const achievement of ACHIEVEMENTS) {
        if (!unlockedRef.current.has(achievement.id) && achievement.check(currentGame)) {
          setUnlockedAchievements(prev => {
            const next = new Set(prev);
            next.add(achievement.id);
            return next;
          });
          setNotification(`${achievement.emoji} Достижение: ${achievement.name}!`);
          setTimeout(() => setNotification(null), 3000);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      const saveData = {
        ...gameRef.current,
        purchasedUpgradeIds: Array.from(purchasedUpgradesRef.current),
        achievements: Array.from(unlockedRef.current),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Click handler
  const handleMushroomClick = useCallback(
    (e: React.MouseEvent) => {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTime;
      setLastClickTime(now);
      
      // Combo system
      if (timeSinceLastClick < 500) {
        setCombo(prev => {
          const newCombo = prev + 1;
          if (newCombo === 10 && !unlockedRef.current.has('combo_10')) {
            setUnlockedAchievements(prev => {
              const next = new Set(prev);
              next.add('combo_10');
              return next;
            });
            setNotification('🔥 Достижение: Комбо-мастер!');
            setTimeout(() => setNotification(null), 3000);
          }
          return newCombo;
        });
      } else {
        setCombo(0);
      }
      
      // Reset combo after 2 seconds of no clicks
      if (comboTimer) clearTimeout(comboTimer);
      const timer = window.setTimeout(() => setCombo(0), 2000);
      setComboTimer(timer);

      const power = getClickPower();
      setGame((prev) => ({
        ...prev,
        mushrooms: prev.mushrooms + power,
        totalMushrooms: prev.totalMushrooms + power,
        totalMushroomsAllTime: prev.totalMushroomsAllTime + power,
      }));

      setMushroomScale(0.9);
      setTimeout(() => setMushroomScale(1), 100);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = effectIdRef.current++;
      const color = combo >= 10 ? 'text-red-400' : combo >= 5 ? 'text-orange-400' : 'text-yellow-300';
      setClickEffects((prev) => [...prev, { id, x, y, value: power, color }]);
      setTimeout(() => {
        setClickEffects((prev) => prev.filter((e) => e.id !== id));
      }, 1000);
    },
    [getClickPower, combo, comboTimer, lastClickTime]
  );

  // Golden mushroom click
  const handleGoldenClick = useCallback((golden: GoldenMushroom) => {
    setGoldenMushrooms(prev => prev.filter(g => g.id !== golden.id));
    
    // Award bonus: 10x current MPS or 100 mushrooms, whichever is higher
    const mps = calculateMPS();
    const bonus = Math.max(mps * 60, 100, game.mushrooms * 0.1);
    
    setGame(prev => ({
      ...prev,
      mushrooms: prev.mushrooms + bonus,
      totalMushrooms: prev.totalMushrooms + bonus,
      totalMushroomsAllTime: prev.totalMushroomsAllTime + bonus,
    }));
    
    setNotification(`🌟 Золотой гриб! +${formatNumber(bonus)} грибов!`);
    setTimeout(() => setNotification(null), 3000);
    
    // Unlock achievement
    if (!unlockedRef.current.has('golden')) {
      setUnlockedAchievements(prev => {
        const next = new Set(prev);
        next.add('golden');
        return next;
      });
    }
  }, [calculateMPS, game.mushrooms]);

  // Buy building
  const buyBuilding = useCallback((buildingId: string) => {
    setGame((prev) => {
      const discount = (() => {
        const du = prev.prestigeUpgrades.find((u) => u.id === 'spore_discount');
        return du ? du.level * 0.05 : 0;
      })();
      const building = prev.buildings.find((b) => b.id === buildingId);
      if (!building) return prev;
      const cost = getBuildingCost(building, discount);
      if (prev.mushrooms < cost) return prev;

      const newBuildings = prev.buildings.map((b) =>
        b.id === buildingId ? { ...b, count: b.count + 1 } : b
      );

      return {
        ...prev,
        mushrooms: prev.mushrooms - cost,
        buildings: newBuildings,
      };
    });
  }, []);

  // Buy 10 buildings
  const buyBuilding10 = useCallback((buildingId: string) => {
    setGame((prev) => {
      const discount = (() => {
        const du = prev.prestigeUpgrades.find((u) => u.id === 'spore_discount');
        return du ? du.level * 0.05 : 0;
      })();
      const building = prev.buildings.find((b) => b.id === buildingId);
      if (!building) return prev;

      let totalCost = 0;
      for (let i = 0; i < 10; i++) {
        totalCost += getBuildingCost({ ...building, count: building.count + i }, discount);
      }
      if (prev.mushrooms < totalCost) return prev;

      const newBuildings = prev.buildings.map((b) =>
        b.id === buildingId ? { ...b, count: b.count + 10 } : b
      );

      return {
        ...prev,
        mushrooms: prev.mushrooms - totalCost,
        buildings: newBuildings,
      };
    });
  }, []);

  // Click upgrades
  const clickUpgrades = [
    { id: 'click1', name: 'Крепкие руки', cost: 100, power: 1, emoji: '✊', unlockAt: 50 },
    { id: 'click2', name: 'Грибной нюх', cost: 500, power: 3, emoji: '👃', unlockAt: 200 },
    { id: 'click3', name: 'Двойной удар', cost: 2500, power: 10, emoji: '🤜', unlockAt: 1000 },
    { id: 'click4', name: 'Грибной мастер', cost: 15000, power: 50, emoji: '🧤', unlockAt: 5000 },
    { id: 'click5', name: 'Золотые руки', cost: 100000, power: 250, emoji: '🌟', unlockAt: 50000 },
    { id: 'click6', name: 'Магический сбор', cost: 1000000, power: 1500, emoji: '🪄', unlockAt: 500000 },
    { id: 'click7', name: 'Сила мицелия', cost: 10000000, power: 10000, emoji: '💪', unlockAt: 5000000 },
    { id: 'click8', name: 'Абсолютный сбор', cost: 100000000, power: 75000, emoji: '🔮', unlockAt: 50000000 },
    { id: 'click9', name: 'Божественный клик', cost: 2000000000, power: 500000, emoji: '👼', unlockAt: 500000000 },
    { id: 'click10', name: 'Космический удар', cost: 50000000000, power: 5000000, emoji: '☄️', unlockAt: 10000000000 },
  ];

  // Multiplier upgrades
  const multiUpgrades = [
    { id: 'multi1', name: 'Удобрение', cost: 1000, multi: 2, emoji: '💩', unlockAt: 500 },
    { id: 'multi2', name: 'Полив', cost: 10000, multi: 2, emoji: '💧', unlockAt: 5000 },
    { id: 'multi3', name: 'Солнечный свет', cost: 100000, multi: 2, emoji: '☀️', unlockAt: 50000 },
    { id: 'multi4', name: 'Грибной гормон', cost: 1000000, multi: 3, emoji: '💉', unlockAt: 500000 },
    { id: 'multi5', name: 'Квантовый рост', cost: 50000000, multi: 3, emoji: '⚛️', unlockAt: 10000000 },
    { id: 'multi6', name: 'Тёмная энергия', cost: 1000000000, multi: 5, emoji: '🌑', unlockAt: 100000000 },
    { id: 'multi7', name: 'Временной ускоритель', cost: 50000000000, multi: 5, emoji: '⏰', unlockAt: 5000000000 },
    { id: 'multi8', name: 'Бесконечность', cost: 1000000000000, multi: 10, emoji: '♾️', unlockAt: 100000000000 },
  ];

  const buyClickUpgrade = useCallback((upgrade: typeof clickUpgrades[0]) => {
    setGame((prev) => {
      if (prev.mushrooms < upgrade.cost) return prev;
      return {
        ...prev,
        mushrooms: prev.mushrooms - upgrade.cost,
        mushroomsPerClick: prev.mushroomsPerClick + upgrade.power,
      };
    });
    setPurchasedUpgrades((prev) => new Set([...prev, upgrade.id]));
  }, []);

  const buyMultiUpgrade = useCallback((upgrade: typeof multiUpgrades[0]) => {
    setGame((prev) => {
      if (prev.mushrooms < upgrade.cost) return prev;
      return {
        ...prev,
        mushrooms: prev.mushrooms - upgrade.cost,
        globalMultiplier: prev.globalMultiplier * upgrade.multi,
      };
    });
    setPurchasedUpgrades((prev) => new Set([...prev, upgrade.id]));
  }, []);

  // Prestige
  const getPrestigeSporesGain = useCallback(() => {
    return calculatePrestigeSpores(game.totalMushrooms, game.totalSpores, getSporeMultiplier());
  }, [game.totalMushrooms, game.totalSpores, getSporeMultiplier]);

  const doPrestige = useCallback(() => {
    const sporesGain = getPrestigeSporesGain();
    if (sporesGain <= 0) return;

    const startUpgrade = game.prestigeUpgrades.find((u) => u.id === 'spore_start');
    const startMushrooms = startUpgrade ? startUpgrade.level * 100 : 0;

    setGame((prev) => ({
      ...prev,
      mushrooms: startMushrooms,
      totalMushrooms: startMushrooms,
      mushroomsPerClick: 1,
      mushroomsPerSecond: 0,
      buildings: initialBuildings.map((b) => ({ ...b })),
      spores: prev.spores + sporesGain,
      totalSpores: prev.totalSpores + sporesGain,
      prestigeCount: prev.prestigeCount + 1,
      clickMultiplier: 1,
      globalMultiplier: 1,
    }));
    setPurchasedUpgrades(new Set());
    setShowPrestigeConfirm(false);
    setCombo(0);
    setActiveEvents([]);

    setTimeout(() => {
      const saveData = {
        ...gameRef.current,
        purchasedUpgradeIds: [],
        achievements: Array.from(unlockedRef.current),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    }, 0);
  }, [getPrestigeSporesGain, game.prestigeUpgrades]);

  // Buy prestige upgrade
  const buyPrestigeUpgrade = useCallback((upgradeId: string) => {
    setGame((prev) => {
      const upgrade = prev.prestigeUpgrades.find((u) => u.id === upgradeId);
      if (!upgrade || upgrade.level >= upgrade.maxLevel) return prev;
      const cost = upgrade.cost * (upgrade.level + 1);
      if (prev.spores < cost) return prev;

      const newUpgrades = prev.prestigeUpgrades.map((u) =>
        u.id === upgradeId ? { ...u, level: u.level + 1 } : u
      );

      return {
        ...prev,
        spores: prev.spores - cost,
        prestigeUpgrades: newUpgrades,
      };
    });
  }, []);

  const mps = calculateMPS();
  const clickPower = getClickPower();
  const prestigeGain = getPrestigeSporesGain();
  const comboMulti = 1 + combo * 0.1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-emerald-950 text-white font-sans relative overflow-hidden">
      {/* Golden mushrooms floating */}
      {goldenMushrooms.map((golden) => (
        <button
          key={golden.id}
          onClick={() => handleGoldenClick(golden)}
          className="absolute z-40 text-5xl cursor-pointer animate-bounce hover:scale-125 transition-transform drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]"
          style={{
            left: `${golden.x}%`,
            top: `${golden.y}%`,
            animation: 'goldenFloat 3s ease-in-out infinite, goldenGlow 1s ease-in-out infinite alternate',
          }}
        >
          🌟
        </button>
      ))}

      {/* Notification */}
      {notification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-yellow-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-2xl font-bold animate-bounce max-w-sm text-center">
          {notification}
        </div>
      )}

      {/* Active events display */}
      {activeEvents.length > 0 && (
        <div className="fixed top-16 right-4 z-30 space-y-1">
          {activeEvents.filter(ae => ae.endsAt > Date.now()).map((ae, i) => {
            const remaining = Math.ceil((ae.endsAt - Date.now()) / 1000);
            return (
              <div key={i} className="bg-purple-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-purple-500/50 text-sm font-bold animate-pulse">
                {ae.event.emoji} {ae.event.name} ({remaining}с)
              </div>
            );
          })}
        </div>
      )}

      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-green-700/50 p-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-green-300">🍄 Грибная Империя</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="text-center">
              <div className="text-green-400 text-xs">Грибы</div>
              <div className="font-bold text-lg">{formatNumber(game.mushrooms)}</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 text-xs">В секунду</div>
              <div className="font-bold text-lg">{formatNumber(mps)}/с</div>
            </div>
            <div className="text-center">
              <div className="text-purple-400 text-xs">Споры</div>
              <div className="font-bold text-lg text-purple-300">{formatNumber(game.spores)}</div>
            </div>
            {game.prestigeCount > 0 && (
              <div className="text-center">
                <div className="text-yellow-400 text-xs">Престижей</div>
                <div className="font-bold text-lg text-yellow-300">{game.prestigeCount}</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left panel - Mushroom click area */}
        <div className="lg:col-span-1">
          <div className="bg-black/20 rounded-xl p-6 border border-green-700/30 backdrop-blur-sm">
            {/* Combo display */}
            {combo > 0 && (
              <div className={`text-center mb-2 font-bold text-lg transition-all ${
                combo >= 10 ? 'text-red-400 scale-110' : combo >= 5 ? 'text-orange-400' : 'text-yellow-300'
              }`}>
                🔥 КОМБО ×{combo} (+{Math.round((comboMulti - 1) * 100)}% к клику)
              </div>
            )}
            
            {/* Mushroom button */}
            <div className="relative flex justify-center items-center mb-6">
              <button
                onClick={handleMushroomClick}
                className="relative select-none transition-transform duration-100 cursor-pointer"
                style={{ transform: `scale(${mushroomScale})` }}
              >
                <div className="text-8xl md:text-9xl drop-shadow-2xl hover:drop-shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all mushroom-glow">
                  🍄
                </div>
                {/* Click effects */}
                {clickEffects.map((effect) => (
                  <div
                    key={effect.id}
                    className={`absolute pointer-events-none font-bold text-lg ${effect.color || 'text-yellow-300'}`}
                    style={{
                      left: effect.x,
                      top: effect.y,
                      animation: 'floatUp 1s ease-out forwards',
                    }}
                  >
                    +{formatNumber(effect.value)}
                  </div>
                ))}
              </button>
            </div>

            {/* Stats */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-400">Сила клика:</span>
                <span className="font-bold">{formatNumber(clickPower)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">Всего собрано:</span>
                <span className="font-bold">{formatNumber(game.totalMushroomsAllTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">Множитель:</span>
                <span className="font-bold">×{getProductionMultiplier().toFixed(2)}</span>
              </div>
              {getAutoClicks() > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-400">Автокликов:</span>
                  <span className="font-bold">{getAutoClicks()}/с</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-green-400">Достижений:</span>
                <span className="font-bold">{unlockedAchievements.size}/{ACHIEVEMENTS.length}</span>
              </div>
            </div>

            {/* Prestige button */}
            <div className="mt-6 pt-4 border-t border-purple-700/30">
              <button
                onClick={() => setShowPrestigeConfirm(true)}
                disabled={prestigeGain <= 0}
                className={`w-full py-3 px-4 rounded-lg font-bold transition-all ${
                  prestigeGain > 0
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/50 hover:shadow-purple-700/70 hover:scale-105'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                🌀 Престиж {prestigeGain > 0 && `(+${formatNumber(prestigeGain)} спор)`}
              </button>
              {prestigeGain <= 0 && (
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Нужно 1M+ грибов за забег для престижа
                </p>
              )}
            </div>

            {/* Milestone info */}
            <div className="mt-4 pt-4 border-t border-green-700/20">
              <p className="text-xs text-green-500 mb-1">💡 Бонусы за здания (×2 за порог):</p>
              <div className="flex flex-wrap gap-1">
                {BUILDING_MILESTONES.map((m) => (
                  <span key={m} className="text-xs bg-green-900/30 px-2 py-0.5 rounded text-green-400">
                    {m}
                  </span>
                ))}
              </div>
              <p className="text-xs text-yellow-500 mt-2">🌟 Ловите золотые грибы для бонусов!</p>
              <p className="text-xs text-orange-400 mt-1">🔥 Быстрые клики = комбо-множитель!</p>
            </div>
          </div>
        </div>

        {/* Right panel - Tabs */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('buildings')}
              className={`px-4 py-2 rounded-t-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'buildings'
                  ? 'bg-green-700/50 text-green-200 border-b-2 border-green-400'
                  : 'bg-black/20 text-green-400 hover:bg-black/30'
              }`}
            >
              🏗️ Здания
            </button>
            <button
              onClick={() => setActiveTab('upgrades')}
              className={`px-4 py-2 rounded-t-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'upgrades'
                  ? 'bg-green-700/50 text-green-200 border-b-2 border-green-400'
                  : 'bg-black/20 text-green-400 hover:bg-black/30'
              }`}
            >
              ⬆️ Улучшения
            </button>
            <button
              onClick={() => setActiveTab('prestige')}
              className={`px-4 py-2 rounded-t-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'prestige'
                  ? 'bg-purple-700/50 text-purple-200 border-b-2 border-purple-400'
                  : 'bg-black/20 text-purple-400 hover:bg-black/30'
              }`}
            >
              🌀 Престиж
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-4 py-2 rounded-t-lg font-bold transition-all whitespace-nowrap ${
                activeTab === 'achievements'
                  ? 'bg-yellow-700/50 text-yellow-200 border-b-2 border-yellow-400'
                  : 'bg-black/20 text-yellow-400 hover:bg-black/30'
              }`}
            >
              🏆 Достижения
            </button>
          </div>

          {/* Tab content */}
          <div className="bg-black/20 rounded-xl rounded-tl-none p-4 border border-green-700/30 max-h-[70vh] overflow-y-auto backdrop-blur-sm">
            {activeTab === 'buildings' && (
              <div className="space-y-2">
                {game.buildings.map((building) => {
                  if (game.totalMushroomsAllTime < building.unlockAt && building.count === 0) return null;
                  const discount = getDiscount();
                  const cost = getBuildingCost(building, discount);
                  const canAfford = game.mushrooms >= cost;
                  const milestoneMulti = getBuildingMilestoneMultiplier(building.count);
                  const production = building.baseProduction * getProductionMultiplier() * milestoneMulti;
                  const nextMilestone = BUILDING_MILESTONES.find(m => m > building.count);

                  return (
                    <div
                      key={building.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        canAfford
                          ? 'border-green-600/50 bg-green-900/20 hover:bg-green-900/40'
                          : 'border-gray-700/30 bg-black/20 opacity-70'
                      }`}
                    >
                      <div className="text-3xl">{building.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-green-200">{building.name}</span>
                          <span className="text-xs bg-green-800/50 px-2 py-0.5 rounded-full">
                            ×{building.count}
                          </span>
                          {milestoneMulti > 1 && (
                            <span className="text-xs bg-yellow-800/50 px-2 py-0.5 rounded-full text-yellow-300">
                              ×{milestoneMulti} бонус
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-green-400">{building.description}</div>
                        <div className="text-xs text-green-300">
                          +{formatNumber(production)}/с каждое
                          {nextMilestone && (
                            <span className="text-yellow-400 ml-2">
                              (×2 при {nextMilestone})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => buyBuilding(building.id)}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded text-sm font-bold transition-all ${
                            canAfford
                              ? 'bg-green-600 hover:bg-green-500 text-white hover:scale-105'
                              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {formatNumber(cost)} 🍄
                        </button>
                        <button
                          onClick={() => buyBuilding10(building.id)}
                          disabled={game.mushrooms < cost * 5}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                            game.mushrooms >= cost * 5
                              ? 'bg-green-700 hover:bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          ×10
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'upgrades' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-yellow-300 mb-2">👆 Улучшения клика</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clickUpgrades.map((upgrade) => {
                      if (purchasedUpgrades.has(upgrade.id)) return null;
                      if (game.totalMushroomsAllTime < upgrade.unlockAt) return null;
                      const canAfford = game.mushrooms >= upgrade.cost;
                      return (
                        <button
                          key={upgrade.id}
                          onClick={() => buyClickUpgrade(upgrade)}
                          disabled={!canAfford}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            canAfford
                              ? 'border-yellow-600/50 bg-yellow-900/20 hover:bg-yellow-900/40 hover:scale-[1.02]'
                              : 'border-gray-700/30 bg-black/20 opacity-70 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{upgrade.emoji}</span>
                            <div>
                              <div className="font-bold text-yellow-200 text-sm">{upgrade.name}</div>
                              <div className="text-xs text-yellow-400">+{formatNumber(upgrade.power)} к клику</div>
                              <div className="text-xs text-yellow-300 font-bold">{formatNumber(upgrade.cost)} 🍄</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {clickUpgrades.every((u) => purchasedUpgrades.has(u.id)) && (
                    <p className="text-green-400 text-sm mt-2">✅ Все улучшения клика куплены!</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-blue-300 mb-2">📈 Множители</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {multiUpgrades.map((upgrade) => {
                      if (purchasedUpgrades.has(upgrade.id)) return null;
                      if (game.totalMushroomsAllTime < upgrade.unlockAt) return null;
                      const canAfford = game.mushrooms >= upgrade.cost;
                      return (
                        <button
                          key={upgrade.id}
                          onClick={() => buyMultiUpgrade(upgrade)}
                          disabled={!canAfford}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            canAfford
                              ? 'border-blue-600/50 bg-blue-900/20 hover:bg-blue-900/40 hover:scale-[1.02]'
                              : 'border-gray-700/30 bg-black/20 opacity-70 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{upgrade.emoji}</span>
                            <div>
                              <div className="font-bold text-blue-200 text-sm">{upgrade.name}</div>
                              <div className="text-xs text-blue-400">×{upgrade.multi} ко всему производству</div>
                              <div className="text-xs text-blue-300 font-bold">{formatNumber(upgrade.cost)} 🍄</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {multiUpgrades.every((u) => purchasedUpgrades.has(u.id)) && (
                    <p className="text-green-400 text-sm mt-2">✅ Все множители куплены!</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'prestige' && (
              <div className="space-y-4">
                <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700/30">
                  <h3 className="text-lg font-bold text-purple-200 mb-2">🌀 Система Престижа</h3>
                  <p className="text-sm text-purple-300 mb-2">
                    Сбросьте прогресс, чтобы получить <span className="font-bold text-purple-200">Споры</span> — 
                    специальную валюту для постоянных улучшений.
                  </p>
                  <p className="text-sm text-purple-300 mb-2">
                    Количество получаемых спор зависит от общего количества собранных грибов за текущий забег.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-purple-400">Всего спор:</span>{' '}
                      <span className="font-bold text-purple-200">{formatNumber(game.totalSpores)}</span>
                    </div>
                    <div>
                      <span className="text-purple-400">Престижей:</span>{' '}
                      <span className="font-bold text-purple-200">{game.prestigeCount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-purple-300 mb-2">✨ Улучшения за споры</h3>
                  <div className="space-y-2">
                    {game.prestigeUpgrades.map((upgrade) => {
                      const cost = upgrade.cost * (upgrade.level + 1);
                      const canAfford = game.spores >= cost;
                      const maxed = upgrade.level >= upgrade.maxLevel;
                      return (
                        <div
                          key={upgrade.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            maxed
                              ? 'border-yellow-600/50 bg-yellow-900/20'
                              : canAfford
                              ? 'border-purple-600/50 bg-purple-900/20 hover:bg-purple-900/40'
                              : 'border-gray-700/30 bg-black/20 opacity-70'
                          }`}
                        >
                          <div className="text-3xl">{upgrade.emoji}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-purple-200">{upgrade.name}</span>
                              <span className="text-xs bg-purple-800/50 px-2 py-0.5 rounded-full">
                                Ур. {upgrade.level}/{upgrade.maxLevel}
                              </span>
                            </div>
                            <div className="text-xs text-purple-400">{upgrade.description}</div>
                            {/* Progress bar */}
                            <div className="mt-1 h-1.5 bg-purple-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                                style={{ width: `${(upgrade.level / upgrade.maxLevel) * 100}%` }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => buyPrestigeUpgrade(upgrade.id)}
                            disabled={!canAfford || maxed}
                            className={`px-3 py-2 rounded font-bold text-sm transition-all ${
                              maxed
                                ? 'bg-yellow-700 text-yellow-200 cursor-default'
                                : canAfford
                                ? 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {maxed ? 'МАКС' : `${cost} 🌀`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-yellow-300 mb-2">
                  🏆 Достижения ({unlockedAchievements.size}/{ACHIEVEMENTS.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACHIEVEMENTS.map((achievement) => {
                    const unlocked = unlockedAchievements.has(achievement.id);
                    return (
                      <div
                        key={achievement.id}
                        className={`p-3 rounded-lg border transition-all ${
                          unlocked
                            ? 'border-yellow-600/50 bg-yellow-900/20'
                            : 'border-gray-700/30 bg-black/20 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>
                            {unlocked ? achievement.emoji : '🔒'}
                          </span>
                          <div>
                            <div className={`font-bold text-sm ${unlocked ? 'text-yellow-200' : 'text-gray-400'}`}>
                              {achievement.name}
                            </div>
                            <div className="text-xs text-gray-400">{achievement.desc}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prestige confirmation modal */}
      {showPrestigeConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-purple-900 to-purple-950 rounded-xl p-6 max-w-md w-full border border-purple-600/50 shadow-2xl">
            <h2 className="text-2xl font-bold text-purple-200 mb-4">🌀 Подтвердить Престиж?</h2>
            <p className="text-purple-300 mb-4">
              Весь ваш прогресс будет сброшен, но вы получите:
            </p>
            <div className="bg-purple-800/30 rounded-lg p-4 mb-4 text-center">
              <div className="text-3xl font-bold text-purple-200">+{formatNumber(prestigeGain)} 🌀</div>
              <div className="text-sm text-purple-400">спор</div>
            </div>
            <p className="text-sm text-red-300 mb-4">
              ⚠️ Все здания, улучшения и грибы будут сброшены! Достижения сохраняются.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPrestigeConfirm(false)}
                className="flex-1 py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 font-bold transition-all"
              >
                Отмена
              </button>
              <button
                onClick={doPrestige}
                className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold transition-all hover:scale-105"
              >
                Престиж!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-80px) scale(1.5); }
        }
        @keyframes goldenFloat {
          0%, 100% { transform: translateY(0px) rotate(-5deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes goldenGlow {
          0% { filter: drop-shadow(0 0 10px rgba(255,215,0,0.5)); }
          100% { filter: drop-shadow(0 0 25px rgba(255,215,0,1)); }
        }
      `}</style>
    </div>
  );
}
