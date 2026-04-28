import { tokenize } from './tokenizer.js';
import { applyLevel1, applyLevel2, applyLevel3, applyLevel4, applyLevel5 } from './levels.js';
export function compile(input, options = {}) {
    const start = Date.now();
    const { level = 3, preserveStructure = true, format = 'compact' } = options;
    const tokens = tokenize(input);
    const compressed = applyCompression(input, level, format);
    const tokensOriginal = estimateTokens(input);
    const tokensCompressed = estimateTokens(compressed);
    const document = {
        version: '0.1.0',
        tokens,
        metadata: { level, format, preserveStructure },
        raw: input,
        compressed,
        compressionRatio: tokensOriginal / tokensCompressed
    };
    return {
        document,
        tokensOriginal,
        tokensCompressed,
        ratio: document.compressionRatio,
        durationMs: Date.now() - start
    };
}
export function compressText(text, options = {}) {
    const { level = 2, profile = 'standard' } = options;
    const effectiveLevel = profileToLevel(profile, level);
    const compressed = applyCompressionLevel(text, effectiveLevel);
    const savedChars = text.length - compressed.length;
    const ratio = (compressed.length / text.length).toFixed(2);
    return {
        original: text,
        compressed,
        originalLength: text.length,
        compressedLength: compressed.length,
        savedChars,
        ratio,
        level: effectiveLevel,
    };
}
function profileToLevel(profile, level) {
    if (profile === 'minimal')
        return 1;
    if (profile === 'standard')
        return level;
    if (profile === 'aggressive')
        return 3;
    if (profile === 'ultra')
        return 5;
    return level;
}
function applyCompressionLevel(text, level) {
    if (level >= 5)
        return applyLevel5(text);
    if (level >= 4)
        return applyLevel4(text);
    if (level >= 3)
        return applyLevel3(text);
    if (level >= 2)
        return applyLevel2(text);
    return applyLevel1(text);
}
export function decompress(compressed) {
    return compressed;
}
function applyCompression(input, level, format) {
    return applyCompressionLevel(input, level);
}
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
