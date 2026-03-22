<template>
  <el-collapse v-model="expandedSections" class="card-table-filters" expand-icon-position="left">
    <el-collapse-item name="filters">
      <template #title>
        <div style="display: flex; align-items: center; width: 100%;">
          <span style="flex: 1;">Filters</span>
          <el-button @click.stop="resetFilters">Reset Filters</el-button>
        </div>
      </template>
      <el-row :gutter="20">
        <!-- Column 1: Text Search, Cubes, Colors, Mana Value, Rarity -->
        <el-col :span="8" :xs="24" :sm="12" :md="8">
          <div class="filter-section">
            <h4 class="filter-section-title">Text Search</h4>
            <label class="filter-label">Card Name</label>
            <el-input
              v-model="filters.name"
              placeholder="Search card names..."
              clearable
              @clear="emitFilters"
              @change="emitFilters"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <label class="filter-label">Oracle Text</label>
            <el-input
              v-model="filters.oracleText"
              placeholder="Search oracle text..."
              clearable
              @clear="emitFilters"
              @change="emitFilters"
            >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
            </el-input>
          </div>

          <div class="filter-section">
            <h4 class="filter-section-title">Cubes</h4>
            <TristateSelect
              :modelValue="filters.cubes"
              @update:modelValue="filters.cubes = $event; emitFilters()"
              :options="availableCubes"
              placeholder="Filter by cube..."
            />
            <label class="filter-label">Cube Count</label>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-select v-model="filters.cubeCountComparison" @change="emitFilters" placeholder="Any" style="width: 100%;">
                  <el-option label="Any" value="" />
                  <el-option label="=" value="eq" />
                  <el-option label="≠" value="neq" />
                  <el-option label="<" value="lt" />
                  <el-option label="≤" value="lte" />
                  <el-option label=">" value="gt" />
                  <el-option label="≥" value="gte" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-input-number v-model="filters.cubeCountValue" :min="0" :step="1" :disabled="!filters.cubeCountComparison" @change="emitFilters" style="width: 100%;" />
              </el-col>
            </el-row>
            <label class="filter-label">Total Count</label>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-select v-model="filters.countComparison" @change="emitFilters" placeholder="Any" style="width: 100%;">
                  <el-option label="Any" value="" />
                  <el-option label="=" value="eq" />
                  <el-option label="≠" value="neq" />
                  <el-option label="<" value="lt" />
                  <el-option label="≤" value="lte" />
                  <el-option label=">" value="gt" />
                  <el-option label="≥" value="gte" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-input-number v-model="filters.countValue" :min="0" :step="1" :disabled="!filters.countComparison" @change="emitFilters" style="width: 100%;" />
              </el-col>
            </el-row>
          </div>

          <div class="filter-section">
            <h4 class="filter-section-title">Colors</h4>
            <div class="filter-checkboxes-grid">
              <TristateCheckbox
                v-for="color in colorOptions"
                :key="color.value"
                :modelValue="getTristateValue(filters.colors, color.value)"
                @update:modelValue="setTristateValue(filters.colors, color.value, $event)"
              >
                <i :class="'ms ms-' + color.value.toLowerCase() + ' ms-cost'" style="margin-right: 2px;"></i>
                {{ color.label }}
              </TristateCheckbox>
            </div>
            <el-checkbox v-model="filters.colorsExactMatch" @change="emitFilters" style="margin-top: 4px;">Exact match</el-checkbox>
          </div>

          <div class="filter-section">
            <h4 class="filter-section-title">Mana Value</h4>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-select v-model="filters.cmcComparison" @change="emitFilters" placeholder="Any" style="width: 100%;">
                  <el-option label="Any" value="" />
                  <el-option label="=" value="eq" />
                  <el-option label="≠" value="neq" />
                  <el-option label="<" value="lt" />
                  <el-option label="≤" value="lte" />
                  <el-option label=">" value="gt" />
                  <el-option label="≥" value="gte" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-input-number v-model="filters.cmcValue" :min="0" :max="20" :step="1" :disabled="!filters.cmcComparison" @change="emitFilters" style="width: 100%;" />
              </el-col>
            </el-row>
          </div>

          <div class="filter-section">
            <h4 class="filter-section-title">Minimum Rarity</h4>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-select v-model="filters.rarityComparison" @change="emitFilters" placeholder="Any" style="width: 100%;">
                  <el-option label="Any" value="" />
                  <el-option label="=" value="eq" />
                  <el-option label="≠" value="neq" />
                  <el-option label="<" value="lt" />
                  <el-option label="≤" value="lte" />
                  <el-option label=">" value="gt" />
                  <el-option label="≥" value="gte" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-select v-model="filters.rarityValue" :disabled="!filters.rarityComparison" @change="emitFilters" style="width: 100%;">
                  <el-option label="Common" value="common" />
                  <el-option label="Uncommon" value="uncommon" />
                  <el-option label="Rare" value="rare" />
                  <el-option label="Mythic" value="mythic" />
                </el-select>
              </el-col>
            </el-row>
          </div>
        </el-col>

        <!-- Column 2: Types, Tags, Keywords, Games, Price -->
        <el-col :span="8" :xs="24" :sm="12" :md="8">
          <div class="filter-section">
            <h4 class="filter-section-title">Types</h4>
            <TristateSelect
              :modelValue="filters.types"
              @update:modelValue="filters.types = $event; emitFilters()"
              :options="typeOptions"
              placeholder="Filter by type..."
            />
          </div>

          <div class="filter-section">
            <h4 class="filter-section-title">Tags</h4>
            <TristateSelect
              :modelValue="filters.tags"
              @update:modelValue="filters.tags = $event; emitFilters()"
              :options="tagOptions"
              placeholder="Filter by tag..."
            />
          </div>

          <div class="filter-section">
            <h4 class="filter-section-title">Keywords</h4>
            <TristateSelect
              :modelValue="filters.keywords"
              @update:modelValue="filters.keywords = $event; emitFilters()"
              :options="availableKeywords"
              placeholder="Filter by keyword..."
            />
          </div>

          <div class="filter-section">
            <h4 class="filter-section-title">Games</h4>
            <div class="filter-checkboxes-grid">
              <TristateCheckbox
                v-for="game in gameOptions"
                :key="game.value"
                :modelValue="getTristateValue(filters.games, game.value)"
                @update:modelValue="setTristateValue(filters.games, game.value, $event)"
              >
                {{ game.label }}
              </TristateCheckbox>
            </div>
          </div>

          <div class="filter-section">
            <h4 class="filter-section-title">Minimum Price</h4>
            <label class="filter-label">USD</label>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-select v-model="filters.priceUsdComparison" @change="emitFilters" placeholder="Any" style="width: 100%;">
                  <el-option label="Any" value="" />
                  <el-option label="<" value="lt" />
                  <el-option label="≤" value="lte" />
                  <el-option label=">" value="gt" />
                  <el-option label="≥" value="gte" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-input-number v-model="filters.priceUsdValue" :min="0" :precision="2" :step="1" :disabled="!filters.priceUsdComparison" @change="emitFilters" style="width: 100%;" />
              </el-col>
            </el-row>
            <label class="filter-label">Tix</label>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-select v-model="filters.priceTixComparison" @change="emitFilters" placeholder="Any" style="width: 100%;">
                  <el-option label="Any" value="" />
                  <el-option label="<" value="lt" />
                  <el-option label="≤" value="lte" />
                  <el-option label=">" value="gt" />
                  <el-option label="≥" value="gte" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-input-number v-model="filters.priceTixValue" :min="0" :precision="2" :step="0.5" :disabled="!filters.priceTixComparison" @change="emitFilters" style="width: 100%;" />
              </el-col>
            </el-row>
          </div>
        </el-col>

        <!-- Column 3: Set/Release, Characteristics -->
        <el-col :span="8" :xs="24" :sm="24" :md="8">
          <div class="filter-section">
            <h4 class="filter-section-title">Original Set / Release</h4>
            <div class="filter-checkboxes" style="margin-top: 6px;">
              <TristateCheckbox v-model="filters.isUniversesBeyond" @update:modelValue="emitFilters">Universes Beyond</TristateCheckbox>
              <TristateCheckbox v-model="filters.isSupplementalProduct" @update:modelValue="emitFilters">Supplemental Product</TristateCheckbox>
            </div>
            <label class="filter-label">Set Code</label>
            <TristateSelect
              :modelValue="filters.setCodes"
              @update:modelValue="filters.setCodes = $event; emitFilters()"
              :options="availableSets"
              placeholder="Filter by set..."
            />
            <label class="filter-label">Set Type</label>
            <TristateSelect
              :modelValue="filters.setTypes"
              @update:modelValue="filters.setTypes = $event; emitFilters()"
              :options="availableSetTypes"
              placeholder="Filter by set type..."
            />
            <label class="filter-label">Release Year</label>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-select v-model="filters.releaseYearComparison" @change="emitFilters" placeholder="Any" style="width: 100%;">
                  <el-option label="Any" value="" />
                  <el-option label="=" value="eq" />
                  <el-option label="≠" value="neq" />
                  <el-option label="<" value="lt" />
                  <el-option label="≤" value="lte" />
                  <el-option label=">" value="gt" />
                  <el-option label="≥" value="gte" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-input-number v-model="filters.releaseYearValue" :min="1993" :max="2030" :step="1" :disabled="!filters.releaseYearComparison" @change="emitFilters" style="width: 100%;" />
              </el-col>
            </el-row>
          </div>

          <div class="filter-section">
            <h4 class="filter-section-title">Characteristics</h4>
            <div class="filter-checkboxes-grid" style="margin-top: 6px;">
              <TristateCheckbox v-model="filters.makesTokens" @update:modelValue="emitFilters">Makes Tokens</TristateCheckbox>
            </div>
            <label class="filter-label">Layout</label>
            <TristateSelect
              :modelValue="filters.layouts"
              @update:modelValue="filters.layouts = $event; emitFilters()"
              :options="availableLayouts"
              placeholder="Filter by layout..."
            />
            <label class="filter-label">Legality</label>
            <TristateSelect
              :modelValue="filters.legality"
              @update:modelValue="filters.legality = $event; emitFilters()"
              :options="legalityOptions"
              placeholder="Filter by legality..."
              :filterable="false"
            />
            <label class="filter-label">Word Count</label>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-select v-model="filters.wordCountComparison" @change="emitFilters" placeholder="Any" style="width: 100%;">
                  <el-option label="Any" value="" />
                  <el-option label="=" value="eq" />
                  <el-option label="<" value="lt" />
                  <el-option label="≤" value="lte" />
                  <el-option label=">" value="gt" />
                  <el-option label="≥" value="gte" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-input-number v-model="filters.wordCountValue" :min="0" :step="1" :disabled="!filters.wordCountComparison" @change="emitFilters" style="width: 100%;" />
              </el-col>
            </el-row>
            <label class="filter-label">Elo</label>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-select v-model="filters.eloComparison" @change="emitFilters" placeholder="Any" style="width: 100%;">
                  <el-option label="Any" value="" />
                  <el-option label="=" value="eq" />
                  <el-option label="≠" value="neq" />
                  <el-option label="<" value="lt" />
                  <el-option label="≤" value="lte" />
                  <el-option label=">" value="gt" />
                  <el-option label="≥" value="gte" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-input-number v-model="filters.eloValue" :min="0" :step="50" :disabled="!filters.eloComparison" @change="emitFilters" style="width: 100%;" />
              </el-col>
            </el-row>
            <label class="filter-label">Popularity</label>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-select v-model="filters.popularityComparison" @change="emitFilters" placeholder="Any" style="width: 100%;">
                  <el-option label="Any" value="" />
                  <el-option label="=" value="eq" />
                  <el-option label="≠" value="neq" />
                  <el-option label="<" value="lt" />
                  <el-option label="≤" value="lte" />
                  <el-option label=">" value="gt" />
                  <el-option label="≥" value="gte" />
                </el-select>
              </el-col>
              <el-col :span="12">
                <el-input-number v-model="filters.popularityValue" :min="0" :step="50" :disabled="!filters.popularityComparison" @change="emitFilters" style="width: 100%;" />
              </el-col>
            </el-row>
          </div>
        </el-col>
      </el-row>
    </el-collapse-item>
  </el-collapse>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { Search } from '@element-plus/icons-vue';
import TristateCheckbox from './TristateCheckbox.vue';
import TristateSelect from './TristateSelect.vue';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['update:filters']);

const expandedSections = ref<string[]>([]);

// Filter state
const filters = reactive({
    name: '',
    oracleText: '',
    cubes: {} as Record<string, boolean | null>,
    colors: {} as Record<string, boolean | null>,
    colorsExactMatch: false,
    cmcComparison: '',
    cmcValue: 0,
    types: {} as Record<string, boolean | null>,
    rarityComparison: '',
    rarityValue: 'common',
    tags: {} as Record<string, boolean | null>,
    setCodes: {} as Record<string, boolean | null>,
    setTypes: {} as Record<string, boolean | null>,
    releaseYearComparison: '',
    releaseYearValue: 2025,
    priceUsdComparison: '',
    priceUsdValue: 0,
    priceTixComparison: '',
    priceTixValue: 0,
    layouts: {} as Record<string, boolean | null>,
    legality: {} as Record<string, boolean | null>,
    isUniversesBeyond: null as boolean | null,
    isSupplementalProduct: null as boolean | null,
    makesTokens: null as boolean | null,
    wordCountComparison: '',
    wordCountValue: 0,
    cubeCountComparison: '',
    cubeCountValue: 1,
    countComparison: '',
    countValue: 0,
    eloComparison: '',
    eloValue: 1200,
    popularityComparison: '',
    popularityValue: 1200,
    games: {} as Record<string, boolean | null>,
    keywords: {} as Record<string, boolean | null>,
});

const colorOptions = [
    { label: 'White', value: 'W' },
    { label: 'Blue', value: 'U' },
    { label: 'Black', value: 'B' },
    { label: 'Red', value: 'R' },
    { label: 'Green', value: 'G' },
    { label: 'Colorless', value: 'C' },
];

const typeOptions = [
    { label: 'Land', value: 'Land' },
    { label: 'Creature', value: 'Creature' },
    { label: 'Instant', value: 'Instant' },
    { label: 'Sorcery', value: 'Sorcery' },
    { label: 'Artifact', value: 'Artifact' },
    { label: 'Enchantment', value: 'Enchantment' },
    { label: 'Planeswalker', value: 'Planeswalker' },
    { label: 'Battle', value: 'Battle' },
    { label: 'Legendary', value: 'Legendary' },
    { label: 'Aura', value: 'Aura' },
    { label: 'Equipment', value: 'Equipment' },
    { label: 'Vehicle', value: 'Vehicle' },
    { label: 'Kindred', value: 'Kindred' },
];

const tagOptions = [
    { label: 'Counterspell', value: 'counterspell' },
    { label: 'Draw', value: 'draw' },
    { label: 'Flicker', value: 'flicker' },
    { label: 'Ramp', value: 'ramp' },
    { label: 'Removal', value: 'removal' },
    { label: 'Token', value: 'token' },
    { label: 'Tutor', value: 'tutor' },
];

const gameOptions = [
    { label: 'Paper', value: 'paper' },
    { label: 'MTGO', value: 'mtgo' },
    { label: 'Arena', value: 'arena' },
];

const legalityOptions = [
    { label: 'Standard', value: 'standard' },
    { label: 'Pioneer', value: 'pioneer' },
    { label: 'Modern', value: 'modern' },
    { label: 'Legacy', value: 'legacy' },
    { label: 'Vintage', value: 'vintage' },
];

// Dynamically computed available filter options based on loaded cubes
const allCards = computed(() => {
    const cards = [];
    Object.values(props.loadedCubes).forEach((cube: any) => {
        cube.cards.forEach((card: any) => cards.push(card));
    });
    return cards;
});

const availableCubes = computed(() => {
    return Object.entries(props.loadedCubes).map(([key, cube]: [string, any]) => ({
        label: cube.name,
        value: key,
    })).sort((a, b) => a.label.localeCompare(b.label));
});

const availableSets = computed(() => {
    const sets = new Set<string>();
    allCards.value.forEach((card: any) => {
        if (card.setCode) sets.add(card.setCode.toUpperCase());
    });
    return Array.from(sets).sort().map(s => ({ label: s, value: s }));
});

const availableSetTypes = computed(() => {
    const types = new Set<string>();
    allCards.value.forEach((card: any) => {
        if (card.setType) types.add(card.setType);
    });
    return Array.from(types).sort().map(t => ({ label: t, value: t }));
});

const availableLayouts = computed(() => {
    const layouts = new Set<string>();
    allCards.value.forEach((card: any) => {
        if (card.layout) layouts.add(card.layout);
    });
    return Array.from(layouts).sort().map(l => ({ label: l, value: l }));
});

const availableKeywords = computed(() => {
    const keywords = new Set<string>();
    allCards.value.forEach((card: any) => {
        (card.keywords ?? []).forEach((kw: string) => keywords.add(kw));
    });
    return Array.from(keywords).sort().map(kw => ({ label: kw, value: kw }));
});

// Tristate helpers: null = unset, true = include, false = exclude
const getTristateValue = (map: Record<string, boolean | null>, key: string): boolean | null => {
    return map[key] ?? null;
};

const setTristateValue = (map: Record<string, boolean | null>, key: string, value: boolean | null) => {
    if (value === null) {
        delete map[key];
    } else {
        map[key] = value;
    }
    emitFilters();
};

const emitFilters = () => {
    emit('update:filters', { ...filters });
};

// Re-evaluate filters when loaded cubes change
watch(() => props.loadedCubes, () => {
    const validCubeKeys = new Set(Object.keys(props.loadedCubes));
    const validSets = availableSets.value;
    const validSetTypes = availableSetTypes.value;
    const validLayouts = availableLayouts.value;
    const validKeywords = availableKeywords.value;

    // Prune cube tristate entries for cubes no longer loaded
    for (const key of Object.keys(filters.cubes)) {
        if (!validCubeKeys.has(key)) {
            delete filters.cubes[key];
        }
    }

    // Prune set codes
    const validSetValues = new Set(validSets.map(s => s.value));
    for (const key of Object.keys(filters.setCodes)) {
        if (!validSetValues.has(key)) delete filters.setCodes[key];
    }

    // Prune set types
    const validSetTypeValues = new Set(validSetTypes.map(s => s.value));
    for (const key of Object.keys(filters.setTypes)) {
        if (!validSetTypeValues.has(key)) delete filters.setTypes[key];
    }

    // Prune layouts
    const validLayoutValues = new Set(validLayouts.map(l => l.value));
    for (const key of Object.keys(filters.layouts)) {
        if (!validLayoutValues.has(key)) delete filters.layouts[key];
    }

    // Prune keywords
    const validKeywordValues = new Set(validKeywords.map(k => k.value));
    for (const key of Object.keys(filters.keywords)) {
        if (!validKeywordValues.has(key)) delete filters.keywords[key];
    }

    emitFilters();
}, { deep: true });

const resetFilters = () => {
    filters.name = '';
    filters.oracleText = '';
    filters.cubes = {};
    filters.colors = {};
    filters.colorsExactMatch = false;
    filters.cmcComparison = '';
    filters.cmcValue = 0;
    filters.types = {};
    filters.rarityComparison = '';
    filters.rarityValue = 'common';
    filters.tags = {};
    filters.setCodes = {};
    filters.setTypes = {};
    filters.releaseYearComparison = '';
    filters.releaseYearValue = 2025;
    filters.priceUsdComparison = '';
    filters.priceUsdValue = 0;
    filters.priceTixComparison = '';
    filters.priceTixValue = 0;
    filters.layouts = {};
    filters.legality = {};
    filters.isUniversesBeyond = null;
    filters.isSupplementalProduct = null;
    filters.makesTokens = null;
    filters.wordCountComparison = '';
    filters.wordCountValue = 0;
    filters.cubeCountComparison = '';
    filters.cubeCountValue = 1;
    filters.countComparison = '';
    filters.countValue = 0;
    filters.eloComparison = '';
    filters.eloValue = 1200;
    filters.popularityComparison = '';
    filters.popularityValue = 1200;
    filters.games = {};
    filters.keywords = {};
    emitFilters();
};

defineExpose({ resetFilters });
</script>

<style scoped>
.card-table-filters {
  margin-bottom: 16px;
}

.card-table-filters :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 14px;
}

.card-table-filters :deep(.el-collapse-item__content) {
  padding-bottom: 12px;
}

.filter-section {
  margin-bottom: 12px;
}

.filter-section-title {
  margin: 0 0 6px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-bottom: 4px;
}

.filter-label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
  margin-top: 4px;
}

.filter-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
}

.filter-checkboxes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px 4px;
}

.filter-subsection {
  margin-bottom: 8px;
}
</style>
