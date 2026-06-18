<template>
    <el-dialog
        :model-value="visible"
        :modal="modal"
        width="90%"
        style="max-width: 1500px;"
        top="5vh"
        align-center
        :before-close="() => $emit('close')"
    >
        <template #header>
            <div v-if="activeCube" class="cube-dialog-header">
                <el-image :src="activeCube.thumbnail" fit="contain" class="cube-dialog-image" />
                <div class="cube-dialog-title-block">
                    <el-link :href="`https://cubecobra.com/cube/about/${externalCubeId(activeCube)}`" target="_blank" type="default" underline="never">
                        <span class="cube-dialog-name">{{ displayName(activeCube) }}</span>
                        <el-icon class="el-icon--right"><Link /></el-icon>
                    </el-link>
                    <el-link :href="`https://cubecobra.com/user/view/${activeCube.ownerId}`" target="_blank" underline="never">
                        <span class="cube-dialog-owner">{{ activeCube.owner }}</span>
                    </el-link>
                    <div v-if="isSnapshot(activeCube)" class="cube-dialog-snapshot-meta">
                        <el-icon><Clock /></el-icon>
                        <span>Snapshot · {{ snapshotDateLabel(activeCube.snapshotDate!) }}</span>
                        <template v-if="liveCubeLoaded">
                            <span class="cube-dialog-snapshot-sep">·</span>
                            <el-link type="primary" underline="never" @click="openLiveCube">View live cube</el-link>
                        </template>
                        <template v-else>
                            <span class="cube-dialog-snapshot-sep">·</span>
                            <el-link type="primary" underline="never" @click="loadAndOpenLiveCube" :loading="loadingLive">Load live cube</el-link>
                        </template>
                    </div>
                </div>
            </div>
        </template>

        <template v-if="activeCube">
            <div class="cube-dialog-meta">
                <span class="cube-dialog-meta-item">Cards: <strong>{{ activeCube.stats?.totalCards ?? 0 }}</strong></span>
                <span class="cube-dialog-meta-item">Followers: <strong>{{ activeCube.followerCount ?? 0 }}</strong></span>
                <span class="cube-dialog-meta-item" :title="fullLastModified">Modified: <strong>{{ formattedLastModified }}</strong></span>
                <span class="cube-dialog-meta-item" v-if="(activeCube.stats?.assumedCategories || []).length">
                    Categories:
                    <el-tooltip
                        v-for="category in (activeCube.stats?.assumedCategories || [])"
                        :key="category"
                        :content="getCategoryTooltip(category)"
                        placement="top"
                        :hide-after="50"
                        :enterable="false"
                    >
                        <el-tag
                            size="default"
                            effect="dark"
                            :color="getCategoryTagColor(category)"
                            style="margin-left: 0.25rem;"
                            disable-transitions
                        >
                            {{ category }}
                        </el-tag>
                    </el-tooltip>
                </span>
            </div>
            <div v-if="activeCube?.brief" class="cube-dialog-brief" v-html="renderedBrief"></div>
            <el-tabs tab-position="top">
                <el-tab-pane label="Details">
                    <el-row class="details-tab">
                        <el-col :span="24">
                            <h4 class="stat-section-title">Key Information</h4>
                            <div class="stat-grid">
                                <div class="stat-item">
                                    <i class="ms ms-creature ms-2x stat-icon"></i>
                                    <el-tooltip content="Cards with 'Creature' in their Type Line" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ formatPercentage(activeCube.stats?.creatureCards, activeCube.stats?.totalCards) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.creatureRatio" />
                                            </div>
                                            <div class="stat-label">Creatures <span class="stat-secondary">({{ activeCube.stats?.creatureCards ?? 0 }})</span></div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-land ms-2x stat-icon"></i>
                                    <el-tooltip content="Cards that are playable from hand as a Land, includes MDFCs" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ formatPercentage(activeCube.stats?.landCards, activeCube.stats?.totalCards) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.landRatio" />
                                            </div>
                                            <div class="stat-label">Lands <span class="stat-secondary">({{ activeCube.stats?.landCards ?? 0 }})</span></div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-c ms-2x stat-icon"></i>
                                    <el-tooltip content="Average Mana Value of Non-Land Cards" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ (activeCube.stats?.averageNonLandCmc ?? 0).toFixed(2) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.averageNonLandCmc" />
                                            </div>
                                            <div class="stat-label">Avg. Mana Value</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-rarity ms-2x stat-icon"></i>
                                    <el-tooltip content="Card Minimum Rarity Score, using C=0.333, U=0.666, R=1.000, M=1.200" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ (activeCube.stats?.blendedRarityScore ?? 0).toFixed(2) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.blendedRarityScore" />
                                            </div>
                                            <div class="stat-label">Rarity Score</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-ability-deathtouch ms-2x stat-icon"></i>
                                    <el-tooltip content="Cards tagged as 'removal' in Scryfall's Tagger" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ formatPercentage(activeCube.stats?.cardCounts?.removal, activeCube.stats?.totalCards) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.removalRatio" />
                                            </div>
                                            <div class="stat-label">Removal <span class="stat-secondary">({{ activeCube.stats?.cardCounts?.removal ?? 0 }})</span></div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-token ms-2x stat-icon"></i>
                                    <el-tooltip content="Cards that Create one or more Tokens" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ formatPercentage(activeCube.stats?.cardCounts?.makesTokens, activeCube.stats?.totalCards) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.makesTokensRatio" />
                                            </div>
                                            <div class="stat-label">Makes Tokens <span class="stat-secondary">({{ activeCube.stats?.cardCounts?.makesTokens ?? 0 }})</span></div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-token ms-2x stat-icon"></i>
                                    <el-tooltip content="Number of unique token types produced by cards in the cube" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ activeCube.stats?.uniqueTokenCount ?? 0 }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.uniqueTokenCount" />
                                            </div>
                                            <div class="stat-label">Unique Tokens</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-ability-prototype ms-2x stat-icon"></i>
                                    <el-tooltip content="Number of Unique Non-Evergreen Keywords" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ activeCube.stats?.uniqueNonEvergreenKeywords ?? 0 }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.uniqueNonEvergreenKeywords" />
                                            </div>
                                            <div class="stat-label">Non-Evergreen Keywords <span class="stat-secondary">({{ activeCube.stats?.uniqueKeywords ?? 0 }} total)</span></div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item" v-if="activeCube.stats?.totalUniqueCards !== activeCube.stats?.totalCards">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <el-tooltip content="Number of unique cards by oracle ID, as a percentage of the total" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ formatPercentage(activeCube.stats?.totalUniqueCards, activeCube.stats?.totalCards) }}
                                            </div>
                                            <div class="stat-label">Unique Cards <span class="stat-secondary">({{ activeCube.stats?.totalUniqueCards ?? 0 }})</span></div>
                                        </div>
                                    </el-tooltip>
                                </div>
                            </div>
                        </el-col>

                        <el-col :span="24">
                            <h4 class="stat-section-title">Additional Information</h4>
                            <div class="stat-grid">
                                <div class="stat-item">
                                    <i class="ms ms-counter-time ms-2x stat-icon"></i>
                                    <el-tooltip content="Average Release Year of Cards in the Cube (± Standard Deviation)" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ Math.round(activeCube.stats?.averageReleaseYear ?? 0) }} <span class="stat-secondary">(±{{ (activeCube.stats?.averageReleaseYearStdDev ?? 0).toFixed(1) }})</span>
                                                <StatCmpIndicator :comparison="activeCubeComparisons.averageReleaseYear" />
                                            </div>
                                            <div class="stat-label">Avg. Release Year</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-counter-time ms-2x stat-icon"></i>
                                    <el-tooltip content="Median Release Year of Cards in the Cube (± Median Absolute Deviation)" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ Math.round(activeCube.stats?.medianReleaseYear ?? 0) }} <span class="stat-secondary">(±{{ (activeCube.stats?.medianReleaseYearMAD ?? 0).toFixed(1) }})</span>
                                                <StatCmpIndicator :comparison="activeCubeComparisons.medianReleaseYear" />
                                            </div>
                                            <div class="stat-label">Median Release Year</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-counter-lore ms-2x stat-icon"></i>
                                    <el-tooltip content="Average Oracle Text Word Count, excluding Reminder Text" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ (activeCube.stats?.averageWordCount ?? 0).toFixed(2) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.averageWordCount" />
                                            </div>
                                            <div class="stat-label">Avg. Word Count</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item" v-if="activeCube.stats?.totalUniqueCards !== activeCube.stats?.totalCards">
                                    <i class="ms ms-counter-lore ms-2x stat-icon"></i>
                                    <el-tooltip content="Average Oracle Text Word Count of Unique Cards, excluding Reminder Text" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ (activeCube.stats?.averageWordCountUnique ?? 0).toFixed(2) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.averageWordCountUnique" />
                                            </div>
                                            <div class="stat-label">Avg. Word Count (Unique)</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-ability-defender ms-2x stat-icon"></i>
                                    <el-tooltip content="Average CubeCobra Card Elo Rating" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ (activeCube.stats?.averageElo ?? 0).toFixed(2) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.averageElo" />
                                            </div>
                                            <div class="stat-label">Avg. Card Elo</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-wotc ms-2x stat-icon"></i>
                                    <el-tooltip content="Average CubeCobra Card Popularity Score" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ (activeCube.stats?.averagePopularity ?? 0).toFixed(2) }} %
                                                <StatCmpIndicator :comparison="activeCubeComparisons.averagePopularity" />
                                            </div>
                                            <div class="stat-label">Avg. Card Popularity</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-counter-brick-print ms-2x stat-icon"></i>
                                    <el-tooltip content="Average Cosine Similarity Score vs. Other Loaded Cubes" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ formatPercentage(avgSimilarityScore, 1) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.avgSimilarityScore" />
                                            </div>
                                            <div class="stat-label">Avg. Similarity</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon"></i>
                                    <el-tooltip content="Cards Released in the Last 12 Months" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ formatPercentage(activeCube.stats?.newCards, activeCube.stats?.totalCards) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.newCardRatio" />
                                            </div>
                                            <div class="stat-label">New Cards <span class="stat-secondary">({{ activeCube.stats?.newCards ?? 0 }})</span></div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-counter-rad ms-2x stat-icon"></i>
                                    <el-tooltip content="Cards with Abnormal Layouts (e.g. Split, Flip, MDFCs, etc.)" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ formatPercentage(activeCube.stats?.cardCounts?.abnormalLayout, activeCube.stats?.totalCards) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.abnormalLayoutRatio" />
                                            </div>
                                            <div class="stat-label">Abnormal Layout <span class="stat-secondary">({{ activeCube.stats?.cardCounts?.abnormalLayout ?? 0 }})</span></div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-transformers ms-2x stat-icon"></i>
                                    <el-tooltip content="Cards originally from Universes Beyond Products (includes Standard sets)" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ formatPercentage(activeCube.stats?.cardCounts?.universesBeyond, activeCube.stats?.totalCards) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.universesBeyondRatio" />
                                            </div>
                                            <div class="stat-label">Universes Beyond <span class="stat-secondary">({{ activeCube.stats?.cardCounts?.universesBeyond ?? 0 }})</span></div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-counter-goad ms-2x stat-icon"></i>
                                    <el-tooltip content="Cards originally from Supplemental Products (includes Portal)" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">
                                                {{ formatPercentage(activeCube.stats?.cardCounts?.supplementalProduct, activeCube.stats?.totalCards) }}
                                                <StatCmpIndicator :comparison="activeCubeComparisons.supplementalProductRatio" />
                                            </div>
                                            <div class="stat-label">Supplemental Product <span class="stat-secondary">({{ activeCube.stats?.cardCounts?.supplementalProduct ?? 0 }})</span></div>
                                        </div>
                                    </el-tooltip>
                                </div>
                            </div>
                        </el-col>

                        <el-col :span="24">
                            <h4 class="stat-section-title">Pricing</h4>
                            <div class="stat-grid">
                                <div class="stat-item">
                                    <i class="ms ms-ability-forage ms-2x stat-icon"></i>
                                    <el-tooltip content="Total Minimum Price of the Cube in USD" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">${{ formatPrice(activeCube.stats?.totalMinPriceUsd ?? 0) }}</div>
                                            <div class="stat-label">Min Price (USD)</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-ability-forage ms-2x stat-icon"></i>
                                    <el-tooltip content="Total Minimum Price of the Cube in MTGO Tix" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value">{{ formatPrice(activeCube.stats?.totalMinPriceTix ?? 0) }}</div>
                                            <div class="stat-label">Min Price (Tix)</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                            </div>
                        </el-col>

                        <el-col :span="24">
                            <h4 class="stat-section-title">Playability</h4>
                            <div class="stat-grid">
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <el-tooltip content="Whether the cube is playable on MTG Arena" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value" :class="activeCube.stats?.arenaPlayable ? 'stat-value--positive' : 'stat-value--negative'">
                                                Arena
                                            </div>
                                            <div class="stat-label">{{ activeCube.stats?.arenaPlayable ? 'Playable' : 'Not Playable' }}</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <el-tooltip content="Whether the cube is playable on MTGO" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value" :class="activeCube.stats?.mtgoPlayable ? 'stat-value--positive' : 'stat-value--negative'">
                                                MTGO
                                            </div>
                                            <div class="stat-label">{{ activeCube.stats?.mtgoPlayable ? 'Playable' : 'Not Playable' }}</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                                <div class="stat-item">
                                    <i class="ms ms-watermark-cutiemark-sparkle ms-2x stat-icon stat-icon-fallback"></i>
                                    <el-tooltip content="Whether the cube is playable in Paper (no Digital-only printings, no Custom cards)" placement="top" :hide-after="50" :enterable="false">
                                        <div>
                                            <div class="stat-value" :class="activeCube.stats?.paperPlayable ? 'stat-value--positive' : 'stat-value--negative'">
                                                Paper
                                            </div>
                                            <div class="stat-label">{{ activeCube.stats?.paperPlayable ? 'Playable' : 'Not Playable' }}</div>
                                        </div>
                                    </el-tooltip>
                                </div>
                            </div>
                        </el-col>

                        <el-col :span="24" v-if="activeCube.stats?.graveyardOrderMatters">
                            <div class="graveyard-warning">
                                ⚠️ This cube contains cards that care about Graveyard Order
                            </div>
                        </el-col>
                    </el-row>
                    <el-divider />
                    <el-row>
                        <el-col :span="24">
                            <div class="external-links">
                                <el-space wrap>
                                    <el-button tag="a" :href="`https://cubecobra.com/cube/about/${externalCubeId(activeCube)}`" target="_blank">CubeCobra</el-button>
                                    <el-button tag="a" :href="`https://hedron.network/cube-results/?cubeId=${externalCubeId(activeCube)}`" target="_blank">Hedron Network</el-button>
                                    <el-button tag="a" :href="`https://luckypaper.co/resources/cube-map/?cube=${externalCubeId(activeCube)}`" target="_blank">LuckyPaper Cube Map</el-button>
                                </el-space>
                            </div>
                        </el-col>
                        <el-col v-if="isMobile" :span="24" class="fetched-at-row">
                            <el-text tag="small" type="info">
                                Data fetched: {{ isRefreshing ? 'updating...' : formattedFetchedAt }}
                            </el-text>
                            <el-button
                                v-if="!isSnapshot(activeCube)"
                                :icon="Refresh"
                                size="small"
                                text
                                :loading="isRefreshing"
                                :disabled="isRefreshing"
                                @click="handleRefresh"
                                style="margin-left: 8px;"
                            >
                                Refresh
                            </el-button>
                        </el-col>
                    </el-row>
                </el-tab-pane>

                <el-tab-pane label="List" :lazy="true">
                    <CubeListView :cards="activeCubeCards" />
                </el-tab-pane>

                <el-tab-pane label="Charts">
                    <el-row justify="space-between" class="chart-row" :gutter="20">
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <ManaValueChart class="chart" :cmcDistribution="activeCube.stats?.cmcDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <ReleaseYearChart
                                    class="chart"
                                    :releaseYearDistribution="activeCube.stats?.releaseYearDistribution || {}"
                                    :averageReleaseYear="activeCube.stats?.averageReleaseYear ?? 0"
                                    :averageReleaseYearStdDev="activeCube.stats?.averageReleaseYearStdDev ?? 0"
                                    :medianReleaseYear="activeCube.stats?.medianReleaseYear ?? 0"
                                    :medianReleaseYearMAD="activeCube.stats?.medianReleaseYearMAD ?? 0"
                                />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <ColorIdentityDistributionChart class="chart" :colorDistribution="activeCube.stats?.colorIdentityDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <TypeLineDistributionChart class="chart" :primaryTypeDistribution="activeCube.stats?.primaryTypeDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <RarityDistributionChart class="chart" :rarityDistribution="activeCube.stats?.rarityDistribution || {}" :minimumRarityDistribution="activeCube.stats?.minRarityDistribution || {}" />
                            </div>
                        </el-col>
                        <el-col :span="12" :xs="24" :md="12" :xl="8">
                            <div style="height: 300px;">
                                <LegalityDistributionChart class="chart" :legalityDistribution="activeCube.stats?.minimumFormatLegalityDistribution || {}" />
                            </div>
                        </el-col>
                    </el-row>
                </el-tab-pane>

                <el-tab-pane :label="`Keywords (${activeCube.stats?.uniqueKeywords})`">
                    <KeywordTable :keywords="activeCube.stats?.keywords || {}" :totalCards="activeCube.stats?.totalCards || 1" />
                </el-tab-pane>

                <el-tab-pane :label="`Sets (${Object.keys(activeCube.stats?.setCodeDistribution || {}).length})`">
                    <SetNameTable :setCodeDistribution="activeCube.stats?.setCodeDistribution || {}" :totalCards="activeCube.stats?.totalCards || 1" />
                </el-tab-pane>

                <el-tab-pane :label="`Tokens (${activeCube.stats?.uniqueTokenCount ?? 0})`" :lazy="true">
                    <div class="tokens-tab">
                        <div v-for="entry in tokensTabData" :key="entry.tokenId" class="token-entry">
                            <el-image
                                :src="entry.token!.urlFront"
                                fit="contain"
                                class="token-image"
                                lazy
                            >
                                <template #placeholder>
                                    <div class="token-image-placeholder" />
                                </template>
                            </el-image>
                            <div class="token-info">
                                <div class="token-name">
                                    <el-text truncated>{{ entry.token!.name }}</el-text>
                                    <el-tag type="info" size="small" style="margin-left: 6px;">{{ entry.sources.length }}</el-tag>
                                </div>

                                <div class="token-type">{{ entry.token!.typeLine }}</div>
                                <div v-if="entry.token!.power !== undefined" class="token-pt">
                                    {{ entry.token!.power }}/{{ entry.token!.toughness }}
                                </div>
                                <div class="token-sources">
                                    <el-tooltip
                                        v-for="card in entry.sources"
                                        :key="card.oracleId"
                                        effect="light"
                                        placement="right"
                                        popper-class="card-tooltip"
                                        :show-after="50"
                                        :hide-after="50"
                                        :enterable="false"
                                        :offset="16"
                                    >
                                        <template #content>
                                            <el-image :src="card.urlFront" fit="contain" :class="['card-image', card.setCode?.toLowerCase()]" />
                                        </template>
                                        <el-link @click="openCardDetailDialog?.(card.oracleId)" class="token-source-name" underline="never">{{ card.name }}</el-link>
                                    </el-tooltip></div>
                            </div>
                        </div>
                        <el-empty v-if="tokensTabData.length === 0" description="No tokens found" />
                    </div>
                </el-tab-pane>

                <el-tab-pane label="Similar Cubes">
                    <SimilarCubesTable
                        :similarityMatrix="similarityMatrix"
                        :loadedCubes="overviewTableData"
                        :cubeId="activeCube.id"
                    />
                </el-tab-pane>

                <!-- <el-tab-pane label="Themes" :lazy="true">
                    <ArchetypeAnalysis :cubeCards="activeCubeCards" />
                </el-tab-pane> -->

                <el-tab-pane :label="historyTabLabel">
                    <div class="history-tab">
                        <section class="history-presets">
                            <h4 class="history-section-title">Load snapshot from…</h4>
                            <div class="history-preset-buttons">
                                <el-button
                                    v-for="preset in snapshotPresets"
                                    :key="preset.label"
                                    :disabled="snapshotLoading"
                                    @click="loadPreset(preset.offsetMs)"
                                >
                                    {{ preset.label }}
                                </el-button>
                            </div>
                        </section>

                        <section class="history-custom">
                            <h4 class="history-section-title">Or pick a date</h4>
                            <div class="history-custom-row">
                                <el-date-picker
                                    v-model="customSnapshotDate"
                                    type="date"
                                    placeholder="Pick a date"
                                    :disabled-date="isFutureDate"
                                />
                                <el-button
                                    type="primary"
                                    :disabled="!customSnapshotDate || snapshotLoading"
                                    @click="loadCustomSnapshot"
                                >
                                    Load snapshot
                                </el-button>
                            </div>
                        </section>

                        <section class="history-loaded">
                            <h4 class="history-section-title">Loaded snapshots</h4>
                            <div v-if="!liveCubeLoaded" class="history-live-missing">
                                <el-icon><InfoFilled /></el-icon>
                                <span>Live cube not loaded.</span>
                                <el-link type="primary" underline="never" :loading="loadingLive" @click="loadAndOpenLiveCube">Load live</el-link>
                            </div>
                            <div v-if="historyRows.length === 0" class="history-empty">
                                No snapshots yet. Pick a date above to load one.
                            </div>
                            <div v-else>
                                <div v-for="row in historyRows" :key="row.id" class="history-snapshot-row">
                                    <el-image v-if="row.cube.thumbnail" :src="row.cube.thumbnail" fit="cover" class="history-snapshot-thumb" />
                                    <div class="history-snapshot-name">
                                        <div>
                                            <el-link
                                                v-if="row.id !== activeCube?.id"
                                                underline="never"
                                                @click="openSnapshot(row)"
                                            >{{ displayName(row.cube) }}</el-link>
                                            <span v-else>{{ displayName(row.cube) }}</span>
                                        </div>
                                        <div class="history-snapshot-sub">
                                            <el-tag v-if="row.state === 'loaded-visible'" type="success" size="small">In Overview</el-tag>
                                            <el-tag v-else-if="row.state === 'loaded-hidden'" type="info" size="small">Loaded · Hidden</el-tag>
                                            <el-tag v-else type="info" size="small">Cached</el-tag>
                                            <span v-if="row.cube.lastModified" class="history-snapshot-modified" :title="new Date(row.cube.lastModified).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC' })">
                                                {{ new Date(row.cube.lastModified).toISOString().slice(0, 10) }}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="history-snapshot-actions">
                                        <el-button
                                            size="small"
                                            :loading="compareLoadingFor === row.id"
                                            @click="compareSnapshotWithLive(row)"
                                        >Compare vs Live</el-button>
                                        <el-button
                                            v-if="row.state === 'loaded-visible'"
                                            size="small"
                                            @click="setHidden(row.id, true)"
                                        >Hide</el-button>
                                        <el-button
                                            v-else-if="row.state === 'loaded-hidden'"
                                            size="small"
                                            @click="setHidden(row.id, false)"
                                        >Show in Overview</el-button>
                                        <el-button
                                            v-if="row.state !== 'cached-only'"
                                            size="small"
                                            type="warning"
                                            plain
                                            @click="unload(row.id)"
                                        >Unload</el-button>
                                        <el-button
                                            v-else
                                            size="small"
                                            type="danger"
                                            plain
                                            @click="forget(row.id)"
                                        >Forget</el-button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </el-tab-pane>

                <el-tab-pane label="Sample Pack" :lazy="true">
                    <div class="sample-pack">
                        <el-button @click="generateNewPack" style="margin-bottom: 1em;">Generate New Pack</el-button>
                        <div class="sample-pack-image-container">
                            <div class="sample-pack-aspect-box">
                                <el-image
                                    :src="samplePackUrl"
                                    fit="contain"
                                    class="sample-pack-image"
                                >
                                    <template #placeholder>
                                        <el-icon class="is-loading sample-pack-loading"><Loading /></el-icon>
                                    </template>
                                </el-image>
                            </div>
                        </div>
                    </div>
                </el-tab-pane>
            </el-tabs>
        </template>

        <template v-if="!isMobile" #footer>
            <div class="dialog-footer">
                <div class="fetched-at-row">
                    <el-text tag="small" type="info">
                        Data fetched: {{ isRefreshing ? 'updating...' : formattedFetchedAt }}
                    </el-text>
                    <el-button
                        v-if="!isSnapshot(activeCube)"
                        :icon="Refresh"
                        size="small"
                        text
                        :loading="isRefreshing"
                        :disabled="isRefreshing"
                        @click="handleRefresh"
                        style="margin-left: 8px;"
                    >
                        Refresh
                    </el-button>
                </div>
                <el-button @click="$emit('close')">Close</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, toRef, type Ref } from 'vue';
import { useDateFormat, useWindowSize } from '@vueuse/core';
import { Loading, Link, Refresh, Clock, InfoFilled, Hide, View, Delete } from '@element-plus/icons-vue';
import { isSnapshot, displayName, externalCubeId, snapshotDateLabel } from '../util/Snapshots';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Cube, CubeCard, SimilarityMatrix } from '../types';
import type { ScryfallToken } from '../types/scryfall';
import { formatPrice } from '../util/HelperFunctions';
import { getTokens } from '../util/CubeFunctions';
import { getCategoryTagColor, getCategoryTooltip } from '../util/CubeCategories';
import { listCachedSnapshots, evictCube } from '../util/CubeCache';
import type { CachedCube } from '../util/CubeCache';
import ManaValueChart from './charts/basic/ManaValueChart.vue';
import ReleaseYearChart from './charts/basic/ReleaseYearChart.vue';
import ColorIdentityDistributionChart from './charts/distributions/ColorIdentityDistributionChart.vue';
import TypeLineDistributionChart from './charts/distributions/TypeLineDistributionChart.vue';
import RarityDistributionChart from './charts/distributions/RarityDistributionChart.vue';
import LegalityDistributionChart from './charts/distributions/LegalityDistributionChart.vue';
import KeywordTable from './KeywordTable.vue';
import SetNameTable from './SetNameTable.vue';
import StatCmpIndicator from './StatCmpIndicator.vue';
import SimilarCubesTable from './SimilarCubesTable.vue';
import CubeListView from './CubeListView.vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    modal: {
        type: Boolean,
        default: true,
    },
    cubeRow: {
        type: Object as () => Cube | null,
        default: null,
    },
    cubeCards: {
        type: Array as () => CubeCard[],
        default: () => [],
    },
    similarityMatrix: {
        type: Object as () => SimilarityMatrix,
        required: true,
    },
    overviewTableData: {
        type: Array as () => Cube[],
        required: true,
    },
    loadedCubes: {
        type: Object as () => Record<string, Cube>,
        default: () => ({}),
    },
    peerStats: {
        type: Object as () => Record<string, { mean: number; stddev: number }> | null,
        default: null,
    },
});

defineEmits(['close']);

const { width: windowWidth } = useWindowSize();
const isMobile = computed(() => windowWidth.value <= 760);

const openCardDetailDialog = inject<(oracleId: string) => void>('openCardDetailDialog');
const openCubeDetailDialog = inject<(id: string) => void>('openCubeDetailDialog');
const refreshCube = inject<(id: string) => Promise<void>>('refreshCube');
const refreshingCubeIds = inject<Ref<Set<string>>>('refreshingCubeIds', ref(new Set()));
const addCube = inject<(id: string, opts?: { refresh?: boolean; hidden?: boolean }) => Promise<void>>('addCube');
const popDetail = inject<() => void>('popDetail');

// Convert loadedCubes prop to Ref for computed properties
const loadedCubesRef = toRef(props, 'loadedCubes');

const activeCubeId = ref<string | null>(null);

const activeCube = computed(() => {
    if (!activeCubeId.value) return props.cubeRow;
    return props.overviewTableData.find(c => c.id === activeCubeId.value) || props.cubeRow;
});

const baseCubeId = computed(() => externalCubeId(activeCube.value ?? { id: '' }));
const liveCubeLoaded = computed(() => !!loadedCubesRef.value[baseCubeId.value]);

const loadingLive = ref(false);

const openLiveCube = () => {
    if (openCubeDetailDialog && liveCubeLoaded.value) {
        openCubeDetailDialog(baseCubeId.value);
    }
};

const loadAndOpenLiveCube = async () => {
    if (!addCube) return;
    loadingLive.value = true;
    try {
        await addCube(baseCubeId.value);
        if (liveCubeLoaded.value) openLiveCube();
    } finally {
        loadingLive.value = false;
    }
};

const addSnapshot = inject<(baseCubeId: string, requestedDate: number, opts?: { hidden?: boolean }) => Promise<{ key: string; deduped: boolean } | null>>('addSnapshot');
const removeCube = inject<(id: string) => void>('removeCube');
const navigateToComparison = inject<(cubeAId: string, cubeBId: string) => void>('navigateToComparison');

const snapshotPresets = [
    { label: '3 months ago', offsetMs: 3 * 30 * 24 * 60 * 60 * 1000 },
    { label: '6 months ago', offsetMs: 6 * 30 * 24 * 60 * 60 * 1000 },
    { label: '12 months ago', offsetMs: 12 * 30 * 24 * 60 * 60 * 1000 },
    { label: '24 months ago', offsetMs: 24 * 30 * 24 * 60 * 60 * 1000 },
];

const customSnapshotDate = ref<Date | null>(null);
const snapshotLoading = ref(false);
const compareLoadingFor = ref<string | null>(null);

const cachedSnapshots = ref<CachedCube[]>([]);

const refreshCachedSnapshots = async () => {
    if (!baseCubeId.value) {
        cachedSnapshots.value = [];
        return;
    }
    cachedSnapshots.value = await listCachedSnapshots(baseCubeId.value);
};

// Refresh whenever the dialog switches to a different cube
watch(baseCubeId, () => { refreshCachedSnapshots(); }, { immediate: true });

const isFutureDate = (d: Date) => d.getTime() > Date.now();

type HistoryRow = {
    state: 'loaded-visible' | 'loaded-hidden' | 'cached-only';
    id: string;
    cube: Pick<Cube, 'id' | 'name' | 'thumbnail' | 'baseCubeId' | 'snapshotDate' | 'lastModified' | 'hidden'>;
};

const historyRows = computed<HistoryRow[]>(() => {
    if (!baseCubeId.value) return [];

    const loaded = Object.values(loadedCubesRef.value)
        .filter((c: any) => isSnapshot(c) && externalCubeId(c) === baseCubeId.value);

    const loadedIds = new Set(loaded.map((c: any) => c.id));

    const rows: HistoryRow[] = loaded.map((c: any) => ({
        state: c.hidden ? 'loaded-hidden' : 'loaded-visible',
        id: c.id,
        cube: c,
    }));

    for (const cached of cachedSnapshots.value) {
        if (!loadedIds.has(cached.id)) {
            rows.push({
                state: 'cached-only',
                id: cached.id,
                cube: cached.data as any,
            });
        }
    }

    rows.sort((a, b) => (b.cube.snapshotDate ?? 0) - (a.cube.snapshotDate ?? 0));
    return rows;
});

const historyTabLabel = computed(() => {
    const n = historyRows.value.length;
    return n > 0 ? `History (${n})` : 'History';
});

const loadPreset = async (offsetMs: number) => {
    if (!addSnapshot) return;
    snapshotLoading.value = true;
    try {
        await addSnapshot(baseCubeId.value, Date.now() - offsetMs, { hidden: true });
        await refreshCachedSnapshots();
    } finally {
        snapshotLoading.value = false;
    }
};

const loadCustomSnapshot = async () => {
    if (!addSnapshot || !customSnapshotDate.value) return;
    // Use noon UTC of the selected day to avoid timezone edge effects
    const d = customSnapshotDate.value;
    const utcNoon = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    snapshotLoading.value = true;
    try {
        await addSnapshot(baseCubeId.value, utcNoon, { hidden: true });
        customSnapshotDate.value = null;
        await refreshCachedSnapshots();
    } finally {
        snapshotLoading.value = false;
    }
};

const setHidden = (id: string, hidden: boolean) => {
    const current = loadedCubesRef.value[id];
    if (!current) return;
    // Reassign to a new object to trigger Vue's reactive proxy.
    loadedCubesRef.value[id] = { ...current, hidden };
};

const unload = async (id: string) => {
    if (!removeCube) return;
    const isActive = activeCube.value?.id === id;
    removeCube(id);
    await refreshCachedSnapshots();
    if (isActive && popDetail) popDetail();
};

const forget = async (id: string) => {
    if (loadedCubesRef.value[id] && removeCube) {
        const isActive = activeCube.value?.id === id;
        removeCube(id);
        if (isActive && popDetail) popDetail();
    }
    await evictCube(id);
    await refreshCachedSnapshots();
};

const openSnapshot = async (row: HistoryRow) => {
    if (!openCubeDetailDialog) return;
    if (row.state === 'cached-only' && addSnapshot && row.cube.snapshotDate != null) {
        await addSnapshot(baseCubeId.value, row.cube.snapshotDate, { hidden: true });
        await refreshCachedSnapshots();
    }
    openCubeDetailDialog(row.id);
};

const compareSnapshotWithLive = async (row: HistoryRow) => {
    if (!navigateToComparison || !addCube || !addSnapshot) return;
    compareLoadingFor.value = row.id;
    try {
        if (row.state === 'cached-only' && row.cube.snapshotDate != null) {
            await addSnapshot(baseCubeId.value, row.cube.snapshotDate, { hidden: true });
        }
        if (!liveCubeLoaded.value) {
            await addCube(baseCubeId.value, { hidden: true });
        }
        await refreshCachedSnapshots();
        navigateToComparison(baseCubeId.value, row.id);
    } finally {
        compareLoadingFor.value = null;
    }
};

const isRefreshing = computed(() => {
    const id = activeCube.value?.id;
    if (!id) return false;
    return refreshingCubeIds.value.has(id);
});

const handleRefresh = async () => {
    const id = activeCube.value?.id;
    if (!id || !refreshCube) return;
    await refreshCube(id);
};

// Reset activeCubeId whenever the dialog opens with a new cube
watch(() => props.cubeRow, (newRow) => {
    activeCubeId.value = newRow?.id || null;
    samplePackSeed.value = Date.now();
});

const activeCubeCards = computed(() => {
    if (!activeCubeId.value) return props.cubeCards;
    return props.loadedCubes[activeCubeId.value]?.cards || props.cubeCards;
});

const avgSimilarityScore = computed(() => {
    if (!activeCube.value) return 0;
    const scores = props.similarityMatrix[activeCube.value.id] || {};
    const totalCubes = Object.keys(props.loadedCubes).length - 1;
    if (totalCubes === 0) return 0;
    const totalScore = Object.values(scores).reduce((acc: number, c: any) => acc + c.cosineSimilarity, 0);
    return totalScore / totalCubes;
});

// --- Peer comparison ---
type ComparisonResult = 'high' | 'low';

const cmp = (value: number, key: string): ComparisonResult | null => {
    if (!props.peerStats) return null;
    const s = props.peerStats[key];
    if (!s || s.stddev === 0) return null;
    if (value > s.mean + s.stddev) return 'high';
    if (value < s.mean - s.stddev) return 'low';
    return null;
};

const activeCubeComparisons = computed((): Record<string, ComparisonResult | null> => {
    const cube = activeCube.value;
    if (!cube || !props.peerStats) return {};
    const stats = cube.stats;
    const t = stats?.totalCards || 1;
    return {
        newCardRatio:               cmp((stats?.newCards ?? 0) / t, 'newCardRatio'),
        landRatio:                  cmp((stats?.landCards ?? 0) / t, 'landRatio'),
        creatureRatio:              cmp((stats?.creatureCards ?? 0) / t, 'creatureRatio'),
        removalRatio:               cmp((stats?.cardCounts?.removal ?? 0) / t, 'removalRatio'),
        makesTokensRatio:           cmp((stats?.cardCounts?.makesTokens ?? 0) / t, 'makesTokensRatio'),
        abnormalLayoutRatio:        cmp((stats?.cardCounts?.abnormalLayout ?? 0) / t, 'abnormalLayoutRatio'),
        universesBeyondRatio:       cmp((stats?.cardCounts?.universesBeyond ?? 0) / t, 'universesBeyondRatio'),
        supplementalProductRatio:   cmp((stats?.cardCounts?.supplementalProduct ?? 0) / t, 'supplementalProductRatio'),
        uniqueTokenCount:           cmp((stats?.uniqueTokenCount ?? 0) / t, 'uniqueTokenCount'),
        avgSimilarityScore:         cmp(avgSimilarityScore.value, 'avgSimilarityScore'),
        averageNonLandCmc:          cmp(stats?.averageNonLandCmc ?? 0, 'averageNonLandCmc'),
        averageElo:                 cmp(stats?.averageElo ?? 0, 'averageElo'),
        averagePopularity:          cmp(stats?.averagePopularity ?? 0, 'averagePopularity'),
        blendedRarityScore:         cmp(stats?.blendedRarityScore ?? 0, 'blendedRarityScore'),
        averageReleaseYear:         cmp(stats?.averageReleaseYear ?? 0, 'averageReleaseYear'),
        medianReleaseYear:          cmp(stats?.medianReleaseYear ?? 0, 'medianReleaseYear'),
        averageWordCount:           cmp(stats?.averageWordCount ?? 0, 'averageWordCount'),
        averageWordCountUnique:     cmp(stats?.averageWordCountUnique ?? 0, 'averageWordCountUnique'),
        uniqueKeywords:             cmp((stats?.uniqueKeywords ?? 0) / t, 'uniqueKeywords'),
        uniqueNonEvergreenKeywords: cmp((stats?.uniqueNonEvergreenKeywords ?? 0) / t, 'uniqueNonEvergreenKeywords'),
    };
});

const formattedLastModified = computed(() => {
    const ts = activeCube.value?.lastModified;
    if (!ts) return 'N/A';
    return new Date(ts).toISOString().slice(0, 10);
});

const fullLastModified = computed(() => {
    const ts = activeCube.value?.lastModified;
    if (!ts) return undefined;
    try {
        return new Date(ts).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC' });
    } catch {
        return undefined;
    }
});

const formattedFetchedAt = computed(() => {
    const ts = activeCube.value?.fetchedAt;
    if (!ts) return 'N/A';
    return useDateFormat(new Date(ts), 'YYYY-MM-DD HH:mm').value;
});

const formatPercentage = (value: number | undefined, total: number | undefined) => {
    const v = value ?? 0;
    const t = total ?? 1;
    return ((v / t) * 100).toFixed(2) + '%';
};

const renderedBrief = computed(() => {
    const brief = activeCube.value?.brief;
    if (!brief) return '';
    return DOMPurify.sanitize(marked.parse(brief, { async: false }) as string);
});

// Sample Pack
const samplePackSeed = ref(Date.now());

const samplePackUrl = computed(() => {
    if (!activeCube.value) return '';
    return `https://cubecobra.com/cube/samplepackimage/${externalCubeId(activeCube.value)}/${samplePackSeed.value}`;
});

const generateNewPack = () => {
    samplePackSeed.value = Date.now();
};

// Tokens tab: unique tokens from the active cube, sorted alphabetically, with the cards that produce each
const tokensTabData = computed(() => {
    const tokenMap = getTokens();
    const tokenToCards = new Map<string, CubeCard[]>();

    activeCubeCards.value.forEach(card => {
        (card.tokenOracleIds ?? []).forEach(tokenId => {
            if (!tokenToCards.has(tokenId)) tokenToCards.set(tokenId, []);
            tokenToCards.get(tokenId)!.push(card);
        });
    });

    return Array.from(tokenToCards.entries())
        .map(([tokenId, sources]) => ({
            tokenId,
            token: tokenMap[tokenId] as ScryfallToken | undefined,
            sources,
        }))
        .filter(entry => entry.token !== undefined)
        .sort((a, b) => (a.token!.name).localeCompare(b.token!.name));
});
</script>

<style scoped>
.cube-dialog-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.cube-dialog-image {
    width: 65px;
    height: 50px;
    border-radius: 8px;
    overflow: hidden;
}

.cube-dialog-title-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
}

.cube-dialog-name {
    font-size: 1.25rem;
    font-weight: 600;
}

.cube-dialog-owner {
    font-size: 0.875rem;
    color: var(--el-text-color-secondary);
}

.cube-dialog-snapshot-meta {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: var(--el-text-color-secondary);
}

.cube-dialog-snapshot-sep {
    color: var(--el-text-color-disabled);
}

.cube-dialog-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 8px;
    font-size: 0.8rem;
    color: var(--el-text-color-secondary);
}

.cube-dialog-meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
}

.cube-dialog-meta-item strong {
    color: var(--el-text-color-primary);
    font-weight: 500;
}

.cube-dialog-brief {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: var(--el-text-color-secondary);
    line-height: 1.4;

    :deep(p) {
        margin: 0;
    }
}

:deep(.el-tabs__content) {
    min-height: 60vh;
}

.chart-row {
    :deep(.chart) {
        width: unset;
        margin: 0 auto;
    }
}

.sample-pack {
    text-align: center;
}

.sample-pack-image-container {
    display: flex;
    justify-content: center;
}

.sample-pack-aspect-box {
    max-width: 1200px;
    width: 100%;
    aspect-ratio: 2440 / 2040;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sample-pack-image {
    min-height: 25%;
    width: 100%;
}

.sample-pack-loading {
    font-size: 2rem;
    color: var(--el-text-color-secondary);
    padding: 4rem;
}

.details-tab.el-row .el-col {
    padding: 10px 0;
}

.fetched-at-row {
    display: flex;
    align-items: center;
    padding: 10px;
    padding-top: 4px;
}

.dialog-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.tokens-tab {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    padding: 8px 0;

    @media (max-width: 760px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }
}

.token-entry {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.token-image {
    width: 100%;
    aspect-ratio: 745 / 1040;
    border-radius: 4.75% / 3.5%;
    background: var(--el-fill-color-light);
}

.token-image-placeholder {
    width: 100%;
    height: 100%;
    background: var(--el-fill-color-light);
    border-radius: 4.75% / 3.5%;
}

.token-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.token-name {
    font-weight: 600;
    font-size: 13px;

    display: flex;
}

.token-type {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.token-pt {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.token-sources {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    margin-top: 4px;
}

.token-source-name {
    font-size: 12px;
    color: var(--el-text-color-regular);
    cursor: pointer;
    padding: 1px 0;
    justify-content: flex-start;

    &:hover {
        color: var(--el-color-primary);
    }
}

.external-links {
    padding: 10px 0;
}

.external-links a {
    text-decoration: none;
}

.stat-section-title {
    color: var(--el-text-color-regular);
    margin-bottom: 12px;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
}

.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.stat-icon {
    flex-shrink: 0;
    width: 24px;
    text-align: center;
    opacity: 0.8;
}

.stat-icon-fallback {
    opacity: 0.5;
    color: var(--el-text-color-secondary);
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--el-text-color-primary);
}

.stat-label {
    font-size: 0.7rem;
    color: var(--el-text-color-secondary);
}

.stat-secondary {
    font-size: 0.68rem;
    color: var(--el-text-color-placeholder);
}

.graveyard-warning {
    background: rgba(230, 162, 60, 0.1);
    border: 1px solid rgba(230, 162, 60, 0.3);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 0.8rem;
    color: var(--el-color-warning);
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.stat-value--positive {
    color: #67c23a;
}

.stat-value--negative {
    color: #f56c6c;
}

.history-tab {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0.5rem 0;
}

.history-section-title {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    color: var(--el-text-color-primary);
}

.history-preset-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.history-custom-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}

.history-loaded {
    border-top: 1px solid var(--el-border-color-lighter);
    padding-top: 1rem;
}

.history-empty {
    color: var(--el-text-color-secondary);
    font-size: 0.85rem;
    padding: 0.5rem 0;
}

.history-live-missing {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.75rem;
    background: var(--el-color-info-light-9);
    border-radius: 4px;
    font-size: 0.85rem;
}

.history-snapshot-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.history-snapshot-thumb {
    width: 50px;
    height: 35px;
    border-radius: 4px;
}

.history-snapshot-name {
    flex: 1;
    font-weight: 500;
}

.history-snapshot-sub {
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;
}

.history-snapshot-modified {
    font-variant-numeric: tabular-nums;
}

.history-snapshot-actions {
    display: flex;
    gap: 0.4rem;
}

</style>
