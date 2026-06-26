// TypeScript definitions for the minimized Scryfall card data structure

export type PrimaryType = 'Land' | 'Creature' | 'Artifact' | 'Enchantment' | 'Instant' | 'Sorcery' | string;

export interface ScryfallLegality {
  [key: string]: boolean | undefined;
  standard?: boolean;
  pioneer?: boolean;
  modern?: boolean;
  legacy?: boolean;
  vintage?: boolean;
}

export interface ScryfallCard {
  // Basic card information
  setCode: string;
  collectorNumber: string;
  releaseDate: string;
  name: string;
  cmc: number;
  colors: string[];
  colorIdentity: string[];
  typeLine: string;
  effectiveTypes: string[];
  primaryType: PrimaryType;
  oracleText: string;
  oracleTextWordCount: number;
  oracleTextWordCountMinusParen: number;
  keywords: string[];
  games: string[];
  tags: string[];
  archetypes: string[];
  rarity: string;
  setType: string;
  fromBooster: boolean;
  promoTypes: string[];
  layout: string;
  legality: ScryfallLegality;
  urlFront: string;
  urlBack?: string;
  priceUsd?: number;
  priceTix?: number;

  // Computed/aggregated fields
  minPriceUsd?: number;
  minPriceTix?: number;
  rarities: string[];
  minRarity: string;

  // Optional boolean flags (undefined when false for space efficiency)
  isDigital?: boolean;
  isPromo?: boolean;
  isToken?: boolean;
  isHybrid?: boolean;
  isPhyrexian?: boolean;
  isUniversesBeyond?: boolean;
  isSupplementalProduct?: boolean;
  isNormalLayout?: boolean;
  makesTokens?: boolean;
  tokenOracleIds?: string[];

  // Mana cost and related
  manaCost?: string;
  loyalty?: string;
  producedMana?: string[];

  // Combat stats (creatures/vehicles only)
  power?: string;
  toughness?: string;
}

export interface ScryfallToken {
  name: string;
  typeLine: string;
  oracleText: string;
  colors: string[];
  power?: string;
  toughness?: string;
  urlFront: string;
}

export interface ScryfallDataStructure {
  cards: Record<string, ScryfallCard>; // keyed by oracleId
  sets: Record<string, string>; // setCode -> setName
  setDates: Record<string, string>; // setCode -> ISO release date (YYYY-MM-DD)
  tokens: Record<string, ScryfallToken>; // keyed by oracleId
}

// Type for the dynamic import result
export interface ScryfallModule {
  default: ScryfallDataStructure;
}
