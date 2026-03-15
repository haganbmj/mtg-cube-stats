<template>
    <div class="common-layout">
        <el-container>
            <el-header>
                <el-row :gutter="20">
                    <el-col :span="16">
                        <el-breadcrumb separator=" / ">
                            <el-breadcrumb-item>
                                <a href="https://griselbrand.com">griselbrand.com</a>
                            </el-breadcrumb-item>
                            <el-breadcrumb-item>Cube Comparison</el-breadcrumb-item>
                        </el-breadcrumb>
                    </el-col>
                    <el-col :span="8">
                        <div style="justify-content: flex-end; display: flex;">
                            <a href="https://bsky.app/profile/griselbrand.com" target="_blank">Bluesky</a>
                            <el-divider direction="vertical" />
                            <a href="https://github.com/haganbmj/mtg-cube-stats" target="_blank">Github</a>
                        </div>
                    </el-col>
                </el-row>
            </el-header>
            <el-main>
                <div id="contents">
                    <el-dialog
                        v-model="columnCustomizationVisible"
                        title="Customize Columns"
                        width="600"
                        align-center
                    >
                        <div v-for="option in columnOptions" :key="option.label" style="margin-bottom: 1em;">
                            <h4>{{ option.label }}</h4>
                            <el-checkbox-group v-model="config.visibleColumns" style="width: 100%;">
                                <el-row :gutter="10">
                                    <el-col :span="12" :xs="24" :s="24" v-for="item in option.options" :key="item.value">
                                        <el-checkbox
                                            :label="item.value"
                                        >
                                            {{ item.label }}
                                            <el-tooltip
                                                v-if="item.tooltip"
                                                :content="item.tooltip"
                                                placement="top"
                                                :hide-after="50"
                                            >
                                                <el-icon><InfoFilled /></el-icon>
                                            </el-tooltip>
                                        </el-checkbox>
                                    </el-col>
                                </el-row>
                            </el-checkbox-group>
                        </div>

                        <template #footer>
                            <el-button @click="columnCustomizationVisible = false">Close</el-button>
                        </template>
                    </el-dialog>

                    <el-tabs tab-position="top" v-model="activeTab">
                        <el-tab-pane :label="'Cubes (' + Object.keys(loadedCubes).length + ')'" name="overview" :lazy="true">
                            <el-row>
                                <el-col :span="18" :xs="24" :sm="24" :md="18" :lg="18">
                                    <el-form :model="addCubeForm" :inline="true" @submit.prevent="submitAddCubeForm" v-loading="addCubeForm.loading">
                                        <el-form-item>
                                            <el-col :span="11" :xs="24" :sm="24" :md="11" :lg="11">
                                                <el-form-item style="min-width: 200px; width: 100%;">
                                                    <el-select label="Collections" v-model="addCubeForm.presetComparisonsSelection" @change="loadPresetCollection" placeholder="Load Collection..." >
                                                        <el-option
                                                            v-for="option in presetComparisonsSelect"
                                                            :key="option.value"
                                                            :label="option.label"
                                                            :value="option.value"
                                                        />
                                                    </el-select>
                                                </el-form-item>
                                            </el-col>
                                            <el-col :span="2" :xs="0" :sm="0" :md="2" :lg="2" style="text-align: center;">
                                                <span class="text-gray-500">OR</span>
                                            </el-col>
                                            <el-col :span="11" :xs="24" :sm="24" :md="11" :lg="11" style="display: flex; align-items: center;">
                                                <el-row :gutter="10">
                                                    <el-col :span="20">
                                                        <el-form-item style="min-width: 200px; width: 100%;">
                                                            <el-input v-model="addCubeForm.cubeId" placeholder="Enter Cube ID" autofocus />
                                                        </el-form-item>
                                                    </el-col>
                                                    <el-col :span="4">
                                                        <el-form-item>
                                                            <el-button type="primary" @click="submitAddCubeForm" :disabled="addCubeForm.loading">Add</el-button>
                                                            <input type="submit" style="display: none;" />
                                                        </el-form-item>
                                                    </el-col>
                                                </el-row>
                                            </el-col>
                                        </el-form-item>
                                    </el-form>
                                </el-col>
                                <el-col :span="6" :xs="24" :sm="24" :md="6" :lg="6" style="text-align: right;">
                                    <el-button plain @click="columnCustomizationVisible = true" style="width: 100%; max-width: 250px;">Customize Columns</el-button>
                                </el-col>
                            </el-row>

                            <el-table
                                :data="overviewTableData"
                                :default-sort="{ prop: 'name', order: 'ascending' }"
                                :preserve-expanded-content="false"
                                style="width: 100%"
                                table-layout="auto"
                                stripe
                            >
                                <el-table-column :fixed="!isMobile" width="25" type="expand">
                                    <template #default="props">
                                        <el-row :gutter="20" justify="center" class="expanded-statistics" v-if="false">
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Total Cards" :value="props.row.stats.totalCards" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="New Cards (<1 yr)" :value="props.row.stats.newCards" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Land Cards" :value="props.row.stats.landCards" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Avg. Non-Land MV" :value="props.row.stats.averageNonLandCmc" :precision="2" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Avg. Card Elo" :value="props.row.stats.averageElo"/>
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Avg. Popularity" :value="props.row.stats.averagePopularity" :precision="2" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Universes Beyond" :value="props.row.stats.cardCounts.universesBeyond" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Supplmenetal Product" :value="props.row.stats.cardCounts.supplementalProduct" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Removal" :value="props.row.stats.cardCounts.removal / props.row.stats.totalCards * 100" :precision="2" suffix="%" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Avg. Word Count Excl. Reminder" :value="props.row.stats.averageWordCountMinusParen" :precision="2" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-statistic title="Non-Evergreen Keywords" :value="props.row.stats.uniqueNonEvergreenKeywords" />
                                            </el-col>
                                            <el-col :span="3" :xs="6" :md="4" :lg="2" class="text-center">
                                                <el-tag :type="props.row.stats.arenaPlayable ? 'success' : 'danger'">
                                                    Arena Playable: {{ props.row.stats.arenaPlayable ? 'Yes' : 'No' }}
                                                </el-tag>
                                                <el-tag :type="props.row.stats.mtgoPlayable ? 'success' : 'danger'">
                                                    MTGO Playable: {{ props.row.stats.mtgoPlayable ? 'Yes' : 'No' }}
                                                </el-tag>
                                                <el-tag :type="props.row.stats.paperPlayable ? 'success' : 'danger'">
                                                    Paper Playable: {{ props.row.stats.paperPlayable ? 'Yes' : 'No' }}
                                                </el-tag>
                                            </el-col>
                                        </el-row>
                                        <el-row :gutter="10">
                                            <el-col :span="24">
                                                <el-row justify="space-between" class="chart-row" :gutter="20" style="margin-top: 1em;">
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <ManaValueChart class="chart" :cmcDistribution="props.row.stats?.cmcDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <ReleaseYearChart class="chart" :releaseYearDistribution="props.row.stats?.releaseYearDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <ColorIdentityDistributionChart class="chart" :colorDistribution="props.row.stats?.colorDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <TypeLineDistributionChart class="chart" :typeLineDistribution="props.row.stats?.typeLineDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <RarityDistributionChart class="chart" :rarityDistribution="props.row.stats?.rarityDistribution || {}" :minimumRarityDistribution="props.row.stats?.minRarityDistribution" />
                                                        </div>
                                                    </el-col>
                                                    <el-col :span="12" :xs="24" :md="12" :xl="8">
                                                        <div style="height: 300px;">
                                                            <LegalityDistributionChart class="chart" :legalityDistribution="props.row.stats?.minimumFormatLegalityDistribution || {}" />
                                                        </div>
                                                    </el-col>
                                                </el-row>
                                            </el-col>
                                            <el-col :span="12" :xs="24" :sm="12" :md="12" :xl="8">
                                                <h3>Keywords ({{ props.row.stats.uniqueKeywords }})</h3>
                                                <KeywordTable :keywords="props.row.stats?.keywords || {}" :totalCards="props.row.stats?.totalCards || 1" />
                                            </el-col>
                                            <el-col :span="12" :xs="24" :sm="12" :md="12" :xl="8">
                                                <h3>Sets ({{ Object.keys(props.row.stats?.setCodeDistribution || {}).length }})</h3>
                                                <SetNameTable :setCodeDistribution="props.row.stats?.setCodeDistribution || {}" :totalCards="props.row.stats?.totalCards || 1" />
                                            </el-col>
                                            <el-col :span="12" :xs="24" :sm="12" :md="12" :xl="8">
                                                <h3>Similar Cubes</h3>
                                                <SimilarCubesTable :similarityMatrix="similarityMatrix" :loadedCubes="overviewTableData" :cubeId="props.row.id" />
                                            </el-col>
                                        </el-row>
                                        <el-row :gutter="10" style="margin-top: 20px;">
                                            <el-col :span="24">
                                                <h3>Supported Archetypes</h3>
                                                <ArchetypeAnalysis :cubeCards="loadedCubes[props.row.id]?.cards || []" />
                                            </el-col>
                                        </el-row>
                                    </template>
                                </el-table-column>
                                <el-table-column fixed prop="thumbnail" label="" width="75">
                                    <template #default="{ row }">
                                        <el-image :src="row.thumbnail" class="remove-thumbnail" fit="contain" style="width: 50px; height: 35px;" />
                                        <el-button class="remove-button" size="small" type="danger" @click="removeCube(row.id)">
                                            <el-icon><Delete /></el-icon>
                                        </el-button>
                                    </template>
                                </el-table-column>
                                <el-table-column type="index" label="#" width="50" v-if="config.visibleColumns.includes('rowNumber')" />
                                <el-table-column prop="name" label="Name" min-width="150" max-width="300" show-overflow-tooltip sortable :sort-method="sortMethods.caseInsensitiveName" v-if="config.visibleColumns.includes('name')" >
                                    <template #default="{ row }">
                                        <el-link :href="`https://cubecobra.com/cube/list/${row.id}`" target="_blank">{{ row.name }}</el-link>
                                        <template v-if="row.stats.graveyardOrderMatters">
                                            <el-tooltip
                                                content="This cube contains cards that care about Graveyard Order."
                                                placement="top"
                                                :hide-after="50"
                                            >
                                                <el-icon color="yellow" style="margin-left: 0.25rem;"><WarnTriangleFilled /></el-icon>
                                            </el-tooltip>
                                        </template>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="owner" label="Owner" min-width="100" max-width="150" show-overflow-tooltip sortable :sort-method="sortMethods.caseInsensitiveOwner"  v-if="config.visibleColumns.includes('owner')" >
                                    <template #default="{ row }">
                                        <el-link :href="`https://cubecobra.com/user/view/${row.ownerId}`" target="_blank">{{ row.owner }}</el-link>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('lastModified')"
                                    prop="lastModified"
                                    label="Last Modified"
                                    min-width="100"
                                    max-width="125"
                                    sortable
                                    :formatter="columnFormatters.toDate"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('followerCount')"
                                    prop="followerCount"
                                    label="Followers"
                                    min-width="100"
                                    max-width="125"
                                    sortable
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.arenaPlayable')"
                                    prop="stats.arenaPlayable"
                                    label="Arena Playable"
                                    min-width="75"
                                    max-width="75"
                                >
                                    <template #default="{ row }">
                                        <el-tag :type="row.stats.arenaPlayable ? 'success' : 'danger'">
                                            {{ row.stats.arenaPlayable ? 'Yes' : 'No' }}
                                        </el-tag>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.mtgoPlayable')"
                                    prop="stats.mtgoPlayable"
                                    label="MTGO Playable"
                                    min-width="75"
                                    max-width="75"
                                >
                                    <template #default="{ row }">
                                        <el-tag :type="row.stats.mtgoPlayable ? 'success' : 'danger'">
                                            {{ row.stats.mtgoPlayable ? 'Yes' : 'No' }}
                                        </el-tag>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.paperPlayable')"
                                    prop="stats.paperPlayable"
                                    label="Paper Playable"
                                    min-width="75"
                                    max-width="75"
                                >
                                    <template #default="{ row }">
                                        <el-tag :type="row.stats.paperPlayable ? 'success' : 'danger'">
                                            {{ row.stats.paperPlayable ? 'Yes' : 'No' }}
                                        </el-tag>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.assumedCategories')"
                                    prop="stats.assumedCategories"
                                    label="Categories"
                                    min-width="75"
                                    max-width="100"
                                >
                                    <template #default="{ row }">
                                        <div class="tag-list flex gap-2">
                                            <el-tooltip
                                                v-for="category in row.stats.assumedCategories"
                                                :key="category"
                                                :content="getCategoryTooltip(category)"
                                                placement="top"
                                                :hide-after="50"
                                            >
                                                <el-tag
                                                    size="small"
                                                    type="info"
                                                    :color="getCategoryTagColor(category)"
                                                    disable-transitions
                                                >
                                                    {{ category }}
                                                </el-tag>
                                            </el-tooltip>
                                        </div>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.totalMinPriceUsd')"
                                    prop="stats.totalMinPriceUsd"
                                    label="Min Price (USD)"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toPriceUsd"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.totalMinPriceTix')"
                                    prop="stats.totalMinPriceTix"
                                    label="Min Price (Tix)"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averageReleaseYear')"
                                    prop="stats.averageReleaseYear"
                                    label="Avg. Release Year"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.roundedInteger"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.totalCards')"
                                    prop="stats.totalCards"
                                    label="Total Cards"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.newCards')"
                                    prop="stats.newCards"
                                    :sort-method="(a, b) => (a.stats.newCards / a.stats.totalCards) - (b.stats.newCards / b.stats.totalCards)"
                                    label="New Cards"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #header>
                                        <el-tooltip content="Cards Released in the Last 12 Months" placement="top" :hide-after="50">
                                            <span>New Cards <el-icon><InfoFilled /></el-icon></span>
                                        </el-tooltip>
                                    </template>
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.newCards / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.newCards }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.singletonCards')"
                                    prop="stats.singletonCards"
                                    :sort-method="(a, b) => (a.stats.singletonCards / a.stats.totalCards) - (b.stats.singletonCards / b.stats.totalCards)"
                                    label="Singleton"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #header>
                                        <el-tooltip content="Cards with only one copy" placement="top" :hide-after="50">
                                            <span>Singleton <el-icon><InfoFilled /></el-icon></span>
                                        </el-tooltip>
                                    </template>
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.singletonCards / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.singletonCards }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.landCards')"
                                    prop="stats.landCards"
                                    :sort-method="(a, b) => (a.stats.landCards / a.stats.totalCards) - (b.stats.landCards / b.stats.totalCards)"
                                    label="Lands"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.landCards / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.landCards }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.creatureCards')"
                                    prop="stats.creatureCards"
                                    :sort-method="(a, b) => (a.stats.creatureCards / a.stats.totalCards) - (b.stats.creatureCards / b.stats.totalCards)"
                                    label="Creatures"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.creatureCards / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.creatureCards }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('avgSimilarityScore')"
                                    prop="avgSimilarityScore"
                                    label="Avg. Similarity"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.percentageFormatter"
                                >
                                    <template #header>
                                        <el-tooltip content="Average Cosine Similarity Score vs. Other Loaded Cubes" placement="top" :hide-after="50">
                                            <span>Avg. Similarity <el-icon><InfoFilled /></el-icon></span>
                                        </el-tooltip>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averageNonLandCmc')"
                                    prop="stats.averageNonLandCmc"
                                    label="Avg. Mana Value"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                >
                                    <template #header>
                                        <el-tooltip content="Average Mana Value of Non-Land Cards" placement="top" :hide-after="50">
                                            <span>Avg. Mana Value <el-icon><InfoFilled /></el-icon></span>
                                        </el-tooltip>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averageElo')"
                                    prop="stats.averageElo"
                                    label="Avg. Elo"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averagePopularity')"
                                    prop="stats.averagePopularity"
                                    label="Avg. Popularity"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.blendedRarityScore')"
                                    prop="stats.blendedRarityScore"
                                    label="Rarity Score"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                >
                                    <template #header>
                                        <el-tooltip content="Card Minimum Rarity Score, using C=0.333, U=0.666, R=1.000, M=1.200" placement="top" :hide-after="50">
                                            <span>Rarity Score <el-icon><InfoFilled /></el-icon></span>
                                        </el-tooltip>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averageWordCount')"
                                    prop="stats.averageWordCount"
                                    label="Avg. Word Count"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.averageWordCountMinusParen')"
                                    prop="stats.averageWordCountMinusParen"
                                    label="Avg. Word Count Excl. Reminder"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                    :formatter="columnFormatters.toFixed2"
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.uniqueKeywords')"
                                    prop="stats.uniqueKeywords"
                                    label="Keywords"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.uniqueNonEvergreenKeywords')"
                                    prop="stats.uniqueNonEvergreenKeywords"
                                    label="Non-Evergreen Keywords"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                />

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.cardCounts.abnormalLayout')"
                                    prop="stats.cardCounts.abnormalLayout"
                                    :sort-method="(a, b) => (a.stats.cardCounts.abnormalLayout / a.stats.totalCards) - (b.stats.cardCounts.abnormalLayout / b.stats.totalCards)"
                                    label="Abnormal Layout"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #header>
                                        <el-tooltip content="Cards with Abnormal Layouts (e.g. Split, Flip, MDFCs, etc.)" placement="top" :hide-after="50">
                                            <span>Abnormal Layout <el-icon><InfoFilled /></el-icon></span>
                                        </el-tooltip>
                                    </template>
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.abnormalLayout / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.cardCounts.abnormalLayout }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.cardCounts.makesTokens')"
                                    prop="stats.cardCounts.makesTokens"
                                    :sort-method="(a, b) => (a.stats.cardCounts.makesTokens / a.stats.totalCards) - (b.stats.cardCounts.makesTokens / b.stats.totalCards)"
                                    label="Makes Tokens"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.makesTokens / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.cardCounts.makesTokens }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.cardCounts.removal')"
                                    prop="stats.cardCounts.removal"
                                    :sort-method="(a, b) => (a.stats.cardCounts.removal / a.stats.totalCards) - (b.stats.cardCounts.removal / b.stats.totalCards)"
                                    label="Removal"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.removal / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.cardCounts.removal }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.cardCounts.universesBeyond')"
                                    prop="stats.cardCounts.universesBeyond"
                                    :sort-method="(a, b) => (a.stats.cardCounts.universesBeyond / a.stats.totalCards) - (b.stats.cardCounts.universesBeyond / b.stats.totalCards)"
                                    label="Universes Beyond"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #header>
                                        <el-tooltip content="Cards originally from Universes Beyond Products (includes Standard sets)" placement="top" :hide-after="50">
                                            <span>Universes Beyond <el-icon><InfoFilled /></el-icon></span>
                                        </el-tooltip>
                                    </template>
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.universesBeyond / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.cardCounts.universesBeyond }})</el-text>
                                    </template>
                                </el-table-column>

                                <el-table-column
                                    v-if="config.visibleColumns.includes('stats.cardCounts.supplementalProduct')"
                                    prop="stats.cardCounts.supplementalProduct"
                                    :sort-method="(a, b) => (a.stats.cardCounts.supplementalProduct / a.stats.totalCards) - (b.stats.cardCounts.supplementalProduct / b.stats.totalCards)"
                                    label="Supplemental Product"
                                    min-width="75"
                                    max-width="100"
                                    sortable
                                >
                                    <template #header>
                                        <el-tooltip content="Cards originally from Supplemental Products (includes Portal)" placement="top" :hide-after="50">
                                            <span>Supplemental Product <el-icon><InfoFilled /></el-icon></span>
                                        </el-tooltip>
                                    </template>
                                    <template #default="{ row }">
                                        <el-text class="cell-primary">{{ formatters.percentageFormatter(row.stats.cardCounts.supplementalProduct / row.stats.totalCards) }}</el-text>
                                        <el-text class="cell-secondary">({{ row.stats.cardCounts.supplementalProduct }})</el-text>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </el-tab-pane>

                        <el-tab-pane label="Infographic" name="infographic" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <InfographicTab :loadedCubes="loadedCubes" :similarityMatrix="similarityMatrix" />
                        </el-tab-pane>

                        <el-tab-pane label="Statistics" name="statistics" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <div style="width: 100%;">
                                <StatisticsTab :loadedCubes="overviewTableData" />
                            </div>
                        </el-tab-pane>

                        <el-tab-pane label="Archetypes" name="archetypes" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <div style="width: 100%;">
                                <div v-for="(cube, cubeId) in loadedCubes" :key="cubeId">
                                    <ArchetypeAnalysis :cubeCards="cube.cards" />
                                </div>
                            </div>
                        </el-tab-pane>

                        <el-tab-pane label="Cards" name="cards" :lazy="true" :disabled="Object.keys(loadedCubes).length === 0">
                            <div style="width: 100%;">
                                <CardSummaryTable :loadedCubes="loadedCubes" />
                            </div>
                        </el-tab-pane>

                        <el-tab-pane label="About" name="about" :lazy="true">
                            <About />
                        </el-tab-pane>
                    </el-tabs>
                </div>
            </el-main>
            <el-footer>
                <div style="text-align: center;">
                    <el-text tag="small">{{ randomFooter() }}</el-text>
                </div>
            </el-footer>
        </el-container>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, provide, onMounted, nextTick } from 'vue';
import { THEME_KEY } from 'vue-echarts';
import { getNestedProp, castInensitiveSort } from './util/HelperFunctions.mjs';
import randomFooter from './util/RandomFooter.mjs';
import { initScryfall, remapCube, enrichCube, preloadSimiliarityMatrix, computeSimilarityMatrix } from './util/CubeFunctions.mjs';
import { getCubeData } from './util/CubeCobra.mjs';
import { bindStorage } from './util/VueLocalStorage.mjs';
import ManaValueChart from './components/charts/basic/ManaValueChart.vue';
import ColorIdentityDistributionChart from './components/charts/distributions/ColorIdentityDistributionChart.vue';
import TypeLineDistributionChart from './components/charts/distributions/TypeLineDistributionChart.vue';
import KeywordTable from './components/KeywordTable.vue';
import SetNameTable from './components/SetNameTable.vue';
import RarityDistributionChart from './components/charts/distributions/RarityDistributionChart.vue';
import ReleaseYearChart from './components/charts/basic/ReleaseYearChart.vue';

import { registerTheme } from 'echarts';
import darkbmjTheme from './echarts/theme.mjs';
import LegalityDistributionChart from './components/charts/distributions/LegalityDistributionChart.vue';
import CardSummaryTable from './components/CardSummaryTable.vue';
import About from './components/About.vue';
import ArchetypeAnalysis from './components/ArchetypeAnalysis.vue';
import StatisticsTab from './tabs/StatisticsTab.vue';
import InfographicTab from './tabs/InfographicTab.vue';
import SimilarCubesTable from './components/SimilarCubesTable.vue';
import { useDateFormat } from '@vueuse/core';

registerTheme('darkbmj', darkbmjTheme);
provide(THEME_KEY, 'darkbmj');

// Track scryfall initialization promise
let scryfallInitPromise = null;

const ensureScryfallInitialized = async () => {
    if (scryfallInitPromise === null) {
        scryfallInitPromise = initScryfall();
    }
    return scryfallInitPromise;
};

// FIXME: Move these somewhere else and dynamically include/exclude them based on the ENV.
const presetComparisons = {
    "WotC MTGO/Arena": () => import("../preloads/cubes-wotc.json"),
    "CubeCobra Top 100": () => import("../preloads/cubes-cubecobra-top100.json"),
    // "CubeCon 2025": () => import("../preloads/cubes-cubecon2025.json"),
    // "haganbmj": () => import("../preloads/cubes-haganbmj.json"),
    "Peasant Cubes": () => import("../preloads/cubes-peasant.json"),
    // "Vertex Philly 2026": () => import("../preloads/cubes-vertex-philly-2026.json"),
    // "Cube For A Cause 2026": () => import("../preloads/cubes-c4ac-feb2026.json"),
    // "Connecticube 2026": () => import("../preloads/cubes-connecticube-2026.json"),
    "Shoebox 2026": () => import("../preloads/cubes-shoebox-2026.json"),
    "Cube Corner @ Amsterdam 2026": () => import("../preloads/cubes-cube-corner-2026.json"),
};

const defaultConfig = {
    visibleColumns: [
        'rowNumber',
        'name',
        'owner',
        'stats.totalCards',
        'stats.newCards',
        'avgSimilarityScore',
        'stats.averageNonLandCmc',
        'stats.averageWordCountMinusParen',
        'stats.cardCounts.removal',
        'stats.uniqueNonEvergreenKeywords',
    ],
};

const isMobile = computed(() => {
  return screen.width <= 760;
});

const config = bindStorage('cube-app-config', (v) => {
    if (v == undefined || v === null) {
        return defaultConfig;
    } else {
        // FIXME: I'd like a more robust way to do this, but it's fine with only two props.
        return {
            visibleColumns: Array.isArray(v.visibleColumns) ? v.visibleColumns : defaultConfig.visibleColumns,
        }
    }
});

const columnCustomizationVisible = ref(false);

const addCubeForm = reactive({
    loading: false,
    cubeId: '',
});

const loadedCubes = ref({});

const loadPresetCollection = async (presetName: string) => {
    if (presetName in presetComparisons) {
        console.time(`Render Collection: ${presetName}`);
        console.time(`Load Collection: ${presetName}`);

        addCubeForm.loading = true;

        // Wait for scryfall to be initialized
        await ensureScryfallInitialized();

        const cubesModule = await presetComparisons[presetName]();
        preloadSimiliarityMatrix(cubesModule.default.similarities);
        const enrichedCubes = Object.fromEntries(Object.entries(cubesModule.default.cubes).map(([id, cube]) => [id, enrichCube(cube)]));

        console.timeEnd(`Load Collection: ${presetName}`);
        loadedCubes.value = enrichedCubes;
        addCubeForm.loading = false;
        addCubeForm.presetComparisonsSelection = '';
        await nextTick();

        console.timeEnd(`Render Collection: ${presetName}`);
    }
};

const presetComparisonsSelect = ref(presetComparisons ? Object.keys(presetComparisons).map(key => ({ label: key, value: key })) : []);

const activeTab = ref('overview');

const columnOptions = ref([
    {
        label: 'Core',
        options: [
            { value: 'rowNumber', label: "Row Number" },
            // { value: 'thumbnail', label: "Thumbnail" }, // Not letting this be configurable at the moment...
            { value: 'name', label: "Name" },
            { value: 'owner', label: "Owner" },
            { value: 'lastModified', label: "Last Modified", tooltip: "Date when the contents or description of the cube was last modified" },
            { value: 'followerCount', label: "Followers", tooltip: "Number of users following the cube on CubeCobra" },
            { value: 'stats.arenaPlayable', label: "Arena Playable", tooltip: "Whether the cube is playable on MTG Arena" },
            { value: 'stats.mtgoPlayable', label: "MTGO Playable", tooltip: "Whether the cube is playable on MTGO" },
            { value: 'stats.paperPlayable', label: "Paper Playable", tooltip: "Whether the cube is playable in Paper (no Digital-only printings, no Custom cards)" },
            { value: 'stats.assumedCategories', label: "Categories", tooltip: "Assumed Categorization of the cube based on its contents (pauper, peasant, powered, desert)" },
            { value: 'stats.totalMinPriceUsd', label: "Min Price (USD)", tooltip: "Total Minimum Price of the Cube in USD" },
            { value: 'stats.totalMinPriceTix', label: "Min Price (Tix)", tooltip: "Total Minimum Price of the Cube in MTGO Tix" },
            { value: 'stats.averageReleaseYear', label: 'Avg. Release Year', tooltip: "Average Release Year of Cards in the Cube" },
            { value: 'stats.totalCards', label: "Total Cards", tooltip: "Total Number of Cards" },
            { value: 'stats.newCards', label: "New Cards", tooltip: "Cards Released in the Last 12 Months" },
            { value: 'stats.singletonCards', label: "Singleton", tooltip: "Cards with only one copy" },
            { value: 'stats.landCards', label: "Lands", tooltip: "Cards that are playable from hand as a Land, includes MDFCs" },
            { value: 'stats.creatureCards', label: "Creatures", tooltip: "Cards with 'Creature' in their Type Line" },
        ],
    },
    {
        label: 'Summary Stats',
        options: [
            { value: 'avgSimilarityScore', label: "Avg. Similarity", tooltip: "Average Cosine Similarity Score vs. Other Loaded Cubes" },
            { value: 'stats.averageNonLandCmc', label: "Avg. Mana Value", tooltip: "Average Mana Value of Non-Land Cards" },
            { value: 'stats.averageElo', label: "Avg. Card Elo", tooltip: "Average CubeCobra Card Elo Rating" },
            { value: 'stats.averagePopularity', label: "Avg. Card Popularity", tooltip: "Average CubeCobra Card Popularity Score" },
            { value: 'stats.blendedRarityScore', label: "Rarity Score", tooltip: "Card Minimum Rarity Score, using C=0.333, U=0.666, R=1.000, M=1.200" },
        ],
    },
    {
        label: 'Characteristics',
        options: [
            { value: 'stats.averageWordCount', label: 'Avg. Word Count', tooltip: "Average Oracle Text Word Count" },
            { value: 'stats.averageWordCountMinusParen', label: 'Avg. Word Count Excl. Reminder', tooltip: "Average Oracle Text Word Count, excluding anything in Parentheses" },
            { value: 'stats.uniqueKeywords', label: "Keywords", tooltip: "Number of Unique Keywords" },
            { value: 'stats.uniqueNonEvergreenKeywords', label: "Non-Evergreen Keywords", tooltip: "Number of Unique Non-Evergreen Keywords" },
            { value: 'stats.cardCounts.abnormalLayout', label: "Abnormal Layout", tooltip: "Cards with Abnormal Layouts (e.g. Split, Flip, MDFCs, etc.)" },
            { value: 'stats.cardCounts.makesTokens', label: "Makes Tokens", tooltip: "Cards that Create one or more Tokens" },
            { value: 'stats.cardCounts.removal', label: "Removal", tooltip: "Cards tagged as \"removal\" in Scryfall's Tagger" },
        ],
    },
    {
        label: 'Product Line',
        options: [
            { value: 'stats.cardCounts.universesBeyond', label: "Universes Beyond", tooltip: "Cards originally from Universes Beyond Products (includes Standard sets)" },
            { value: 'stats.cardCounts.supplementalProduct', label: "Supplemental Product", tooltip: "Cards originally from Supplemental Products (includes Portal)" },
        ],
    },
]);

const categories = [
    { text: 'pauper', value: 'pauper', color: 'rgba(255, 165, 0, 0.2)', tooltip: 'All cards are commons.' },
    { text: 'pauper+', value: 'pauper+', color: 'rgba(0, 255, 115, 0.2)', tooltip: 'All non-land cards are commons.' },
    { text: 'pauper-ish', value: 'pauper-ish', color: 'rgba(95, 95, 235, 0.2)', tooltip: '≥92.5% of non-land cards are commons; no uncommon/rare lands.' },
    { text: 'pauper+ish', value: 'pauper+ish', color: 'rgba(95, 235, 95, 0.2)', tooltip: '≥92.5% of non-land cards are commons; contains uncommon/rare lands.' },
    { text: 'peasant', value: 'peasant', color: 'rgba(0, 128, 0, 0.2)', tooltip: 'All cards are common or uncommon.' },
    { text: 'peasant+', value: 'peasant+', color: 'rgba(34, 145, 169, 0.2)', tooltip: 'All non-land cards are common or uncommon.' },
    { text: 'peasant-ish', value: 'peasant-ish', color: 'rgba(128, 0, 128, 0.2)', tooltip: '≥92.5% of non-land cards are common or uncommon; no rare lands.' },
    { text: 'peasant+ish', value: 'peasant+ish', color: 'rgba(128, 128, 0, 0.2)', tooltip: '≥92.5% of non-land cards are common or uncommon; contains rare lands.' },
    { text: 'powered', value: 'powered', color: 'rgba(128, 0, 20, 0.2)', tooltip: 'Contains one or more pieces of the Power 9.' },
    { text: 'desert?', value: 'desert?', color: 'rgba(169, 150, 35, 0.2)', tooltip: 'Contains more than 28% lands.' },
];

const getCategoryTagColor = (category: string) => {
    return categories.find(c => c.value.toLowerCase() === category?.toLowerCase())?.color ?? 'rgba(200, 200, 200, 0.3)';
}

const getCategoryTooltip = (category: string) => {
    return categories.find(c => c.value.toLowerCase() === category?.toLowerCase())?.tooltip ?? '';
}

// FIXME: Still getting a double render on this for some reason, but the memoization is absorbing the hit.
const similarityMatrix = computed(() => {
    return computeSimilarityMatrix(loadedCubes.value);
});

const getAverageSimilarityScore = (cubeId: string) => {
    const scores = similarityMatrix.value[cubeId] || {};
    const totalCubes = Object.keys(loadedCubes.value).length - 1;

    if (totalCubes === 0) {
        return 0;
    }

    const totalScore = Object.values(scores).reduce((acc, c) => acc + c.cosineSimilarity, 0);
    return totalScore / totalCubes;
};

// FIXME: Is there a way to indicate that this should wait until after similarityMatrix is recomputed?
const overviewTableData = computed(() => {
    return Object.entries(loadedCubes.value).map(([id, cube]) => {
        return {
            ...cube,
            // Strip cards from the table object to improve render performance.
            // This seems to save ~500ms for ~50 cubes (600ms vs 100ms), and ~1200ms for ~100 cubes (1400ms vs 200ms).
            // There might be even more to strip from this object to shave a few more ms.
            cards: undefined,
            suffixedCardIds: undefined,
            avgSimilarityScore: getAverageSimilarityScore(id),
        }
    });
});

const submitAddCubeForm = async () => {
    addCubeForm.loading = true;

    // Wait for scryfall to be initialized
    await ensureScryfallInitialized();

    // Attempt to take just the Cube ID based on multiple possible input formats.
    const input = addCubeForm.cubeId.split('?')[0].trim();
    const [ cubeId ] = input.match(/([^\/]+)\/?$/);

    // If the cube is already loaded, skip it.
    if (!Object.values(loadedCubes.value).some(cube => cube.id === cubeId || cube.shortId === cubeId)) {
        console.time(`Add Cube: ${cubeId}`);
        try {
            const rawCube = await getCubeData(cubeId);
            const enrichedCube = remapCube(rawCube);
            loadedCubes.value[enrichedCube.id] = enrichedCube;
        } catch (e) {
            console.error("Error loading cube:", e);
        }
        await nextTick();
        console.timeEnd(`Add Cube: ${cubeId}`);
    }

    addCubeForm.cubeId = '';
    addCubeForm.loading = false;
};

/**
 * FIXME: Make this betterer.
 *  Doing a terrible job currently with these multiple IDs, and I think mutating the reactive object is done improperly.
 */
const removeCube = (cubeId: string) => {
    delete loadedCubes.value[cubeId];
};

const sortMethods = {
    caseInsensitiveName: (a, b) => {
        return castInensitiveSort(a.name, b.name);
    },
    caseInsensitiveOwner: (a, b) => {
        return castInensitiveSort(a.owner, b.owner);
    },
};

const formatters = {
    toFixed2: (value: number) => {
        return value.toFixed(2);
    },
    toPriceUsd: (value: number) => {
        return '$' + value.toFixed(2);
    },
    percentageFormatter: (value: number) => {
        return (value * 100).toFixed(2) + '%';
    },
};

const columnFormatters = {
    roundedInteger: (row, column) => {
        return Math.round(getNestedProp(row, column.property) ?? 0);
    },
    toFixed2: (row, column) => {
        return (getNestedProp(row, column.property) ?? 0).toFixed(2);
    },
    toPriceUsd: (row, column) => {
        return '$' + (getNestedProp(row, column.property) ?? 0).toFixed(2);
    },
    percentageFormatter: (row, column) => {
        return ((getNestedProp(row, column.property) ?? 0) * 100).toFixed(2) + '%';
    },
    toDate: (row, column) => {
        const unixTimestamp = getNestedProp(row, column.property);
        if (unixTimestamp === undefined || unixTimestamp === null) {
            return 'N/A';
        }

        return useDateFormat(new Date(unixTimestamp), 'YYYY-MM-DD').value;
    },
};

onMounted(async () => {
    // Start scryfall initialization in the background without blocking the UI
    ensureScryfallInitialized();
});
</script>

<style lang="scss">
html.dark {
    --el-color-primary: #5755d9;

    --el-color-primary-light-3: #4b48d6;
    --el-color-primary-light-5: #4b48d6;
    --el-color-primary-light-7: #4b48d6;
    --el-color-primary-light-8: #514fea;
    --el-color-primary-light-9: #514fea;

    --el-color-primary-dark-2: #514fea;
    --el-color-primary-dark-3: #514fea;
    --el-color-primary-dark-5: #4b48d6;
    --el-color-primary-dark-7: #4b48d6;
    --el-color-primary-dark-8: #3f3db6;
    --el-color-primary-dark-9: #3f3db6;
}

.el-button:hover {
    color: var(--el-text-color-primary);
}

.el-header {
    padding-top: 1em;
    padding-bottom: 1em;
    height: unset;

    background: var(--el-fill-color-lighter);
    border-bottom: 1px solid var(--el-border-color);

    a {
        text-decoration: none;
        color: var(--el-text-color-secondary);

        &:hover {
            color: var(--el-color-primary);
        }
    }
}

body {
    font-family: Inter,Helvetica Neue,Helvetica,PingFang SC,Hiragino Sans GB,Microsoft YaHei,微软雅黑,Arial,sans-serif;
    font-weight: 350;
    font-size: 14px;

    margin: 0px auto;
}

.el-table .cell {
    line-height: 20px;
}

td.el-table__cell.el-table__expanded-cell > div.el-row {
    max-width: 95vw;
}

.el-select-group__title {
    padding: 0 10px;
}

.chart-row {
    x-vue-echarts.chart {
        width: unset;
        margin: 0 auto;
    }
}

.remove-button {
    position: absolute;
    visibility: hidden;
    top: 20%;
    right: 25%;
    width: 50%;
    height: 50%;
}

.remove-thumbnail:hover + .remove-button, .remove-button:hover {
    visibility: visible;
}

.text-center,[text~=center] {
    text-align: center
}

.expanded-statistics > .el-col {
    margin-top: 1.5em;
}

.cell-secondary {
    color: var(--el-text-color-secondary);
    margin-left: 0.5em;
}

.tag-list {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}
</style>
