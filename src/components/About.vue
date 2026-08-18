<template>
    <div class="about-page" ref="aboutRef">
        <h2>About This Tool</h2>
        <p>This is a static analysis tool for Magic: The Gathering cube collections. It lets you compare cube lists side-by-side, explore card inclusion rates across a group of cubes, and analyze statistical properties of cube contents.</p>
        <p>Data is pre-fetched at build time from <a href="https://cubecobra.com" target="_blank">CubeCobra</a> and <a href="https://scryfall.com" target="_blank">Scryfall</a> — there is no backend server. The cubes available for comparison are configured in preset groups (e.g. CubeCon 2025, Top 100, local event pools).</p>
        <p>The Cards tab includes optional global inclusion rate data, derived from a full CubeCobra bulk export filtered to publicly-accessible cubes updated within the past 12 months. This gives a broader population-level view of how frequently any card appears across the wider cube community.</p>

        <el-divider />

        <h2>Card Data</h2>

        <section>
            <h4>Original Printing</h4>
            <p>All cards are evaluated using their original printing for consistency and to reflect the design context of the time. Any card overrides (color, mana value, etc.) made in CubeCobra are ignored.</p>
        </section>

        <section>
            <h4>Refresh Cadence</h4>
            <p>Card data is sourced from Scryfall's bulk data export and refreshed weekly. Price updates will be delayed accordingly.</p>
        </section>

        <section>
            <h4>"New" Cards</h4>
            <p>Cards with a release date within the last 12 months from the current date.</p>
        </section>

        <section>
            <h4>Elo &amp; Popularity</h4>
            <p>These values are sourced directly from CubeCobra's card details. Cards missing a value default to <code>1200</code> for averaging purposes.</p>
        </section>

        <section>
            <h4>Keywords</h4>
            <p>There are a number of things not classified as "keywords" by the comprehensive rules — Initiative, Monarch, "Becomes Day/Night", etc. Similarly, Adventure is considered a card layout rather than a keyword.</p>
        </section>

        <section>
            <h4>Removal Tag</h4>
            <p>Evaluated using Scryfall Tagger's <code>otag:removal</code> classification.</p>
        </section>

        <section>
            <h4>Word Count</h4>
            <p>Computed from Scryfall's oracle text. Two variants are available:</p>
            <p><em>Word Count (incl. Reminder Text)</em> — The raw word count from the full oracle text.</p>
            <p><em>Word Count</em> — A naive approximation that strips text inside parentheses (i.e. reminder text) before counting. This will catch some false positives where parenthesized text is not actually reminder text.</p>
        </section>

        <section>
            <h4>Minimum Format Legality</h4>
            <p>Represents the smallest sanctioned paper format in which a card is legal, following the hierarchy: <code>Standard &lt; Pioneer &lt; Modern &lt; Legacy &lt; Vintage &lt; Cube-only</code>.</p>
        </section>

        <el-divider />

        <h2>Calculations</h2>

        <section>
            <h3>Similarity</h3>
            <p>
                Cubes are compared using <a href="https://en.wikipedia.org/wiki/Cosine_similarity" target="_blank">Cosine Similarity</a>,
                which handles lists of different sizes well. Each cube's card list is represented as a binary vector over the union of all card oracle IDs.
                For a cube pair $A$ and $B$:
            </p>
            <p class="formula">
                $$\text{similarity}(A, B) = \frac{A \cdot B}{\|A\| \cdot \|B\|}$$
            </p>
            <p>
                To support non-singleton cubes, duplicate copies are handled by recursively appending suffixed entries (e.g. <code>oracle_id</code>, <code>oracle_id+</code>, <code>oracle_id++</code>), so that 3 copies of a card produce 3 distinct vector entries.
                The significance or role of each card is not considered — all cards carry equal weight.
            </p>
        </section>

        <section>
            <h3>Rarity Score</h3>
            <p>
                Provides a single comparative metric for rarity distribution using each card's <strong>minimum rarity</strong> across all printings. Each card is assigned a weight:
            </p>
            <el-table :data="rarityScoreData" style="max-width: 400px;" size="small" :show-header="true" stripe>
                <el-table-column prop="rarity" label="Rarity" />
                <el-table-column prop="weight" label="Weight" align="right" />
            </el-table>
            <p class="formula" style="margin-top: 0.75em;">
                $$\text{Rarity Score} = \frac{1}{n} \sum_{i=1}^{n} w(r_i)$$
            </p>
            <p>where $w(r_i)$ is the weight for card $i$'s minimum rarity and $n$ is the total card count. A pure common cube scores $\approx 0.333$, while a cube of all mythics scores $1.200$.</p>
        </section>

        <section>
            <h3>Mana Value</h3>
            <p>
                Average Mana Value is computed over <strong>non-land cards only</strong> (cards whose effective types do not include "Land"). Lands are excluded to avoid skewing the average downward.
            </p>
        </section>

        <section>
            <h3>Release Year</h3>
            <p>
                All release year statistics <strong>exclude Basic lands</strong> to avoid distortion from frequently reprinted basics.
            </p>

            <h4>Average Release Year (±σ)</h4>
            <p>Arithmetic mean of release years across all non-Basic cards, paired with the <a href="https://en.wikipedia.org/wiki/Standard_deviation" target="_blank">Standard Deviation</a> (σ) as a measure of spread:</p>
            <p class="formula">
                $$\sigma = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(y_i - \bar{y})^2}$$
            </p>
            <p>where $\bar{y}$ is the mean release year. A cube displaying <code>2020 (±4.5)</code> has an average release year of 2020 with a standard deviation of 4.5 years.</p>

            <h4>Median Release Year (±MAD)</h4>
            <p>
                The median release year, paired with the
                <a href="https://en.wikipedia.org/wiki/Median_absolute_deviation" target="_blank">Median Absolute Deviation</a> (MAD)
                as a robust measure of spread:
            </p>
            <p class="formula">
                $$\text{MAD} = \text{median}(|y_i - \tilde{y}|)$$
            </p>
            <p>where $\tilde{y}$ is the median release year. A cube displaying <code>2020 (±3.0)</code> has a median release year of 2020 with half its cards falling within ±3 years of that value.</p>
        </section>

        <section>
            <h3>Assumed Categories</h3>
            <p>
                Categories are inferred from cube contents rather than relying on CubeCobra's user-set classifications.
                The rarity of each card is split into <strong>land</strong> vs. <strong>non-land</strong> buckets using minimum rarity:
            </p>
            <el-table :data="categoryData" style="max-width: 700px;" size="small" :show-header="true" stripe>
                <el-table-column prop="category" label="Category" min-width="120" />
                <el-table-column prop="criteria" label="Criteria" min-width="350" />
            </el-table>

            <h4>Powered</h4>
            <p>Flagged if the cube contains any card from the Power Nine (Ancestral Recall, Black Lotus, Mox Emerald/Jet/Pearl/Ruby/Sapphire, Timetwister, Time Walk).</p>

            <h4>Desert</h4>
            <p>Flagged if ≥28% of the cube's cards are lands.</p>
        </section>

        <el-divider />

        <h2>Miscellaneous</h2>
        <p>Cube Collections are refreshed in chunks throughout the week.</p>
        <p>This site is statically compiled and uses cached information where possible, so collections or card details may be slightly out of date.</p>

        <el-divider />

        <h2>Data Sources</h2>
        <p><a href="https://cubecobra.com" target="_blank">CubeCobra</a> — Cube data, Elo, and Popularity scores.</p>
        <p><a href="https://scryfall.com" target="_blank">Scryfall</a> — Card details, imagery, pricing, and tagging.</p>

        <el-divider />

        <h2>Build Details</h2>
        <p>Repository: <a href="https://github.com/haganbmj/mtg-cube-stats" target="_blank">github.com/haganbmj/mtg-cube-stats</a></p>
        <p>Build SHA: <a :href="'https://github.com/haganbmj/mtg-cube-stats/commit/' + getBuildSha()" target="_blank">{{ getBuildSha() }}</a></p>
        <p>Timestamp: {{ getBuildTimestamp() }}</p>
        <p v-if="frequencyCubesLastModified">CubeCobra Bulk Export (S3) Last Modified: {{ frequencyCubesLastModified }}<template v-if="frequencyTotalCubes"> ({{ frequencyTotalCubes.toLocaleString() }} cubes)</template></p>

        <el-divider />

        <el-text tag="i">This site is not affiliated with or endorsed by Wizards of the Coast, CubeCobra, CubeCon, or Scryfall.</el-text>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import katex from 'katex';
import { getFrequencyData, initFrequencyData } from '../util/CubeCobraFrequency';

initFrequencyData();

const aboutRef = ref<HTMLElement>();

function renderLatex(el: HTMLElement) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodesToReplace: { node: Text; html: string }[] = [];

    while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        const text = textNode.textContent ?? '';
        if (!text.includes('$')) continue;

        // Process display math ($$...$$) then inline math ($...$)
        let result = text;
        let changed = false;

        // Display math
        result = result.replace(/\$\$(.+?)\$\$/g, (_match, expr) => {
            changed = true;
            return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
        });

        // Inline math
        result = result.replace(/\$(.+?)\$/g, (_match, expr) => {
            changed = true;
            return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
        });

        if (changed) {
            nodesToReplace.push({ node: textNode, html: result });
        }
    }

    for (const { node, html } of nodesToReplace) {
        const span = document.createElement('span');
        span.innerHTML = html;
        node.parentNode?.replaceChild(span, node);
    }
}

onMounted(() => {
    if (aboutRef.value) {
        renderLatex(aboutRef.value);
    }
});

function getBuildTimestamp() {
    return import.meta.env.VITE_BUILD_TIMESTAMP;
}

function getBuildSha() {
    return import.meta.env.VITE_BUILD_SHA || 'local';
}

const frequencyCubesLastModified = computed(() => {
    const raw = getFrequencyData()?.cubesLastModified;
    if (!raw) return null;
    // Parse the HTTP date string into a more readable format
    const d = new Date(raw);
    return isNaN(d.getTime()) ? raw : d.toISOString().slice(0, 10);
});
const frequencyTotalCubes = computed(() => getFrequencyData()?.cubeCount?.total ?? null);

const rarityScoreData = [
    { rarity: 'Common', weight: '0.333' },
    { rarity: 'Uncommon', weight: '0.666' },
    { rarity: 'Rare', weight: '1.000' },
    { rarity: 'Mythic', weight: '1.200' },
    { rarity: 'Bonus', weight: '1.000' },
];

const categoryData = [
    { category: 'Pauper', criteria: 'All cards are common' },
    { category: 'Pauper+', criteria: 'All non-land cards are common (lands unrestricted)' },
    { category: 'Pauper-ish', criteria: '≥92.5% of non-land cards are common, all lands are common' },
    { category: 'Pauper+ish', criteria: '≥92.5% of non-land cards are common (lands unrestricted)' },
    { category: 'Peasant', criteria: 'All cards are common or uncommon' },
    { category: 'Peasant+', criteria: 'All non-land cards are common/uncommon (lands unrestricted)' },
    { category: 'Peasant-ish', criteria: '≥92.5% of non-land cards are common/uncommon, all lands are common/uncommon' },
    { category: 'Peasant+ish', criteria: '≥92.5% of non-land cards are common/uncommon (lands unrestricted)' },
];
</script>

<style scoped lang="scss">
.about-page {
    max-width: 1500px;
    margin: 0 auto;
    line-height: 1.6;

    h2 {
        margin-top: 1.5em;
        margin-bottom: 0.5em;
    }

    h3 {
        margin-top: 1.25em;
        margin-bottom: 0.25em;
        margin-left: 0.5em;
    }

    h4 {
        margin-left: 1em;
        margin-top: 0.75em;
        margin-bottom: 0.1em;
        font-size: 0.95em;
    }

    section {
        margin-left: 0.5em;
        margin-bottom: 0.5em;
    }

    p {
        margin: 0.4em 0 0.4em 1em;
    }

    .formula {
        margin: 0.75em 0 0.75em 2em;
    }

    .el-table {
        margin: 0.5em auto;
    }

    .el-divider {
        margin: 1.5em 0;
    }
}
</style>
