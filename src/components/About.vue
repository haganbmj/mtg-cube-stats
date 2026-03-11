<template>
    <h3>Notes</h3>
    <h4>Card Data:</h4>
    <ul>
        <li>All cards are evaluated using their original printing for consistency and to indicate the design goals of the time.</li>
        <li>Any card overrides (color, cmc, etc) made in CubeCobra are ignored.</li>
        <li>Card data is refreshed weekly, so price updates will be delayed.</li>
        <li>"New" cards are those printed within the last 12 months.</li>
        <li>Release Year calculations ignore basic lands.</li>
        <li>There are a number of things not classified as "keywords" by the comp rules (Initiative, Monarch, "Becomes Day", etc) and things like Adventure are considered card layouts rather than keywords.</li>
        <li>"Removal" is evaluated using Scryfall Tagger's <code>otag:removal</code> filter.</li>
        <li>Word count is a best effort using Scryfall's oracle text which sometimes includes reminder text. The column excluding reminder text is just a naive stripping of any text between parenthesis in the oracle text, which will catch some false positives.</li>
        <li>Minimum Format Legality is looking to represent the "smallest" sanctioned paper format that the cards are legal in? (<code>Standard < Pioneer < Modern < Legacy < Vintage < Cube</code>).</li>
    </ul>
    <h4>Calculations:</h4>
    <ul>
        <li>Currently using <a href="https://en.wikipedia.org/wiki/Cosine_similarity">Cosine Similarity</a> to compare cubes, which helps with lists of different sizes. The significance/role of each card is not considered, but duplicate copies of cards are evaluated in an effort to better support non-singleton cubes.</li>
        <li>Rarity Score is an effort to provide a comparative stat about the (minimum) rarity distribution of the cube by assigning a value of <code>C=0.333, U=0.666, R=1.000, M=1.200</code> to each card and taking the average.</li>
        <li>Categories are a best guess using the contents of the cube rather than CubeCobra's classifications. A pauper/peasant cube earns a "+" if ≥92.5% of the non-land cards satisfy the restriction. Desert is flagged if the cube contains ≥28% lands.</li>
    </ul>
    <h4>Miscellaneous:</h4>
    <ul>
        <li>Cube Collections are refreshed in chunks throughout the week.</li>
        <li>I really, really want tri-state checkboxes in the Table Header filters, but will need to write a custom table component for that.</li>
        <li>Need to figure out good patterns for cross-filtering on some of the Charts.</li>
        <li>This site is statically compiled and uses cached information where possible, so collections or card details may be (slightly) out of date.</li>
    </ul>

    <h3>Data Sources</h3>
    <ul>
        <li><a href="https://cubecobra.com" target="_blank">CubeCobra</a> - Cube data.</li>
        <li><a href="https://scryfall.com" target="_blank">Scryfall</a> - Card details, imagery, tagging.</li>
    </ul>

    <h3>Build Details</h3>
    <ul>
        <li>Repository: <a href="https://github.com/haganbmj/mtg-cube-stats" target="_blank">github.com/haganbmj/mtg-cube-stats</a></li>
        <li>Build SHA: <a :href="'https://github.com/haganbmj/mtg-cube-stats/commit/' + getBuildSha()" target="_blank">{{ getBuildSha() }}</a></li>
        <li>Timestamp: {{ getBuildTimestamp() }}</li>
    </ul>

    <el-text tag="i">This site is not affiliated with or endorsed by Wizards of the Coast, CubeCobra, CubeCon, or Scryfall.</el-text>
</template>

<script setup lang="ts">
function getBuildTimestamp() {
    return import.meta.env.VITE_BUILD_TIMESTAMP;
}

function getBuildSha() {
    return import.meta.env.VITE_BUILD_SHA || 'local';
}
</script>

<style scoped lang="scss">
h4 {
    margin-left: 1em;
}
</style>
