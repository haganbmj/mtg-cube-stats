<template>
    <el-row
        direction="horizontal"
        :gutter="20"
    >
        <el-col :span="12" :xs="24">
            <el-space>
                <el-input
                    v-model="searchInput"
                    @change="onSearchChange"
                    class="responsive-input"
                    placeholder="Search cards..."
                >
                    <template #prefix>
                        <el-icon class="el-input__icon"><search /></el-icon>
                    </template>
                </el-input>

                <el-button @click="resetFilters">Reset Filters</el-button>
                <el-button @click="exportToCsv" type="primary">Export CSV</el-button>
            </el-space>
        </el-col>
        <el-col :span="12" :xs="24" class="filtered-count">
            <el-text tag="i">Filtered to {{ searchedRows.length }} / {{ sortedRows.length }} Cards</el-text>
        </el-col>
    </el-row>

    <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[25, 50, 100, 250]"
        :pager-count="5"
        :layout="paginationLayout"
        :total="searchedRows.length"
    />

    <el-table
        ref="cardSummaryTableRef"
        :data="visibleRows"
        :default-sort="{ prop: 'cubeCount', order: 'descending' }"
        :preserve-expanded-content="false"
        @filter-change="onFilterChange"
        @sort-change="onSortChange"
        style="width: 100%"
        table-layout="auto"
        stripe
    >
        <el-table-column :fixed="!isMobile" width="25" type="expand">
            <template #default="props">
                <el-row class="expanded-content" :gutter="20" justify="space-around">
                    <el-col :span="8" :xs="24" :sm="24" :md="8" :xl="8">
                        <div style="text-align:center">
                            <el-image
                                :src="`${props.row.urlFront}`"
                                fit="contain"
                                :alt="props.row.name"
                                :class="'card-image ' + props.row.setCode?.toLowerCase()"
                            />
                        </div>

                        <el-row justify="center" :gutter="10" class="row-games" style="margin-top: 10px; text-align: center;">
                            <el-col :span="24">
                                <div class="tag-list flex gap-2 justify-center">
                                    <el-tag
                                        v-for="game in props.row.games"
                                        :key="game"
                                        size="small"
                                        type="info"
                                        :color="getGameTagColor(game)"
                                        disable-transitions
                                    >
                                        {{ game }}
                                    </el-tag>
                                </div>
                            </el-col>
                        </el-row>

                        <el-row justify="center" :gutter="10" class="row-rarities" style="margin-top: 10px; text-align: center;">
                            <el-col :span="24">
                                <el-text>Original Rarity: {{ capitalizeFirstLetter(props.row.rarity) }}</el-text>
                            </el-col>
                            <el-col :span="24">
                                <el-text>Minimum Rarity: {{ capitalizeFirstLetter(props.row.minRarity) }}</el-text>
                            </el-col>
                        </el-row>
                    </el-col>
                    <el-col :span="16" :xs="24" :sm="24" :md="16" :xl="16">
                        <el-row direction="horizontal">
                            <el-col :span="12" :xs="24" :sm="24" :md="12" :xl="12">
                                <h3>Included In ({{ props.row.cubeCount }}):</h3>
                                <template v-for="cube in expandedCubeList(props.row.cubes)" :key="cube.key">
                                    <div v-if="cube.included">
                                        <el-row direction="horizontal">
                                            <el-col :span="16">
                                                <el-tooltip :content="`Owner: ${cube.owner}`" placement="top" :hide-after="50">
                                                    <el-link :href="`https://cubecobra.com/cube/list/${cube.id}`" target="_blank">{{ cube.name }}</el-link>
                                                </el-tooltip>
                                            </el-col>
                                            <el-col :span="8">
                                                <el-text tag="i">({{ cube.size }} Cards)</el-text>
                                            </el-col>
                                        </el-row>
                                    </div>
                                </template>
                            </el-col>
                            <el-col :span="12" :xs="24" :sm="24" :md="12" :xl="12">
                                <h3>Not Included In ({{ expandedCubeList(props.row.cubes).length - props.row.cubeCount }}):</h3>
                                <template v-for="cube in expandedCubeList(props.row.cubes)" :key="cube.key">
                                    <div v-if="!cube.included">
                                        <el-row direction="horizontal">
                                            <el-col :span="16">
                                                <el-tooltip :content="`Owner: ${cube.owner}`" placement="top" :hide-after="50">
                                                    <el-link :href="`https://cubecobra.com/cube/list/${cube.id}`" target="_blank">{{ cube.name }}</el-link>
                                                </el-tooltip>
                                            </el-col>
                                            <el-col :span="8">
                                                <el-text tag="i">({{ cube.size }} Cards)</el-text>
                                            </el-col>
                                        </el-row>
                                    </div>
                                </template>
                            </el-col>
                        </el-row>
                    </el-col>
                </el-row>
            </template>
        </el-table-column>

        <el-table-column :fixed="!isMobile" prop="index" label="#" width="50" />
        <el-table-column prop="name" label="Name" min-width="150" max-width="300" sortable="custom">
            <template #default="{ row }">
                <el-tooltip
                    placement="right"
                    effect="light"
                    popper-class="card-tooltip"
                >
                    <template #content>
                        <el-image
                                :src="`${row.urlFront}`"
                                fit="contain"
                                :alt="row.name"
                                :class="'card-image ' + row.setCode?.toLowerCase()"
                            />
                    </template>
                    <el-link :href="`https://scryfall.com/card/${row.setCode?.toLowerCase()}/${row.collectorNumber}`" target="_blank">{{ row.name }}</el-link>
                </el-tooltip>
            </template>
        </el-table-column>

        <el-table-column
            prop="cubeCount"
            column-key="cubes"
            label="Cubes"
            min-width="75"
            max-width="100"
            :align="'center'"
            :filters="filterableCubes"
            sortable="custom"
            filterable
        />
        <!-- <el-table-column prop="count" label="Total Count" min-width="75" max-width="100" sortable /> -->

        <!-- <el-table-column prop="colorIdentity" label="Color Identity" min-width="100" max-width="150" show-overflow-tooltip /> -->
        <el-table-column
            prop="effectiveColors"
            column-key="effectiveColors"
            label="Colors"
            min-width="75"
            max-width="100"
            :align="'center'"
            :filters="[
                { text: 'White', value: 'w', },
                { text: 'Blue', value: 'u', },
                { text: 'Black', value: 'b', },
                { text: 'Red', value: 'r', },
                { text: 'Green', value: 'g', },
                { text: 'Colorless', value: 'c', }
            ]"
            filterable
        >
            <template #default="{ row }">
                <i
                    v-for="color in row.effectiveColors"
                    :key="color"
                    :class="'ms ms-' + color.toLowerCase() + ' ms-cost'"
                    style="margin-right: 4px;"
                ></i>
            </template>
        </el-table-column>
        <el-table-column
            prop="cmc"
            column-key="cmc"
            label="MV"
            min-width="75"
            max-width="100"
            :filters="filterableManaValues"
            :align="'center'"
            sortable="custom"
            filterable
        />
        <el-table-column
            prop="typeLine"
            column-key="typeLine"
            label="Type Line"
            min-width="175"
            max-width="350"
            :filters="[
                { text: 'Land', value: 'Land' },
                { text: 'Creature', value: 'Creature' },
                { text: 'Instant', value: 'Instant' },
                { text: 'Sorcery', value: 'Sorcery' },
                { text: 'Artifact', value: 'Artifact' },
                { text: 'Enchantment', value: 'Enchantment' },
                { text: 'Planeswalker', value: 'Planeswalker' },
                { text: 'Battle', value: 'Battle' },

                { text: 'Legendary', value: 'Legendary' },
                { text: 'Aura', value: 'Aura' },
                { text: 'Equipment', value: 'Equipment' },
                { text: 'Vehicle', value: 'Vehicle' },
                { text: 'Lesson', value: 'Lesson' },
                { text: 'Kindred', value: 'Kindred' },
                { text: 'Conspiracy', value: 'Conspiracy' },
            ]"
            :filter-multiple="true"
            show-overflow-tooltip
            sortable="custom"
            filterable
        />

        <!-- FIXME: I really really really need tri-state checkboxes in filters... -->
        <el-table-column
            prop="tags"
            column-key="tags"
            label="Tags"
            min-width="75"
            max-width="250"
            :filters="tags"
            filterable
        >
            <template #default="{ row }">
                <div class="tag-list flex gap-2">
                    <el-tag
                        v-for="tag in row.tags"
                        :key="tag"
                        size="small"
                        type="info"
                        :color="getTagColor(tag)"
                        disable-transitions
                    >
                        {{ tag }}
                    </el-tag>
                </div>
            </template>
        </el-table-column>

        <!-- I don't like the look of this, I think I would need a way to condense it if anything. -->
        <!-- Entirely possible that this is just better suited inside the expanded content, and then the filters are external to the table. -->
        <el-table-column v-if="false"
            prop="games"
            column-key="games"
            label="Games"
            min-width="75"
            max-width="150"
            :filters="games"
            filterable
        >
            <template #default="{ row }">
                <div class="tag-list flex gap-2">
                    <el-tag
                        v-for="game in row.games"
                        :key="game"
                        size="small"
                        type="info"
                        :color="getGameTagColor(game)"
                        disable-transitions
                    >
                        {{ game }}
                    </el-tag>
                </div>
            </template>
        </el-table-column>

        <el-table-column
            prop="minRarity"
            column-key="minRarity"
            label="Min Rarity"
            min-width="75"
            max-width="100"
            :filters="[
                { text: 'Common', value: 'common' },
                { text: 'Uncommon', value: 'uncommon' },
                { text: 'Rare', value: 'rare' },
                { text: 'Mythic', value: 'mythic' },
            ]"
            sortable="custom"
            filterable
        />

        <el-table-column
            prop="setCode"
            column-key="setCode"
            label="Set"
            min-width="75"
            max-width="100"
            :filters="filterableSets.map(set => ({ text: set, value: set }))"
            filter-class-name="set-filter"
            sortable="custom"
            filterable
        />
        <el-table-column
            prop="releaseDate"
            column-key="releaseDate"
            label="Release Date"
            min-width="100"
            max-width="150"
            :filters="filterableYears"
            sortable="custom"
            filterable
        />
        <el-table-column
            prop="minPriceUsd"
            label="Min Price (USD)"
            min-width="75" max-width="100"
            :formatter="(row) => row.minPriceUsd ? `$${row.minPriceUsd.toFixed(2)}` : 'N/A'"
            sortable="custom"
        />

        <!-- <el-table-column prop="rarity" label="Rarity" min-width="75" max-width="100" sortable /> -->
        <!-- <el-table-column prop="oracleTextWordCount" label="Word Count" min-width="75" max-width="100" sortable /> -->
        <!-- <el-table-column prop="isUniversesBeyond" label="Universes Beyond" min-width="50" max-width="75" sortable /> -->
        <!-- <el-table-column prop="isSupplementalProduct" label="Supplemental Product" min-width="50" max-width="75" sortable /> -->
    </el-table>

    <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[25, 50, 100, 250]"
        :pager-count="5"
        :layout="paginationLayout"
        :total="searchedRows.length"
    />
</template>

<script setup lang="ts">
import { TableInstance } from 'element-plus';
import type { SortBy } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { ref, computed } from 'vue';
import { capitalizeFirstLetter } from '../util/HelperFunctions.mjs';

const props = defineProps({
    loadedCubes: {
        type: Object,
        required: true,
    },
});

const cardSummaryTableRef = ref<TableInstance>();
const currentPage = ref(1);
const pageSize = ref(50);
const searchInput = ref('');
const activeFilters = ref({});
const activeSort = ref<SortBy | null>({ prop: 'cubeCount', order: 'descending' });

const isMobile = computed(() => {
  return screen.width <= 760;
});

const paginationLayout = computed(() => {
    return isMobile.value ? 'prev, pager, next' : '->, prev, pager, next, sizes';
});

const tags = [
    { text: 'counterspell', value: 'counterspell', color: 'rgba(20, 155, 226, 0.3)' },
    { text: 'draw', value: 'draw', color: 'rgba(30, 144, 255, 0.3)' },
    { text: 'flicker', value: 'flicker', color: 'rgba(255, 140, 0, 0.3)' },
    { text: 'ramp', value: 'ramp', color: 'rgba(60, 179, 113, 0.3)' },
    { text: 'removal', value: 'removal', color: 'rgba(255, 99, 71, 0.3)' },
    { text: 'token', value: 'token', color: 'rgba(255, 215, 0, 0.3)' },
    { text: 'tutor', value: 'tutor', color: 'rgba(153, 102, 255, 0.3)' },
];

const games = [
    { text: 'paper', value: 'paper', color: 'rgba(34, 139, 34, 0.3)' },
    { text: 'mtgo', value: 'mtgo', color: 'rgba(70, 130, 180, 0.3)' },
    { text: 'arena', value: 'arena', color: 'rgba(218, 112, 214, 0.3)' },
];

const getTagColor = (tag: string) => {
    return tags.find(t => t.value.toLowerCase() === tag.toLowerCase())?.color ?? 'rgba(200, 200, 200, 0.3)';
};

const getGameTagColor = (game: string) => {
    return games.find(g => g.value.toLowerCase() === game.toLowerCase())?.color ?? 'rgba(200, 200, 200, 0.3)';
}

const expandedCubeList = (cubeKeys: string[]) => {
    const resp = Object.entries(props.loadedCubes).map(([key, cube]) => {
        return {
            id: cube.id,
            key: key,
            name: cube.name,
            owner: cube.owner,
            size: cube.cards.length,
            included: cubeKeys.includes(key),
        }
    });

    return resp.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });
};

const filterableManaValues = computed(() => {
    const cmcs = new Set<number>();
    Object.values(props.loadedCubes).forEach((cube: any) => {
        cube.cards.forEach((card: any) => {
            if (card.cmc !== undefined && card.cmc !== null) {
                cmcs.add(card.cmc);
            }
        });
    });
    return Array.from(cmcs).sort((a, b) => a - b).map(cmc => { return { text: cmc.toString(), value: cmc.toString() }; });
});

const filterableSets = computed(() => {
    const sets = new Set<string>();
    Object.values(props.loadedCubes).forEach((cube: any) => {
        cube.cards.forEach((card: any) => {
            if (card.setCode) {
                sets.add(card.setCode.toUpperCase());
            }
        });
    });
    return Array.from(sets).sort();
});

const filterableYears = computed(() => {
    const years = new Set<number>();
    Object.values(props.loadedCubes).forEach((cube: any) => {
        cube.cards.forEach((card: any) => {
            if (card.releaseYear) {
                years.add(card.releaseYear);
            }
        });
    });
    return Array.from(years).sort((a, b) => b - a).map(year => { return { text: year.toString(), value: year.toString() }; });
});

const filterableCubes = computed(() => {
    return Object.entries(props.loadedCubes).map(([key, v]) => {
        return { text: v.name, value: key };
    }).sort((a, b) => {
        if (a.text < b.text) return -1;
        if (a.text > b.text) return 1;
        return 0;
    });
});

const onFilterChange = (filters: Record<string, string[]>) => {
    activeFilters.value = {
        ...activeFilters.value,
        ...filters,
    };
    currentPage.value = 1;
};

const onSortChange = (sortInfo: SortBy) => {
    activeSort.value = sortInfo;
    currentPage.value = 1;
};

const onSearchChange = (value: string) => {
    // Set page to 1 to avoid displaying an invalid index.
    currentPage.value = 1;
};

const resetFilters = () => {
    activeFilters.value = {};
    searchInput.value = '';
    currentPage.value = 1;
    cardSummaryTableRef.value?.clearFilter();
};

const exportToCsv = () => {
    // Helper function to escape CSV values
    const escapeCsvValue = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    // Define CSV headers
    const headers = [
        'Index',
        'Name',
        'Cubes',
        'Total Count',
        'Colors',
        'Mana Value',
        'Elo',
        'Popularity',
        'Type Line',
        'Tags',
        'Min Rarity',
        'Set Code',
        'Release Date',
        'Min Price (USD)'
    ].map(escapeCsvValue).join(',');

    // Convert data to CSV rows
    const csvRows = searchedRows.value.map(row => [
        row.index,
        row.name,
        row.cubeCount,
        row.count,
        row.effectiveColors.join(''),
        row.cmc ?? '',
        row.elo ?? '',
        row.popularity ?? '',
        row.typeLine,
        row.tags.join(', '),
        row.minRarity ?? '',
        row.setCode ?? '',
        row.releaseDate ?? '',
        row.minPriceUsd ? `$${row.minPriceUsd.toFixed(2)}` : ''
    ].map(escapeCsvValue).join(','));

    // Combine headers and rows
    const csvContent = [headers, ...csvRows].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `cube-cards-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
};

const tableData = computed(() => {
    if (Object.keys(props.loadedCubes).length === 0) {
        return [];
    }
    const allCards = Object.keys(props.loadedCubes).reduce((allCards, key) => {
        props.loadedCubes[key].cards.forEach(card => {
            if (allCards[card.oracleId] === undefined) {
                allCards[card.oracleId] = {
                    ...card,
                    isRemoval: card.tags.includes('removal'),
                    effectiveColors: card.colorIdentity.length === 0 ? ['C'] : card.colorIdentity,
                    count: 0,
                    cubes: [],
                    cubeCount: 0,
                };
            }

            allCards[card.oracleId].count += 1;
            if (!allCards[card.oracleId].cubes.includes(key)) {
                // TODO: What's the best way to represent this?
                //  I think it'd be nice to be able to expand and see which cubes (with links, owners, icons, size, etc) contain the card.
                allCards[card.oracleId].cubes.push(key);
                allCards[card.oracleId].cubeCount += 1;
            }
        });

        return allCards;
    }, {});

    return Object.values(allCards);
});

const sortedRows = computed(() => {
    const alphaSorted = tableData.value.slice(0).sort((a, b) => {
        if (a['name'] < b['name']) return -1;
        if (a['name'] > b['name']) return 1;
        return 0;
    });

    if (!activeSort.value) {
        return alphaSorted;
    }

    // TODO: Manually sort color in WUBRG order.
    // TODO: Manually sort rarity in CUMR order.
    return alphaSorted.slice(0).sort((a, b) => {
        const sortKey = activeSort.value.prop;

        // FIXME: Add a default secondary sort to alphabetize by name.
        if (activeSort.value.order === 'ascending') {
            if (a[sortKey] < b[sortKey]) return -1;
            if (a[sortKey] > b[sortKey]) return 1;
            return 0;
        } else {
            if (a[sortKey] > b[sortKey]) return -1;
            if (a[sortKey] < b[sortKey]) return 1;
            return 0;
        }
    });
});

const filteredRows = computed(() => {
    if (Object.keys(activeFilters.value).length === 0) {
        return sortedRows.value;
    } else {
        return sortedRows.value.filter(row => {
            for (const [key, values] of Object.entries(activeFilters.value)) {
                if (values.length === 0) {
                    continue;
                }
                if (key === 'effectiveColors') {
                    const rowColors = row.effectiveColors.map((c: string) => c.toLowerCase());
                    const matches = values.every((color: string) => rowColors.includes(color)) && values.length === rowColors.length;
                    // const matches = values.some(value => rowColors.includes(value.toLowerCase()));
                    if (!matches) {
                        return false;
                    }
                } else if (key === 'cmc') {
                    const cmcString = row.cmc !== undefined && row.cmc !== null ? row.cmc.toString() : '';
                    if (!values.includes(cmcString)) {
                        return false;
                    }
                } else if (key === 'typeLine') {
                    const matches = values.every(value => row.typeLine.includes(value));
                    if (!matches) {
                        return false;
                    }
                } else if (key === 'setCode') {
                    if (!values.includes(row.setCode?.toUpperCase())) {
                        return false;
                    }
                } else if (key === 'cubes') {
                    const cubeKeys = row.cubes;
                    const matches = values.some(value => cubeKeys.includes(value));
                    if (!matches) {
                        return false;
                    }
                } else if (key === 'releaseDate') {
                    const releaseYear = row.releaseYear ? row.releaseYear.toString() : '';
                    if (!values.includes(releaseYear)) {
                        return false;
                    }
                } else if (key === 'tags') {
                    const rowTags = row.tags.map((t: string) => t.toLowerCase());
                    const matches = values.every((tag: string) => rowTags.includes(tag.toLowerCase()));
                    if (!matches) {
                        return false;
                    }
                } else if (key === 'games') {
                    const rowGames = row.games.map((g: string) => g.toLowerCase());
                    const matches = values.every((game: string) => rowGames.includes(game.toLowerCase()));
                    if (!matches) {
                        return false;
                    }
                } else {
                    if (!values.includes(row[key])) {
                        return false;
                    }
                }
            }
            return true;
        });
    }
});

const numberedRows = computed(() => {
    return filteredRows.value.map((row, index) => {
        return {
            ...row,
            index: index + 1,
        };
    });
});

const searchedRows = computed(() => {
    if (searchInput.value.trim() === '') {
        return numberedRows.value;
    }
    const searchTerm = searchInput.value.toLowerCase();
    return numberedRows.value.filter(row => {
        return row.name.toLowerCase().includes(searchTerm);
    });
});

const visibleRows = computed(() => {
    return searchedRows.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value);
});
</script>

<style lang="scss">
.filtered-count {
    text-align: right;
    line-height: 2em;

    @media (max-width: 760px) {
        text-align: left;
        margin-top: 8px;
    }
}

.el-pagination {
    margin: 16px auto;
    text-align: right;
}

.card-image {
    border-radius: 4.75% / 3.5%;

    &.lea {
        border-radius: 7% / 5.5%;
    }
}

.expanded-content .card-image {
    max-width: 400px;
    height: auto;
}

.tag-list {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.row-rarities {
    margin-top: 10px;
    text-align: center;

    .el-text {
        line-height: 1.5em;
    }
}

.el-popper.card-tooltip {
    padding: 6px 8px;
    width: 250px;
    height: 350px;

    .card-image {
        width: 100%;
        height: auto;
    }
}

.flex.justify-center {
    justify-content: center;
}
</style>
