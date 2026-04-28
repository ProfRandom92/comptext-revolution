/**
 * Tokenizes raw input into CompText tokens
 */
export function tokenize(input) {
    const tokens = [];
    let position = 0;
    const patterns = [
        { type: 'directive', regex: /^\[CTX:[^\]]+\]/ },
        { type: 'reference', regex: /^\$[a-zA-Z_][a-zA-Z0-9_]*/ },
        { type: 'operator', regex: /^[|:=><!+\-*\/]/ },
        { type: 'identifier', regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
        { type: 'literal', regex: /^"[^"]*"|'[^']*'/ },
        { type: 'value', regex: /^[^\s|:=><!+\-*\/\[\]"']+/ },
    ];
    while (position < input.length) {
        // Skip whitespace
        const ws = input.slice(position).match(/^\s+/);
        if (ws) {
            position += ws[0].length;
            continue;
        }
        let matched = false;
        for (const { type, regex } of patterns) {
            const match = input.slice(position).match(regex);
            if (match) {
                tokens.push({ type, value: match[0], position, length: match[0].length });
                position += match[0].length;
                matched = true;
                break;
            }
        }
        if (!matched)
            position++;
    }
    return tokens;
}
