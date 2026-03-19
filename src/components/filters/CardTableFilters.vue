<template>
  <el-collapse v-model="expandedSections" class="card-table-filters">
    <!-- Text Search Filters -->
    <el-collapse-item title="Text Search" name="textSearch">
      <el-row :gutter="10">
        <el-col :span="12" :xs="24">
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
        </el-col>
        <el-col :span="12" :xs="24">
          <label class="filter-label">Oracle Text</label>
          <el-input
            v-model="filters.oracleText"
            placeholder="Search oracle text..."
            clearable
            @clear="emitFilters"
            @change="emitFilters"
          />
        </el-col>
      </el-row>
    </el-collapse-item>

    <!-- Cube Membership -->
    <el-collapse-item title="Cubes" name="cubes">
      <div class="filter-checkboxes">
        <TristateCheckbox
          v-for="cube in availableCubes"
          :key="cube.value"
          :modelValue="getTristateValue(filters.cubes, cube.value)"
          @update:modelValue="setTristateValue(filters.cubes, cube.value, $event)"
        >
          {{ cube.label }}
        </TristateCheckbox>
      </div>
    </el-collapse-item>

    <!-- Colors -->
    <el-collapse-item title="Colors" name="colors">
      <div class="filter-subsection">
        <label class="filter-label">Color Identity</label>
        <div class="filter-checkboxes">
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
      </div>
      <div class="filter-subsection">
        <el-checkbox v-model="filters.colorsExactMatch" @change="emitFilters">Exact match (all selected colors, no others)</el-checkbox>
      </div>
    </el-collapse-item>

    <!-- Mana Value -->
    <el-collapse-item title="Mana Value" name="manaValue">
      <el-row :gutter="10">
        <el-col :span="8" :xs="12">
          <label class="filter-label">Comparison</label>
          <el-select v-model="filters.cmcComparison" @change="emitFilters" style="width: 100%;">
            <el-option label="Any" value="" />
            <el-option label="=" value="eq" />
            <el-option label="≠" value="neq" />
            <el-option label="<" value="lt" />
            <el-option label="≤" value="lte" />
            <el-option label=">" value="gt" />
            <el-option label="≥" value="gte" />
          </el-select>
        </el-col>
        <el-col :span="8" :xs="12">
          <label class="filter-label">Value</label>
          <el-input-number
            v-model="filters.cmcValue"
            :min="0"
            :max="20"
            :step="1"
            :disabled="!filters.cmcComparison"
            @change="emitFilters"
            style="width: 100%;"
          />
        </el-col>
      </el-row>
    </el-collapse-item>

    <!-- Type Line -->
    <el-collapse-item title="Type Line" name="typeLine">
      <div class="filter-checkboxes">
        <TristateCheckbox
          v-for="type in typeOptions"
          :key="type.value"
          :modelValue="getTristateValue(filters.types, type.value)"
          @update:modelValue="setTristateValue(filters.types, type.value, $event)"
        >
          {{ type.label }}
        </TristateCheckbox>
      </div>
    </el-collapse-item>

    <!-- Rarity -->
    <el-collapse-item title="Min Rarity" name="rarity">
      <el-row :gutter="10">
        <el-col :span="8" :xs="12">
          <label class="filter-label">Comparison</label>
          <el-select v-model="filters.rarityComparison" @change="emitFilters" style="width: 100%;">
            <el-option label="Any" value="" />
            <el-option label="=" value="eq" />
            <el-option label="≠" value="neq" />
            <el-option label="<" value="lt" />
            <el-option label="≤" value="lte" />
            <el-option label=">" value="gt" />
            <el-option label="≥" value="gte" />
          </el-select>
        </el-col>
        <el-col :span="8" :xs="12">
          <label class="filter-label">Rarity</label>
          <el-select v-model="filters.rarityValue" :disabled="!filters.rarityComparison" @change="emitFilters" style="width: 100%;">
            <el-option label="Common" value="common" />
            <el-option label="Uncommon" value="uncommon" />
            <el-option label="Rare" value="rare" />
            <el-option label="Mythic" value="mythic" />
          </el-select>
        </el-col>
      </el-row>
    </el-collapse-item>

    <!-- Tags -->
    <el-collapse-item title="Tags" name="tags">
      <div class="filter-checkboxes">
        <TristateCheckbox
          v-for="tag in tagOptions"
          :key="tag.value"
          :modelValue="getTristateValue(filters.tags, tag.value)"
          @update:modelValue="setTristateValue(filters.tags, tag.value, $event)"
        >
          {{ tag.label }}
        </TristateCheckbox>
      </div>
    </el-collapse-item>

    <!-- Set / Release -->
    <el-collapse-item title="Set / Release" name="setRelease">
      <el-row :gutter="10">
        <el-col :span="12" :xs="24">
          <label class="filter-label">Set Code</label>
          <el-select
            v-model="filters.setCodes"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            clearable
            placeholder="Filter by set..."
            @change="emitFilters"
            style="width: 100%;"
          >
            <el-option
              v-for="set in availableSets"
              :key="set"
              :label="set"
              :value="set"
            />
          </el-select>
        </el-col>
        <el-col :span="12" :xs="24">
          <label class="filter-label">Set Type</label>
          <el-select
            v-model="filters.setTypes"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            clearable
            placeholder="Filter by set type..."
            @change="emitFilters"
            style="width: 100%;"
          >
            <el-option
              v-for="st in availableSetTypes"
              :key="st"
              :label="st"
              :value="st"
            />
          </el-select>
        </el-col>
      </el-row>
      <el-row :gutter="10" style="margin-top: 10px;">
        <el-col :span="8" :xs="12">
          <label class="filter-label">Release Year Comparison</label>
          <el-select v-model="filters.releaseYearComparison" @change="emitFilters" style="width: 100%;">
            <el-option label="Any" value="" />
            <el-option label="=" value="eq" />
            <el-option label="≠" value="neq" />
            <el-option label="<" value="lt" />
            <el-option label="≤" value="lte" />
            <el-option label=">" value="gt" />
            <el-option label="≥" value="gte" />
          </el-select>
        </el-col>
        <el-col :span="8" :xs="12">
          <label class="filter-label">Year</label>
          <el-input-number
            v-model="filters.releaseYearValue"
            :min="1993"
            :max="2030"
            :step="1"
            :disabled="!filters.releaseYearComparison"
            @change="emitFilters"
            style="width: 100%;"
          />
        </el-col>
      </el-row>
    </el-collapse-item>

    <!-- Price -->
    <el-collapse-item title="Price" name="price">
      <el-row :gutter="10">
        <el-col :span="6" :xs="12">
          <label class="filter-label">USD Comparison</label>
          <el-select v-model="filters.priceUsdComparison" @change="emitFilters" style="width: 100%;">
            <el-option label="Any" value="" />
            <el-option label="<" value="lt" />
            <el-option label="≤" value="lte" />
            <el-option label=">" value="gt" />
            <el-option label="≥" value="gte" />
          </el-select>
        </el-col>
        <el-col :span="6" :xs="12">
          <label class="filter-label">USD Value</label>
          <el-input-number
            v-model="filters.priceUsdValue"
            :min="0"
            :precision="2"
            :step="1"
            :disabled="!filters.priceUsdComparison"
            @change="emitFilters"
            style="width: 100%;"
          />
        </el-col>
        <el-col :span="6" :xs="12">
          <label class="filter-label">Tix Comparison</label>
          <el-select v-model="filters.priceTixComparison" @change="emitFilters" style="width: 100%;">
            <el-option label="Any" value="" />
            <el-option label="<" value="lt" />
            <el-option label="≤" value="lte" />
            <el-option label=">" value="gt" />
            <el-option label="≥" value="gte" />
          </el-select>
        </el-col>
        <el-col :span="6" :xs="12">
          <label class="filter-label">Tix Value</label>
          <el-input-number
            v-model="filters.priceTixValue"
            :min="0"
            :precision="2"
            :step="0.5"
            :disabled="!filters.priceTixComparison"
            @change="emitFilters"
            style="width: 100%;"
          />
        </el-col>
      </el-row>
    </el-collapse-item>

    <!-- Card Characteristics -->
    <el-collapse-item title="Characteristics" name="characteristics">
      <el-row :gutter="10">
        <el-col :span="12" :xs="24">
          <label class="filter-label">Layout</label>
          <el-select
            v-model="filters.layouts"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            clearable
            placeholder="Filter by layout..."
            @change="emitFilters"
            style="width: 100%;"
          >
            <el-option
              v-for="l in availableLayouts"
              :key="l"
              :label="l"
              :value="l"
            />
          </el-select>
        </el-col>
        <el-col :span="12" :xs="24">
          <label class="filter-label">Legality</label>
          <el-select
            v-model="filters.legality"
            clearable
            placeholder="Legal in..."
            @change="emitFilters"
            style="width: 100%;"
          >
            <el-option label="Standard" value="standard" />
            <el-option label="Pioneer" value="pioneer" />
            <el-option label="Modern" value="modern" />
            <el-option label="Legacy" value="legacy" />
            <el-option label="Vintage" value="vintage" />
          </el-select>
        </el-col>
      </el-row>
      <div class="filter-checkboxes" style="margin-top: 10px;">
        <TristateCheckbox
          v-model="filters.isUniversesBeyond"
          @update:modelValue="emitFilters"
        >
          Universes Beyond
        </TristateCheckbox>
        <TristateCheckbox
          v-model="filters.isSupplementalProduct"
          @update:modelValue="emitFilters"
        >
          Supplemental Product
        </TristateCheckbox>
        <TristateCheckbox
          v-model="filters.makesTokens"
          @update:modelValue="emitFilters"
        >
          Makes Tokens
        </TristateCheckbox>
      </div>
      <el-row :gutter="10" style="margin-top: 10px;">
        <el-col :span="6" :xs="12">
          <label class="filter-label">Word Count Comparison</label>
          <el-select v-model="filters.wordCountComparison" @change="emitFilters" style="width: 100%;">
            <el-option label="Any" value="" />
            <el-option label="=" value="eq" />
            <el-option label="<" value="lt" />
            <el-option label="≤" value="lte" />
            <el-option label=">" value="gt" />
            <el-option label="≥" value="gte" />
          </el-select>
        </el-col>
        <el-col :span="6" :xs="12">
          <label class="filter-label">Word Count</label>
          <el-input-number
            v-model="filters.wordCountValue"
            :min="0"
            :step="1"
            :disabled="!filters.wordCountComparison"
            @change="emitFilters"
            style="width: 100%;"
          />
        </el-col>
      </el-row>
    </el-collapse-item>

    <!-- Games -->
    <el-collapse-item title="Games" name="games">
      <div class="filter-checkboxes">
        <TristateCheckbox
          v-for="game in gameOptions"
          :key="game.value"
          :modelValue="getTristateValue(filters.games, game.value)"
          @update:modelValue="setTristateValue(filters.games, game.value, $event)"
        >
          {{ game.label }}
        </TristateCheckbox>
      </div>
    </el-collapse-item>

    <!-- Keywords -->
    <el-collapse-item title="Keywords" name="keywords">
      <el-select
        v-model="filters.keywords"
        multiple
        filterable
        collapse-tags
        collapse-tags-tooltip
        clearable
        placeholder="Filter by keyword..."
        @change="emitFilters"
        style="width: 100%;"
      >
        <el-option
          v-for="kw in availableKeywords"
          :key="kw"
          :label="kw"
          :value="kw"
        />
      </el-select>
    </el-collapse-item>
  </el-collapse>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { Search } from '@element-plus/icons-vue';
import TristateCheckbox from './TristateCheckbox.vue';

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
    setCodes: [] as string[],
    setTypes: [] as string[],
    releaseYearComparison: '',
    releaseYearValue: 2025,
    priceUsdComparison: '',
    priceUsdValue: 0,
    priceTixComparison: '',
    priceTixValue: 0,
    layouts: [] as string[],
    legality: '',
    isUniversesBeyond: null as boolean | null,
    isSupplementalProduct: null as boolean | null,
    makesTokens: null as boolean | null,
    wordCountComparison: '',
    wordCountValue: 0,
    games: {} as Record<string, boolean | null>,
    keywords: [] as string[],
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
    return Array.from(sets).sort();
});

const availableSetTypes = computed(() => {
    const types = new Set<string>();
    allCards.value.forEach((card: any) => {
        if (card.setType) types.add(card.setType);
    });
    return Array.from(types).sort();
});

const availableLayouts = computed(() => {
    const layouts = new Set<string>();
    allCards.value.forEach((card: any) => {
        if (card.layout) layouts.add(card.layout);
    });
    return Array.from(layouts).sort();
});

const availableKeywords = computed(() => {
    const keywords = new Set<string>();
    allCards.value.forEach((card: any) => {
        (card.keywords ?? []).forEach((kw: string) => keywords.add(kw));
    });
    return Array.from(keywords).sort();
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
    filters.setCodes = filters.setCodes.filter(s => validSets.includes(s));

    // Prune set types
    filters.setTypes = filters.setTypes.filter(s => validSetTypes.includes(s));

    // Prune layouts
    filters.layouts = filters.layouts.filter(l => validLayouts.includes(l));

    // Prune keywords
    filters.keywords = filters.keywords.filter(k => validKeywords.includes(k));

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
    filters.setCodes = [];
    filters.setTypes = [];
    filters.releaseYearComparison = '';
    filters.releaseYearValue = 2025;
    filters.priceUsdComparison = '';
    filters.priceUsdValue = 0;
    filters.priceTixComparison = '';
    filters.priceTixValue = 0;
    filters.layouts = [];
    filters.legality = '';
    filters.isUniversesBeyond = null;
    filters.isSupplementalProduct = null;
    filters.makesTokens = null;
    filters.wordCountComparison = '';
    filters.wordCountValue = 0;
    filters.games = {};
    filters.keywords = [];
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
  font-size: 13px;
}

.card-table-filters :deep(.el-collapse-item__content) {
  padding-bottom: 12px;
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

.filter-subsection {
  margin-bottom: 8px;
}
</style>
