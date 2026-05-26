<template>
    <el-dialog
        v-model="visible"
        title="Cube Filter Syntax Reference"
        width="780px"
        :append-to-body="true"
        class="cube-filter-help"
    >
        <div class="help-content">
            <p class="help-intro">
                Type a query in the search box to filter cubes. Terms are combined with implicit
                <code>AND</code>. Use <code>OR</code> between terms, prefix a term with <code>-</code>
                to negate it, and group terms with <code>( )</code>.
            </p>
            <p class="help-examples-intro">
                <strong>Quick examples:</strong>
                <code>size>=360 creatures>=40</code>&nbsp;&nbsp;
                <code>category:peasant -game:arena</code>&nbsp;&nbsp;
                <code>card:"lightning bolt" elo>=1400</code>
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
            <p>For text fields (<code>name</code>, <code>owner</code>), <code>:</code> is a <em>substring</em> match. For numeric fields it acts as <code>=</code>.</p>

            <h4 class="help-section-title">Percentage-based values</h4>
            <p>
                Keywords like <code>creatures</code>, <code>lands</code>, <code>removal</code>, color keywords, etc. compare against the <em>percentage</em> of total cards (or non-land cards for colors).
                For example, <code>creatures>=40</code> means "40% or more of cards are creatures."
            </p>

            <h4 class="help-section-title">Sorting</h4>
            <p>
                Use <code>order:</code> (or <code>sort:</code>) to sort cubes by a field,
                overriding the dropdown sort controls. Use <code>dir:</code> (or <code>direction:</code>)
                to set ascending or descending. If omitted, each field uses a sensible default.
            </p>
            <p>
                <strong>Available sort values:</strong>
                <code>name</code>, <code>owner</code>, <code>size</code>, <code>similarity</code>,
                <code>new</code>, <code>modified</code>, <code>followers</code>, <code>avgcmc</code>,
                <code>keywords</code>, <code>tokens</code>, <code>ub</code>, <code>sp</code>,
                <code>elo</code>, <code>median</code>/<code>year</code>, <code>price</code>,
                <code>tix</code>, <code>words</code>, <code>removal</code>
            </p>
            <p>
                <strong>Direction values:</strong> <code>asc</code> / <code>ascending</code>,
                <code>desc</code> / <code>descending</code>
            </p>
            <p>
                <strong>Examples:</strong>
                <code>order:size dir:desc</code>&nbsp;&nbsp;
                <code>sort:similarity</code>&nbsp;&nbsp;
                <code>category:peasant order:elo</code>
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
    {
        keywords: ['name', 'n', '(bare word)'],
        description: 'Cube name contains text. A bare word with no keyword defaults to a name search.',
        examples: ['name:vintage', '"my cube"'],
    },
    {
        keywords: ['owner'],
        description: 'Cube owner name contains text.',
        examples: ['owner:wtwlf'],
    },
    {
        keywords: ['id'],
        description: 'Cube ID or short ID matches.',
        examples: ['id:1001'],
    },
    {
        keywords: ['category', 'cat'],
        description: 'Cube has an assumed category (e.g., peasant, pauper, powered, desert).',
        examples: ['category:peasant', 'cat:powered'],
    },
    {
        keywords: ['modified', 'date'],
        description: 'Last modified date. Accepts YYYY-MM-DD format.',
        examples: ['modified>=2025-01-01', 'date>=2024-06-01'],
    },
    {
        keywords: ['followers'],
        description: 'Number of CubeCobra followers.',
        examples: ['followers>=100', 'followers>=50'],
    },
    {
        keywords: ['size', 'cards', 'totalcards'],
        description: 'Total card count.',
        examples: ['size>=360', 'size=540', 'cards<=450'],
    },
    {
        keywords: ['avgcmc', 'cmc'],
        description: 'Average mana value of non-land cards.',
        examples: ['avgcmc<=3.0', 'cmc>=3.5'],
    },
    {
        keywords: ['price', 'usd'],
        description: 'Total minimum USD price of all cards.',
        examples: ['price<=500', 'usd>=1000'],
    },
    {
        keywords: ['tix'],
        description: 'Total minimum MTGO tix price.',
        examples: ['tix>=100'],
    },
    {
        keywords: ['similarity', 'sim'],
        description: 'Average cosine similarity score vs other loaded cubes.',
        examples: ['sim>=0.5', 'similarity<=0.3'],
    },
    {
        keywords: ['elo'],
        description: 'Average CubeCobra card Elo rating.',
        examples: ['elo>=1400', 'elo<1200'],
    },
    {
        keywords: ['keywords', 'kw'],
        description: 'Number of unique non-evergreen keywords in the cube.',
        examples: ['keywords>=30', 'kw>=20'],
    },
    {
        keywords: ['creatures'],
        description: 'Percentage of cards that are creatures.',
        examples: ['creatures>=40', 'creatures<=50'],
    },
    {
        keywords: ['lands'],
        description: 'Percentage of cards that are lands.',
        examples: ['lands<=45', 'lands>=10'],
    },
    {
        keywords: ['new'],
        description: 'Percentage of cards released in the last year.',
        examples: ['new>=5'],
    },
    {
        keywords: ['removal'],
        description: 'Percentage of cards tagged as removal.',
        examples: ['removal>=10'],
    },
    {
        keywords: ['tokens'],
        description: 'Percentage of cards that make tokens.',
        examples: ['tokens>=15'],
    },
    {
        keywords: ['ub'],
        description: 'Percentage of Universes Beyond cards.',
        examples: ['ub=0', 'ub>=5'],
    },
    {
        keywords: ['sp'],
        description: 'Percentage of cards from supplemental products.',
        examples: ['sp<=5', 'sp=0'],
    },
    {
        keywords: ['white', 'w'],
        description: 'Percentage of non-land cards that are white (color distribution).',
        examples: ['white>=15', 'w>=20'],
    },
    {
        keywords: ['blue', 'u'],
        description: 'Percentage of non-land cards that are blue.',
        examples: ['blue>=20', 'u<=25'],
    },
    {
        keywords: ['black', 'b'],
        description: 'Percentage of non-land cards that are black.',
        examples: ['black>=15'],
    },
    {
        keywords: ['red', 'r'],
        description: 'Percentage of non-land cards that are red.',
        examples: ['red>=15'],
    },
    {
        keywords: ['green', 'g'],
        description: 'Percentage of non-land cards that are green.',
        examples: ['green>=15'],
    },
    {
        keywords: ['colorless', 'c'],
        description: 'Percentage of non-land cards that are colorless.',
        examples: ['colorless>=5'],
    },
    {
        keywords: ['multicolor', 'multi', 'm'],
        description: 'Percentage of non-land cards that are multicolored (2+ colors).',
        examples: ['multi>=20', 'm<=30'],
    },
    {
        keywords: ['game', 'in'],
        description: 'Cube is fully playable on the given platform. Values: arena, mtgo, paper.',
        examples: ['game:arena', 'in:mtgo', '-game:paper'],
    },
    {
        keywords: ['card'],
        description: 'Cube contains a card by name. ":" for substring match, "=" for exact name.',
        examples: ['card:bolt', 'card="lightning bolt"', '-card:counterspell'],
    },
    // ── Sort directives ─────────────────────────────────────────────────────────
    {
        keywords: ['order', 'sort'],
        description: 'Sort results by a field. Overrides the interactive sort controls. Values: name, owner, size, similarity, new, modified, followers, avgcmc, keywords, tokens, ub, sp, elo, median/year, price, tix, words, removal.',
        examples: ['order:size', 'sort:similarity', 'order:modified'],
    },
    {
        keywords: ['dir', 'direction'],
        description: 'Sort direction. Use with order: to control ascending/descending. If omitted, each field uses a sensible default.',
        examples: ['dir:asc', 'dir:desc', 'direction:ascending'],
    },
];
</script>

<style scoped>
.help-content {
    max-height: 70vh;
    overflow-y: auto;
}

.help-intro {
    margin-bottom: 12px;
    line-height: 1.6;
}

.help-examples-intro {
    margin-bottom: 16px;
}

.help-section-title {
    margin-top: 16px;
    margin-bottom: 8px;
}

.kw-badge {
    display: inline-block;
    margin: 2px 4px 2px 0;
    padding: 1px 5px;
    background: var(--el-fill-color-light);
    border-radius: 3px;
    font-size: 12px;
}

.ex-badge {
    display: inline-block;
    margin: 2px 4px 2px 0;
    padding: 1px 5px;
    background: var(--el-fill-color);
    border-radius: 3px;
    font-size: 12px;
}
</style>
