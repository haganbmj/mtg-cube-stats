<template>
    <el-dialog
        v-model="visible"
        title="Filter Syntax Reference"
        width="780px"
        :append-to-body="true"
        class="card-filter-help"
    >
        <div class="help-content">
            <p class="help-intro">
                Type a query in the search box to filter cards. Terms are combined with implicit
                <code>AND</code>. Use <code>OR</code> between terms, prefix a term with <code>-</code>
                to negate it, and group terms with <code>( )</code>.
            </p>
            <p class="help-examples-intro">
                <strong>Quick examples:</strong>
                <code>t:creature cmc&lt;=2</code>&nbsp;&nbsp;
                <code>(t:instant or t:sorcery) c:blue</code>&nbsp;&nbsp;
                <code>elo&gt;=1400 -is:universesbeyond</code>
            </p>

            <el-table :data="FILTER_DOCS" size="small" :border="true" class="help-table">
                <el-table-column prop="keywords" label="Keyword(s)" min-width="160">
                    <template #default="{ row }">
                        <code v-for="kw in row.keywords" :key="kw" class="kw-badge">{{ kw }}</code>
                    </template>
                </el-table-column>
                <el-table-column prop="description" label="Description" />
                <el-table-column prop="examples" label="Examples" min-width="180">
                    <template #default="{ row }">
                        <code v-for="ex in row.examples" :key="ex" class="ex-badge">{{ ex }}</code>
                    </template>
                </el-table-column>
            </el-table>

            <h4 class="help-section-title">Operators</h4>
            <p>
                <code>:</code> — contains / equals &nbsp;
                <code>=</code> — exact match &nbsp;
                <code>!=</code> — not equal &nbsp;
                <code>&lt;</code> <code>&lt;=</code> <code>&gt;</code> <code>&gt;=</code> — numeric comparison
            </p>
            <p>For text fields (<code>name</code>, <code>oracle</code>, <code>type</code>), <code>:</code> is a <em>substring</em> match. For numeric fields it acts as <code>=</code>.</p>

            <h4 class="help-section-title">Color values</h4>
            <p>
                Single letters: <code>w u b r g c</code> (white/blue/black/red/green/colorless).
                Multi-letter strings require <em>all</em> colors: <code>c:rg</code> = red AND green.
                Named guilds, shards, and wedges work too: <code>c:azorius</code>, <code>c:bant</code>.
            </p>

            <h4 class="help-section-title">Rarity values</h4>
            <p><code>common uncommon rare mythic</code> — comparisons respect the ordering (common &lt; uncommon &lt; rare &lt; mythic).</p>

            <h4 class="help-section-title">Cube filter dropdown</h4>
            <p>
                The <strong>cube dropdown</strong> next to the search box lets you include or exclude specific loaded cubes using a point-and-click interface.
                You can also filter by cube name in the text query using <code>cube:&lt;name&gt;</code>.
            </p>
        </div>
    </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue']);

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
});

interface FilterDoc {
    keywords: string[];
    description: string;
    examples: string[];
}

const FILTER_DOCS: FilterDoc[] = [
    // ── Text fields ──────────────────────────────────────────────────────────
    {
        keywords: ['name', 'n', '(bare word)'],
        description: 'Card name contains text. A bare word with no keyword defaults to a name search.',
        examples: ['name:bolt', 'lightning', '"Oko, Thief"'],
    },
    {
        keywords: ['oracle', 'o', 'text'],
        description: 'Oracle text contains phrase.',
        examples: ['o:"draw a card"', 'o:flying'],
    },
    {
        keywords: ['type', 't'],
        description: 'Type line contains text (supertype, type, or subtype).',
        examples: ['t:creature', 't:legendary t:elf', '-t:land'],
    },
    {
        keywords: ['keyword', 'kw'],
        description: 'Card has a specific keyword ability.',
        examples: ['kw:flying', 'kw:trample'],
    },
    {
        keywords: ['tag', 'otag'],
        description: 'Card has a functional tag from Scryfall Tagger.',
        examples: ['tag:removal', 'tag:draw', '-tag:ramp'],
    },
    // ── Color ─────────────────────────────────────────────────────────────────
    {
        keywords: ['color', 'c'],
        description: 'Card\'s colors. ":" means contains all (supersets OK); "=" means exactly these colors. Multi-char values AND all colors together.',
        examples: ['c:u', 'c:rg', 'c=r (exactly red)', 'c:azorius', '-c:b'],
    },
    {
        keywords: ['identity', 'id'],
        description: 'Color identity (for Commander). Same color syntax; ":" contains, "=" exact.',
        examples: ['id:bant', 'id=uw', 'id<=esper'],
    },
    // ── Numeric fields ─────────────────────────────────────────────────────────
    {
        keywords: ['cmc', 'mv', 'manavalue'],
        description: 'Mana value (converted mana cost).',
        examples: ['cmc=3', 'mv<=2', 'cmc>=6'],
    },
    {
        keywords: ['power', 'pow'],
        description: 'Power. Supports numeric comparisons and cross-field comparison to toughness. Non-numeric values (*, 1+*) are excluded.',
        examples: ['pow>=3', 'power=0', 'pow>tou'],
    },
    {
        keywords: ['toughness', 'tou'],
        description: 'Toughness. Supports numeric comparisons and cross-field comparison to power.',
        examples: ['tou>=4', 'toughness=1', 'tou<pow'],
    },
    {
        keywords: ['pt', 'powtou'],
        description: 'Total power plus toughness.',
        examples: ['pt>=6', 'pt=2'],
    },
    {
        keywords: ['wordcount', 'words', 'wc'],
        description: 'Oracle text word count, excluding reminder text in parentheses.',
        examples: ['words=0', 'words<=10', 'wc>30'],
    },
    {
        keywords: ['wordcountreminder', 'wordsrem', 'wcr'],
        description: 'Oracle text word count, including reminder text.',
        examples: ['wcr=0', 'wcr<=15'],
    },
    {
        keywords: ['year', 'released'],
        description: 'Card\'s original release year (integer).',
        examples: ['year>=2020', 'year=2002'],
    },
    {
        keywords: ['date'],
        description: 'Card\'s original release date. Accepts a year, a full date (YYYY-MM-DD), a set code (e.g. mh3 or ltr), or now/today for the current date. Comparisons work on all forms.',
        examples: ['date>=2024', 'date>=2025-03-01', 'date>mh3', 'date<=now'],
    },
    {
        keywords: ['usd'],
        description: 'Lowest USD price across printings.',
        examples: ['usd<1', 'usd>=10'],
    },
    {
        keywords: ['tix'],
        description: 'Lowest MTGO tix price across printings.',
        examples: ['tix<0.5', 'tix>=5'],
    },
    // ── Rarity ─────────────────────────────────────────────────────────────────
    {
        keywords: ['rarity', 'r'],
        description: 'Minimum rarity. Accepts full names or aliases (c=common, u=uncommon, r=rare, m=mythic). Comparisons use the order common < uncommon < rare < mythic.',
        examples: ['r:rare', 'r:r', 'r>=u', 'r>=uncommon', 'r!=m'],
    },
    // ── Set / Layout ──────────────────────────────────────────────────────────
    {
        keywords: ['set', 's', 'e', 'edition'],
        description: 'Set code of the card\'s original printing.',
        examples: ['set:khm', 'e:ltr'],
    },
    {
        keywords: ['settype', 'st'],
        description: 'Type of the original set.',
        examples: ['settype:expansion', 'st:masters'],
    },
    {
        keywords: ['layout'],
        description: 'Card layout.',
        examples: ['layout:transform', '-layout:normal'],
    },
    // ── Format legality ────────────────────────────────────────────────────────
    {
        keywords: ['format', 'f', 'legal'],
        description: 'Card is legal in the given format.',
        examples: ['f:modern', 'f:legacy', '-f:standard'],
    },
    // ── Game availability ──────────────────────────────────────────────────────
    {
        keywords: ['game'],
        description: 'Card is available on the given platform.',
        examples: ['game:paper', 'game:arena', '-game:mtgo'],
    },
    // ── Cube membership ────────────────────────────────────────────────────────
    {
        keywords: ['cube'],
        description: 'Card appears in a loaded cube whose name, key, or short ID contains the text.',
        examples: ['cube:vintage', 'cube:peasant'],
    },
    {
        keywords: ['highlight'],
        description: 'Visually highlights rows whose card appears in the matching cube. Does not filter out any cards — all rows remain visible, but non-matching rows are dimmed.',
        examples: ['highlight:vintage', 'highlight:peasant'],
    },
    // ── CubeCobra stats ────────────────────────────────────────────────────────
    {
        keywords: ['elo'],
        description: 'CubeCobra Elo rating.',
        examples: ['elo>=1400', 'elo<1200'],
    },
    {
        keywords: ['popularity', 'pop'],
        description: 'CubeCobra popularity percentage.',
        examples: ['pop>=5', 'pop<1'],
    },
    {
        keywords: ['cubecount', 'cubes', 'cc'],
        description: 'Number of loaded cubes that contain this card.',
        examples: ['cubecount>=3', 'cc=1'],
    },
    {
        keywords: ['count'],
        description: 'Total copies of this card across all loaded cubes.',
        examples: ['count>1'],
    },
    // ── Boolean flags ──────────────────────────────────────────────────────────
    {
        keywords: ['is:', 'not:'],
        description: 'Boolean flags. "not:" is the inverse of "is:".',
        examples: ['is:universesbeyond', 'not:supplemental', 'is:removal'],
    },
];
</script>

<style scoped>
.help-content {
    max-height: 70vh;
    overflow-y: auto;
    font-size: 13px;
    line-height: 1.6;
}

.help-intro,
.help-examples-intro {
    margin: 0 0 10px 0;
}

.help-table {
    margin-bottom: 16px;
}

.help-section-title {
    margin: 12px 0 4px;
    font-size: 13px;
    font-weight: 600;
    border-bottom: 1px solid var(--el-border-color-lighter);
    padding-bottom: 3px;
}

.kw-badge,
.ex-badge {
    display: inline-block;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color);
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 11px;
    font-family: monospace;
    margin: 2px 2px 2px 0;
    white-space: nowrap;
}

code {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color);
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 12px;
    font-family: monospace;
}
</style>
