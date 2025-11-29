/**
 * Unclear if Jaccard Index might be a better fit for Cube since they're usually singleton?
 * It's probably noticeably faster to calculate.
 */
export function jaccardSimilarity(listA, listB) {
    const intersection = new Set([...listA].filter(x => listB.has(x)));
    const union = new Set([...listA, ...listB]);
    return intersection.size / union.size;
}

/**
 * Doing it with loops seems to be quicker than using multiple Array.reduce calls because I only iterate once.
 */
function vectorCosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
}

export function cosineSimilarity(listA, listB) {
    const allElements = new Set([...listA, ...listB]);
    const vecA = [];
    const vecB = [];

    allElements.forEach(element => {
        vecA.push(listA.includes(element) ? 1 : 0);
        vecB.push(listB.includes(element) ? 1 : 0);
    });

    return vectorCosineSimilarity(vecA, vecB);
}
