#!/usr/bin/env node
/**
 * CompText Revolution - Performance & Scalability Tests
 * Measures compression speed, memory usage, and scaling behavior
 */
import { compressText } from '../packages/core/src/compiler.js';
// Generate test data of varying sizes
function generateTestText(size, type = 'prose') {
    const proseTemplates = [
        'Please analyze the following content carefully and provide comprehensive insights.',
        'In order to achieve success, we must focus on important details and thoroughly examine all aspects.',
        'It is important to note that this implementation provides significant value and improvements.',
        'Basically, the system essentially handles all requirements and provides reliable functionality.',
        'The comprehensive analysis shows that performance is critical for success in this context.'
    ];
    const codeTemplates = [
        '/** This function provides comprehensive validation for all input parameters. */',
        'if (condition) { process.stdout.write("Verbose logging message"); }',
        'const result = await performAsyncOperation(params, options, callbacks);',
        'return createObject({ key1: value1, key2: value2, key3: value3 });'
    ];
    const templates = type === 'code' ? codeTemplates : type === 'mixed' ? [...proseTemplates, ...codeTemplates] : proseTemplates;
    let text = '';
    while (text.length < size) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        text += template + ' ';
    }
    return text.slice(0, size);
}
// Test configurations
const PERFORMANCE_TESTS = [
    // Small documents (< 1KB)
    { name: 'Small Document (500B)', textSize: 500, compressionLevel: 2 },
    { name: 'Small Document (1KB)', textSize: 1024, compressionLevel: 2 },
    // Medium documents (1KB - 100KB)
    { name: 'Medium Document (10KB)', textSize: 10 * 1024, compressionLevel: 2 },
    { name: 'Medium Document (50KB)', textSize: 50 * 1024, compressionLevel: 2 },
    { name: 'Medium Document (100KB)', textSize: 100 * 1024, compressionLevel: 2 },
    // Large documents (100KB - 1MB)
    { name: 'Large Document (500KB)', textSize: 500 * 1024, compressionLevel: 2 },
    { name: 'Large Document (1MB)', textSize: 1024 * 1024, compressionLevel: 2 },
    // Different compression levels on same size
    { name: 'Medium Document L1', textSize: 50 * 1024, compressionLevel: 1 },
    { name: 'Medium Document L2', textSize: 50 * 1024, compressionLevel: 2 },
    { name: 'Medium Document L3', textSize: 50 * 1024, compressionLevel: 3 },
    { name: 'Medium Document L4', textSize: 50 * 1024, compressionLevel: 4 },
    { name: 'Medium Document L5', textSize: 50 * 1024, compressionLevel: 5 },
];
function runPerformanceTest(test) {
    // Generate test data
    const testData = generateTestText(test.textSize);
    // Warm up (ensure JIT compilation)
    compressText(testData.slice(0, 1000), { level: test.compressionLevel });
    // Actual test
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();
    const result = compressText(testData, { level: test.compressionLevel });
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    const duration = endTime - startTime;
    const throughput = test.textSize / duration; // chars per ms
    const memorySavings = ((result.savedChars / result.originalLength) * 100);
    return {
        testName: test.name,
        inputSize: result.originalLength,
        outputSize: result.compressedLength,
        duration,
        throughput,
        memorySavings
    };
}
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
function printPerformanceTable(results) {
    console.log('\n' + '═'.repeat(130));
    console.log('PERFORMANCE BENCHMARK RESULTS');
    console.log('═'.repeat(130));
    console.log('%-40s | %12s | %12s | %10s | %12s | %8s'.padEnd(130), 'Test', 'Input Size', 'Output Size', 'Time (ms)', 'Throughput', 'Savings %');
    console.log('─'.repeat(130));
    for (const r of results) {
        console.log('%-40s | %12s | %12s | %10.2f | %12.0f | %7.1f%'.padEnd(130), r.testName, formatSize(r.inputSize), formatSize(r.outputSize), r.duration, r.throughput, r.memorySavings);
    }
    console.log('─'.repeat(130));
}
function printScalabilityAnalysis(results) {
    console.log('\n' + '═'.repeat(100));
    console.log('SCALABILITY ANALYSIS');
    console.log('═'.repeat(100));
    // Group by input size
    const bySizeResults = results.filter(r => r.testName.includes('('));
    if (bySizeResults.length > 0) {
        console.log('\nScaling with Document Size (Level 2):');
        console.log('Size | Duration (ms) | Throughput (KB/ms) | Efficiency');
        console.log('─'.repeat(60));
        for (const r of bySizeResults) {
            const sizeStr = formatSize(r.inputSize);
            const throughputKB = (r.throughput / 1024).toFixed(3);
            const efficiency = ((r.inputSize / r.duration) / 1024).toFixed(1);
            console.log(`${sizeStr.padEnd(6)} | ${r.duration.toFixed(2).padEnd(13)} | ${throughputKB.padEnd(17)} | ${efficiency} KB/ms`);
        }
    }
    // Group by compression level
    const byLevelResults = results.filter(r => r.testName.includes('L1') || r.testName.includes('L2') || r.testName.includes('L3') || r.testName.includes('L4') || r.testName.includes('L5'));
    if (byLevelResults.length > 0) {
        console.log('\nCompression Level Impact (50KB):');
        console.log('Level | Duration (ms) | Output Size | Savings % | Throughput');
        console.log('─'.repeat(60));
        for (const r of byLevelResults) {
            const level = r.testName.slice(-1);
            const output = formatSize(r.outputSize);
            const throughput = (r.throughput / 1024).toFixed(2);
            console.log(`L${level}    | ${r.duration.toFixed(2).padEnd(13)} | ${output.padEnd(11)} | ${r.memorySavings.toFixed(1).padEnd(9)} | ${throughput} KB/ms`);
        }
    }
}
function printStatistics(results) {
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
    const avgSavings = results.reduce((sum, r) => sum + r.memorySavings, 0) / results.length;
    console.log('\n' + '═'.repeat(100));
    console.log('AGGREGATE STATISTICS');
    console.log('═'.repeat(100));
    console.log(`Total tests run: ${results.length}`);
    console.log(`Average compression time: ${avgDuration.toFixed(2)}ms`);
    console.log(`Average throughput: ${(avgThroughput / 1024).toFixed(2)} KB/ms`);
    console.log(`Average token savings: ${avgSavings.toFixed(1)}%`);
}
async function main() {
    console.log('⚡ CompText Revolution - Performance & Scalability Tests');
    console.log(`Running ${PERFORMANCE_TESTS.length} performance tests...\n`);
    const results = [];
    for (const test of PERFORMANCE_TESTS) {
        const result = runPerformanceTest(test);
        results.push(result);
        process.stdout.write('.');
    }
    console.log('\n');
    // Print results
    printPerformanceTable(results);
    // Print scalability analysis
    printScalabilityAnalysis(results);
    // Print statistics
    printStatistics(results);
    console.log('\n✅ Performance tests complete!');
}
main().catch(console.error);
