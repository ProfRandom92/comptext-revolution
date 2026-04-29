"""Huxley-Gödel Safety Gate — Pre-output validation (from CT-Vault)"""

import re
from typing import Dict, List, Tuple
from enum import Enum

class RiskLevel(Enum):
    SAFE = "safe"
    WARN = "warn"
    BLOCK = "block"

class SafetyGate:
    """Validates outputs before emission for safety violations."""

    def __init__(self):
        self.dangerous_patterns = {
            # Injection attacks
            r"(?:select|insert|update|delete|drop|union)\s+(?:from|into|values)",  # SQL injection
            r"<script[^>]*>.*?</script>",  # XSS
            r"{{.*?}}|{%.*?%}",  # Template injection
            # Credential leaks
            r"(?:password|api[_-]?key|secret|token)\s*[=:]\s*['\"]?[a-zA-Z0-9]{8,}",
            r"bearer\s+[a-zA-Z0-9_-]+",  # JWT
        }
        self.suspicious_patterns = {
            r"\\x[0-9a-f]{2}",  # Hex escapes
            r"eval\(|exec\(|system\(",  # Code execution
        }

    def check_output(self, text: str) -> Tuple[RiskLevel, List[str]]:
        """Analyze output for safety violations."""
        violations = []

        # Check dangerous patterns
        for pattern in self.dangerous_patterns.values():
            if re.search(pattern, text, re.IGNORECASE):
                violations.append(f"Dangerous pattern detected: {pattern[:50]}")

        # Check suspicious patterns
        for pattern in self.suspicious_patterns.values():
            if re.search(pattern, text):
                violations.append(f"Suspicious pattern detected: {pattern[:50]}")

        if violations:
            return (RiskLevel.BLOCK, violations)

        # Check suspicious length patterns
        if len(text) > 100000:
            return (RiskLevel.WARN, ["Output exceeds 100KB"])

        return (RiskLevel.SAFE, [])

    def sanitize(self, text: str, level: str = "strict") -> str:
        """Remove potentially dangerous content."""
        if level == "strict":
            # Remove all special sequences
            text = re.sub(r"<[^>]+>", "", text)
            text = re.sub(r"\{\{[^}]+\}\}", "", text)
            text = re.sub(r"\{%[^%]+%\}", "", text)
        elif level == "moderate":
            # Remove only known dangerous patterns
            text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
        return text

    def validate_json(self, data: Dict) -> Tuple[bool, str]:
        """Validate JSON structure."""
        try:
            # Ensure no circular references
            if not isinstance(data, dict):
                return False, "Invalid JSON structure"
            for key in data:
                if not isinstance(key, str):
                    return False, "Non-string keys not allowed"
            return True, "Valid"
        except Exception as e:
            return False, str(e)
