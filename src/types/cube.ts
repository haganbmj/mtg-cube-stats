// TypeScript definitions for cube data structures used throughout the application

import type { ScryfallLegality } from './scryfall';

export interface ArchetypeResult {
  name: string;
  description: string;
  color: string;
  threshold: number;
  count: number;
  cards: string[];
  percentage: string;
}

export interface CubeCard {
  // Base properties from CubeCobra API
  printingId: string;
  oracleId: string;
  elo?: number;
  popularity?: number;

  // Enriched properties from Scryfall data
  name?: string;
  cmc?: number;
  colors?: string[];
  colorIdentity?: string[];
  typeLine?: string;
  effectiveTypes?: string[];
  oracleText?: string;
  oracleTextWordCount?: number;
  oracleTextWordCountMinusParen?: number;
  legality?: ScryfallLegality;
  isUniversesBeyond?: boolean;
  rarity?: string;
  minRarity?: string;
  releaseDate?: string;
  releaseYear?: number;
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  isSupplementalProduct?: boolean;
  keywords?: string[];
  games?: string[];
  tags?: string[];
  archetypes?: string[];
  setType?: string;
  layout?: string;
  isNormalLayout?: boolean;
  makesTokens?: boolean;
  tokenOracleIds?: string[];
  minPriceUsd?: number | null;
  minPriceTix?: number | null;
  urlFront?: string;
  urlBack?: string;
}

export interface CubeStats {
  totalCards: number;
  totalUniqueCards: number;
  landCards: number;
  creatureCards: number;
  newCards: number;
  averageElo: number;
  averagePopularity: number;
  blendedRarityScore: number;
  averageNonLandCmc: number;
  cmcByStrictColorIdentity: Record<string, { totalCmc: number; count: number }>;
  colorIdentityDistribution: Record<string, number>;
  colorDistribution: Record<string, number>;
  cmcDistribution: Record<string | number, number>;
  typeLineDistribution: Record<string, number>;
  minimumFormatLegalityDistribution: Record<string, number>;
  releaseYearDistribution: Record<number, number>;
  setCodeDistribution: Record<string, number>;
  rarityDistribution: Record<string, number>;
  minRarityDistribution: Record<string, number>;
  averageWordCount: number;
  averageWordCountUnique: number;
  averageReleaseYear: number;
  averageReleaseYearStdDev: number;
  medianReleaseYear: number;
  medianReleaseYearMAD: number;
  keywords: Record<string, number>;
  totalMinPriceUsd: number;
  totalMinPriceTix: number;
  arenaPlayable: boolean;
  mtgoPlayable: boolean;
  paperPlayable: boolean;
  graveyardOrderMatters: boolean;
  assumedCategories: string[];
  uniqueKeywords: number;
  uniqueNonEvergreenKeywords: number;
  uniqueTokenCount: number;
  cardCounts: {
    removal: number;
    makesTokens: number;
    universesBeyond: number;
    supplementalProduct: number;
    abnormalLayout: number;
    initiative: number;
  };
  archetypes: ArchetypeResult[];
}

export interface Cube {
  // Basic cube metadata from CubeCobra
  id: string;
  shortId?: string;
  name: string;
  owner: string;
  ownerId?: string;
  thumbnail?: string;
  category?: string;
  categoryPrefixes?: string[];
  lastModified?: string;
  followerCount?: number;
  brief?: string;
  fetchedAt?: string;

  // Card data and computed properties
  cards: CubeCard[];
  suffixedCardIds?: string[];
  stats?: CubeStats;
}

export interface UserCollection {
  name: string;
  cubeIds: string[];
}

export interface SimilarityScore {
  cosineSimilarity: number;
  insersectionSize: number;
}

export interface SimilarityMatrix {
  [cubeId: string]: {
    [otherCubeId: string]: SimilarityScore;
  };
}
