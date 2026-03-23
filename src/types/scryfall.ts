// TypeScript definitions for the minimized Scryfall card data structure

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
  isUniversesBeyond?: boolean;
  isSupplementalProduct?: boolean;
  isNormalLayout?: boolean;
  makesTokens?: boolean;
  tokenOracleIds?: string[];
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
  tokens: Record<string, ScryfallToken>; // keyed by oracleId
}

// Type for the dynamic import result
export interface ScryfallModule {
  default: ScryfallDataStructure;
}
