#!/usr/bin/env node
/**
 * CompText Revolution - Comprehensive Benchmark Suite
 * Tests token savings, compression ratios, and performance across real-world scenarios
 */
import { compressText } from '../packages/core/src/compiler.js';
const TOKEN_ESTIMATE = 4; // 1 token ≈ 4 characters (Claude standard)
// Real-world test data
const BENCHMARKS = {
    // API Documentation
    'API_DOC_PROMPT': {
        category: 'API Documentation',
        level: 2,
        text: `You are an API documentation expert. Please analyze the following REST API endpoint and provide a comprehensive summary including:

    1. Endpoint purpose and functionality
    2. Request/Response schema validation
    3. Error handling and edge cases
    4. Rate limiting and throttling behavior
    5. Authentication requirements
    6. Security considerations

    The endpoint is critical infrastructure. Please be thorough and provide detailed documentation.
    In order to ensure success, you must carefully analyze all aspects.
    It is important to note that performance is a key consideration.`
    },
    // Claude System Prompt
    'CLAUDE_SYSTEM_PROMPT': {
        category: 'System Prompts',
        level: 2,
        text: `You are Claude, an AI assistant made by Anthropic. You are helpful, harmless, and honest.
    You assist users with a wide variety of tasks, including writing, analysis, coding, math, creative work, and more.
    You provide thoughtful, nuanced responses that acknowledge uncertainty where appropriate.

    When responding to users:
    - Be concise but thorough
    - Explain your reasoning
    - Acknowledge limitations
    - Provide helpful examples

    You are designed to be safe and beneficial. If asked to do something harmful or unethical, you should decline politely
    and explain why. You should provide information to help users make informed decisions.`
    },
    // Code Comment
    'CODE_COMMENT': {
        category: 'Code Comments',
        level: 2,
        text: `/**
     * This function initializes the database connection pool and provides
     * comprehensive configuration for all connection parameters. The implementation
     * handles error cases appropriately and provides detailed logging for debugging.
     *
     * It is important to note that connection pooling is critical for performance.
     * The function validates all parameters and ensures type safety throughout.
     * Please provide comprehensive error handling for all edge cases.
     */`
    },
    // Email/Message
    'EMAIL': {
        category: 'Email/Messages',
        level: 2,
        text: `Hi Team,

    I wanted to provide a comprehensive update on our project status. We have made significant progress
    on several fronts. The core infrastructure is essentially complete, and we are moving forward with
    integration testing. It is important to note that we need to carefully manage our timeline.

    In order to be successful, we need everyone's cooperation. Please provide feedback on the current
    implementation so we can address any concerns promptly.

    Basically, we're on track and moving forward. Let me know if you have any questions.

    Best regards,
    Management`
    },
    // Technical Analysis
    'TECH_ANALYSIS': {
        category: 'Technical Analysis',
        level: 3,
        text: `ANALYSIS REPORT: Performance Optimization Results

This comprehensive analysis examines the performance characteristics of the newly implemented caching layer.
The implementation provides significant improvements in response time and throughput. Performance testing
shows that request latency has been reduced by approximately 65% in standard scenarios.

Database query optimization is critical. The new indexing strategy provides faster lookups and reduces
memory consumption. It is important to note that write performance remains consistent.

In order to achieve maximum efficiency, we recommend implementing this strategy across all services.
The results are essentially impressive and provide substantial value to our infrastructure.

Key findings:
- Response time improvements: 65% average
- Memory reduction: 40% typical
- Throughput increase: 85% observed
- Cost savings: approximately 45%

Basically, the optimization is successful and ready for production deployment.`
    },
    // Product Description
    'PRODUCT_DESC': {
        category: 'Product Descriptions',
        level: 2,
        text: `CompText Revolution is a comprehensive platform designed to provide token-efficient communication
for large language models. It combines a domain-specific language with advanced indexing and search capabilities.

The platform provides:
- Token compression: 85-95% reduction in most scenarios
- Fast full-text search with BM25 ranking algorithms
- Session management and memory persistence
- Sandbox execution for safe code analysis
- Seamless integration with Claude, Cursor, and other LLM tools

CompText is built with TypeScript and provides a complete TypeScript SDK for programmatic access.
It is important to note that performance and security are critical design considerations.
Please analyze the architecture carefully to understand all capabilities and limitations.`
    },
    // JavaScript Code
    'JS_CODE': {
        category: 'Source Code',
        level: 2,
        text: `function processUserData(userData) {
  /**
   * This function processes user data and provides comprehensive validation.
   * It is important to note that all inputs must be carefully validated.
   * In order to ensure security, we apply strict type checking throughout.
   */

  if (!userData || typeof userData !== 'object') {
    throw new Error('Invalid data: please provide valid user data object');
  }

  const email = userData.email;
  const name = userData.name;

  // Basically validate that required fields are present
  if (!email || !name) {
    throw new Error('Missing required fields: please provide email and name');
  }

  // Essentially normalize the data format
  return {
    email: email.toLowerCase().trim(),
    name: name.trim(),
    created: new Date(),
    processed: true
  };
}`
    },
    // Long Documentation
    'DOCUMENTATION': {
        category: 'Documentation',
        level: 3,
        text: `# Complete User Guide to CompText Revolution

## Introduction
CompText Revolution is a token compression platform designed for large language models.
It provides a comprehensive solution for reducing context size while maintaining semantic accuracy.

## Getting Started
Please follow these steps carefully to ensure proper installation and configuration:

1. Install the package using npm or pnpm
2. Configure your environment variables appropriately
3. Initialize your database schema
4. Set up API authentication credentials
5. Run comprehensive tests to validate installation

## Core Features

### Token Compression Engine
The compression engine provides multiple levels of text compression. Level 2 is recommended for
most standard use cases. Level 5 provides maximum compression but may reduce readability.

### Content-Addressed Storage (CAS)
The CAS system provides content-based deduplication. Essentially, identical content is stored
once and referenced by SHA-256 hash. This provides significant storage savings.

### Session Memory System
The session memory provides persistent state management. You can save, checkpoint, and resume
long-running workflows with full context preservation.

## Configuration Options
Please provide comprehensive configuration for your deployment scenario. It is important to note
that security settings must be properly configured for production deployments.

## Best Practices
- Batch similar compression requests together
- Use appropriate compression levels for your content type
- Monitor token savings metrics regularly
- Implement proper error handling and logging
- Validate all inputs before processing

## Troubleshooting
Common issues and their solutions are documented below.
If you encounter problems, please refer to this section carefully.`
    },
    // Support Ticket Response
    'SUPPORT_TICKET': {
        category: 'Support/Customer Service',
        level: 2,
        text: `Dear Customer,

Thank you for contacting support. We appreciate your detailed report of the issue you're experiencing.
We have reviewed your request carefully and provide the following analysis and recommendations.

It is important to note that we take all customer concerns seriously. In order to resolve this
effectively, we need some additional information. Please provide the following details:

1. Your account ID or email address
2. The specific version number you are using
3. Steps to reproduce the issue
4. Screenshots or logs if available
5. Your operating system and browser information

Basically, once we receive this information, we can provide more targeted assistance.
The issue you've described is essentially related to our caching system, and we have
a fix in development that should resolve it shortly.

We appreciate your patience and will follow up within 24 hours.

Best regards,
Support Team`
    },
    // Research Paper Abstract
    'RESEARCH_ABSTRACT': {
        category: 'Academic/Research',
        level: 3,
        text: `ABSTRACT: Token Compression for Large Language Model Context Windows

Large language models are increasingly constrained by context window limitations. This research
proposes CompText Revolution, a novel approach to token-efficient communication that combines
domain-specific language design with advanced information retrieval techniques.

Our comprehensive analysis demonstrates that the proposed method achieves 85-95% token reduction
across diverse content types including code, documentation, and natural language text. The approach
provides substantial benefits for downstream model performance while maintaining semantic accuracy.

This paper provides detailed examination of the underlying algorithms, comprehensive benchmarks
across multiple domains, and practical deployment recommendations. We demonstrate that our method
is particularly effective for structured content and API documentation.

The results essentially show that context window constraints can be significantly mitigated through
intelligent compression. In order to validate these findings, we conducted extensive experiments
across diverse datasets. It is important to note that readability is preserved at compression levels
suitable for human review.

Our implementation provides a complete platform including full-text search, session management,
and sandbox execution capabilities. The system is designed to seamlessly integrate with existing
large language model toolchains and provides comprehensive API support.

Keywords: context compression, language models, information retrieval, token efficiency`
    },
    // Legal/Contract Text
    'LEGAL_TEXT': {
        category: 'Legal/Contracts',
        level: 2,
        text: `TERMS OF SERVICE AGREEMENT

1. PARTIES AND DEFINITIONS
In order to clarify the relationship between parties, please note the following definitions:
- "Service": The CompText Revolution platform and all associated features
- "User": Any individual or organization accessing the Service
- "Content": All data processed through the Service

2. TERMS AND CONDITIONS
The Service is provided on an "as-is" basis. It is important to note that we provide no warranties
or guarantees of any kind. The User assumes all responsibility for use of the Service.

3. LIMITATION OF LIABILITY
In no event shall the Company be liable for damages. Please understand that this limitation applies
to all circumstances. We essentially disclaim all liability for indirect or consequential damages.

4. USER OBLIGATIONS
The User must comply with all applicable laws. Basically, you are responsible for all activity
on your account. You must provide accurate information and maintain confidentiality of credentials.

5. INTELLECTUAL PROPERTY
All content provided is protected by copyright. You may not modify, reproduce, or distribute
the materials without explicit written consent. The Company retains all rights.`
    }
};
// Statistics tracking
let totalOriginalChars = 0;
let totalCompressedChars = 0;
let totalOriginalTokens = 0;
let totalCompressedTokens = 0;
function estimateTokens(text) {
    return Math.ceil(text.length / TOKEN_ESTIMATE);
}
function runBenchmark(name, category, text, level) {
    const start = performance.now();
    const result = compressText(text, { level });
    const duration = performance.now() - start;
    const originalTokens = estimateTokens(result.original);
    const compressedTokens = estimateTokens(result.compressed);
    const savedTokens = originalTokens - compressedTokens;
    const tokenRatio = (compressedTokens / originalTokens * 100).toFixed(1);
    // Track totals
    totalOriginalChars += result.originalLength;
    totalCompressedChars += result.compressedLength;
    totalOriginalTokens += originalTokens;
    totalCompressedTokens += compressedTokens;
    return {
        name,
        category,
        originalChars: result.originalLength,
        compressedChars: result.compressedLength,
        savedChars: result.savedChars,
        charRatio: result.ratio,
        originalTokens,
        compressedTokens,
        savedTokens,
        tokenRatio,
        compressionLevel: level,
        durationMs: duration
    };
}
function formatTable(results) {
    console.log('\n' + '═'.repeat(140));
    console.log('COMPRESSION BENCHMARK RESULTS');
    console.log('═'.repeat(140));
    const header = `${'Test Name'.padEnd(40)} | ${'Category'.padEnd(20)} | ${'Orig Tokens'.padEnd(12)} | ${'Comp Tokens'.padEnd(12)} | ${'Saved'.padEnd(10)} | ${'Ratio'.padEnd(8)} | ${'Time'.padEnd(8)}`;
    console.log(header);
    console.log('─'.repeat(140));
    for (const r of results) {
        const row = `${r.name.padEnd(40)} | ${r.category.padEnd(20)} | ${String(r.originalTokens).padEnd(12)} | ${String(r.compressedTokens).padEnd(12)} | ${String(r.savedTokens).padEnd(10)} | ${(r.tokenRatio + '%').padEnd(8)} | ${r.durationMs.toFixed(2).padEnd(8)}`;
        console.log(row);
    }
    console.log('─'.repeat(140));
}
function printCategorySummary(results) {
    const byCategory = {};
    for (const result of results) {
        if (!byCategory[result.category]) {
            byCategory[result.category] = [];
        }
        byCategory[result.category].push(result);
    }
    console.log('\n' + '═'.repeat(100));
    console.log('SUMMARY BY CATEGORY');
    console.log('═'.repeat(100));
    for (const [category, items] of Object.entries(byCategory)) {
        const totalSaved = items.reduce((sum, r) => sum + r.savedTokens, 0);
        const avgRatio = items.reduce((sum, r) => sum + parseFloat(r.tokenRatio), 0) / items.length;
        console.log(`\n${category}:`);
        console.log(`  Tests: ${items.length}`);
        console.log(`  Total tokens saved: ${totalSaved}`);
        console.log(`  Average compression: ${avgRatio.toFixed(1)}%`);
    }
}
function printGlobalStats() {
    console.log('\n' + '═'.repeat(100));
    console.log('GLOBAL STATISTICS');
    console.log('═'.repeat(100));
    const totalSaved = totalOriginalTokens - totalCompressedTokens;
    const avgRatio = (totalCompressedTokens / totalOriginalTokens * 100).toFixed(1);
    const tokenSavingsPercent = ((totalSaved / totalOriginalTokens) * 100).toFixed(1);
    console.log(`Total original tokens: ${totalOriginalTokens.toLocaleString()}`);
    console.log(`Total compressed tokens: ${totalCompressedTokens.toLocaleString()}`);
    console.log(`Total tokens saved: ${totalSaved.toLocaleString()}`);
    console.log(`Compression ratio: ${avgRatio}%`);
    console.log(`Token savings: ${tokenSavingsPercent}%`);
    console.log(`\nEquivalent to ${Math.round(totalSaved / 1000)}K tokens saved!`);
}
async function main() {
    console.log('🚀 CompText Revolution - Benchmark Suite');
    console.log(`Testing ${Object.keys(BENCHMARKS).length} real-world scenarios...\n`);
    const results = [];
    for (const [key, config] of Object.entries(BENCHMARKS)) {
        const result = runBenchmark(key.replace(/_/g, ' '), config.category, config.text, config.level);
        results.push(result);
        process.stdout.write('.');
    }
    console.log('\n');
    // Print detailed results
    formatTable(results);
    // Print category summary
    printCategorySummary(results);
    // Print global stats
    printGlobalStats();
    console.log('\n✅ Benchmark complete!');
}
main().catch(console.error);
