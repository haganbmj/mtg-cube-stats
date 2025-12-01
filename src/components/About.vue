<template>
    <h3>Notes</h3>
    <h4>Card Data:</h4>
    <ul>
        <li>All cards are evaluated using their original printings only for consistency.</li>
        <li>Cards with multiple faces are (currently) evaluated using their front face only.</li>
        <li>Any card overrides (color, cmc, etc) made in CubeCobra are ignored.</li>
        <li>There are a number of things not classified as "keywords" by the comp rules (Initiative, Monarch, "Becomes Day", etc) and things like Adventure are considered card layouts rather than keywords.</li>
        <li>"Removal" is evaluated using Scryfall Tagger's otag:removal-creature filter.</li>
        <li>Word count is a best effort. Using Scryfall's oracle text which sometimes includes reminder text. The column excluding reminder text is just a naive stripping of any text between parenthesis in the oracle text, which will catch some false positives.</li>
        <li>Minimum Format Legality is looking to represent the "smallest" sanctioned paper format that the cards are legal in? (Standard < Pioneer < Modern < Legacy < Vintage < Cube).</li>
    </ul>
    <h4>Calculations:</h4>
    <ul>
        <li>Currently using <a href="https://en.wikipedia.org/wiki/Cosine_similarity">Cosine Similarity</a> to compare cubes, which means it's only looking at the unique card contents of each list. Duplicates and the significance/role of each card is not considered.</li>
    </ul>
    <h4>Miscellaneous:</h4>
    <ul>
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
