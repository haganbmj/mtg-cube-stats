<script setup lang="ts">
defineProps<{ visible: boolean }>();
defineEmits<{ (e: 'update:visible', val: boolean): void }>();
</script>

<template>
    <el-dialog
        :model-value="visible"
        title="Check Expression Syntax"
        width="600px"
        @update:model-value="$emit('update:visible', $event)"
    >
        <div class="syntax-help">
            <h4>Count Checks</h4>
            <p>Count cards matching a filter and compare to a threshold.</p>
            <ul>
                <li><code>c:u &gt; 10</code> — more than 10 blue cards</li>
                <li><code>type:creature &gt; 50%</code> — creatures over 50% of cube</li>
                <li><code>keyword:flying</code> — at least 1 card with flying</li>
            </ul>

            <h4>Relative Checks</h4>
            <p>Compare counts of two different filters.</p>
            <ul>
                <li><code>t:instant &gt;= t:sorcery</code> — more instants than sorceries</li>
            </ul>

            <h4>Aggregate Checks</h4>
            <p>Apply a function over a numeric field. Functions: <code>avg</code>, <code>sum</code>, <code>min</code>, <code>max</code>, <code>median</code>.</p>
            <p>Fields: <code>cmc</code>, <code>words</code>, <code>power</code>, <code>toughness</code>, <code>elo</code>, <code>usd</code>, <code>tix</code>, <code>year</code>.</p>
            <ul>
                <li><code>avg(cmc) &lt; 3.5</code> — average mana value under 3.5</li>
                <li><code>avg(cmc, type:creature) &lt; 3</code> — average CMC of creatures</li>
                <li><code>max(cmc) &lt;= 7</code> — no card costs more than 7</li>
            </ul>

            <h4>Operators</h4>
            <p><code>&gt;</code> <code>&lt;</code> <code>&gt;=</code> <code>&lt;=</code> <code>=</code> <code>!=</code></p>
            <p>Operators must have spaces around them. Without an operator, the check defaults to <code>&gt; 0</code>.</p>

            <h4>Card Filter Syntax</h4>
            <p>The card filter portion uses the same syntax as the Cards tab search (e.g., <code>c:u</code>, <code>type:creature</code>, <code>cmc&gt;3</code>, <code>keyword:flying</code>).</p>
        </div>
    </el-dialog>
</template>

<style scoped>
.syntax-help h4 {
  margin-top: 1em;
  margin-bottom: 0.25em;
}
.syntax-help h4:first-child {
  margin-top: 0;
}
.syntax-help code {
  background: var(--el-fill-color-light);
  padding: 1px 4px;
  border-radius: 3px;
}
.syntax-help ul {
  padding-left: 1.5em;
}
</style>
