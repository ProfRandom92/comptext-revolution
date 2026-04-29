"""
400-sample benchmark corpus.

Each sample carries:
  - text  : the raw input (50-500 chars)
  - marker: a specific string (version, IP, func name, key) that MUST survive
             compression if the downstream task is to remain solvable.
  - question / answer: minimal QA pair tied to the marker.

Design intent:
  - 50 % of samples heavily use KVTC target words (filler, abbreviatable terms)
    to give KVTC the best chance to shine.
  - 50 % are neutral (numbers, URLs, code tokens, key:value pairs) to expose
    any inflation risk.
"""

import random
from dataclasses import dataclass
from typing import List

SEED = 42


@dataclass
class Sample:
    id: str
    corpus_type: str   # technical_docs | casual_prose | code_comments | config_files
    text: str
    marker: str        # exact string that must survive for the QA to be answerable
    question: str
    answer: str


# ── vocabulary pools ──────────────────────────────────────────────────────────

FUNC_NAMES = [
    "connect_db_v2", "parse_config_v3", "validate_schema_v1",
    "compress_payload_v4", "fetch_records_v2", "build_index_v5",
    "apply_transform_v3", "resolve_conflict_v2", "merge_branches_v4",
    "sanitize_input_v1", "generate_token_v6", "refresh_cache_v2",
    "authenticate_user_v3", "schedule_job_v2", "deploy_service_v5",
    "rollback_migration_v1", "checkpoint_state_v3", "encode_payload_v2",
    "decode_message_v4", "stream_response_v2",
]
VERSIONS = [
    "v2.3.1", "v1.0.4", "v3.7.2", "v0.9.15", "v4.1.0",
    "v2.8.3", "v1.12.0", "v5.0.1", "v3.3.7", "v6.2.0",
    "v0.4.11", "v7.1.2", "v2.0.0-rc3", "v1.5.6", "v4.0.0-beta",
]
IPS = [
    "192.168.1.42", "10.0.3.17", "172.16.5.99", "192.168.100.5",
    "10.10.0.254", "172.31.255.1", "192.0.2.45", "203.0.113.22",
    "198.51.100.7", "10.255.255.3",
]
PORTS = ["5432", "6379", "8080", "9200", "3306", "27017", "11211", "4222",
         "50051", "9092"]
TIMEOUTS = ["30", "60", "120", "15", "45", "90", "300", "10", "20", "75"]
CFG_KEYS = [
    "max_connections", "retry_limit", "pool_size", "buffer_size",
    "queue_depth", "batch_size", "shard_count", "replica_count",
    "cache_ttl", "rate_limit",
]
CFG_VALS = ["16", "3", "32", "4096", "512", "256", "8", "2", "300", "1000"]
ENVS = ["production", "staging", "development", "canary", "test"]
ERRORS = [
    "ConnectionRefusedError", "TimeoutError", "ValidationError",
    "AuthorizationError", "RateLimitError", "DeserializationError",
    "ChecksumMismatch", "SchemaViolation", "NullPointerException",
    "IndexOutOfBoundsError",
]

FILLER_RICH = [
    "basically", "essentially", "actually", "literally", "obviously",
    "very", "really", "quite", "just", "simply", "in order to",
]
FILLER_SENTENCES = [
    "This is basically just a simple wrapper",
    "It essentially handles the configuration",
    "This is actually quite important",
    "You really just need to provide the parameter",
    "This is obviously the recommended approach",
]

ABBREV_TARGETS = [
    "function", "parameter", "configuration", "implementation",
    "documentation", "database", "provide", "please",
]

TYPE_NAMES = ["str", "int", "float", "bool", "dict", "list", "Optional[str]",
              "Optional[int]", "bytes", "Any"]
RETURN_TYPES = ["None", "bool", "str", "int", "dict", "list", "bytes",
                "Optional[str]", "Optional[dict]", "Response"]


def _rng() -> random.Random:
    return random.Random(SEED)


# ── technical docs ─────────────────────────────────────────────────────────────

def _make_technical_docs(rng: random.Random) -> List[Sample]:
    samples = []
    for i in range(100):
        fn = rng.choice(FUNC_NAMES)
        ver = rng.choice(VERSIONS)
        ip = rng.choice(IPS)
        port = rng.choice(PORTS)
        p1, p2 = rng.choice(TYPE_NAMES), rng.choice(TYPE_NAMES)
        ret = rng.choice(RETURN_TYPES)
        env = rng.choice(ENVS)
        filler = rng.choice(FILLER_RICH) if i % 2 == 0 else ""
        abbrev = rng.choice(ABBREV_TARGETS) if i % 3 == 0 else ""

        # Half samples are filler-rich, half are lean
        if i < 50:
            text = (
                f"The `{fn}` function is {filler} a core utility in {ver}. "
                f"It accepts `host` ({p1}), `port` ({p2}, default {port}) and "
                f"connects to the {abbrev or 'service'} at {ip}:{port}. "
                f"Returns {ret}. Deployed in {env} environment. "
                f"Please provide a valid host string or a {p1} value."
            )
            marker = fn
        else:
            # Dense factual, minimal prose
            text = (
                f"`{fn}` ({ver}): connects to {ip}:{port}. "
                f"Params: host={p1}, port={p2}={port}, timeout={rng.choice(TIMEOUTS)}s. "
                f"Returns {ret}. Environment: {env}."
            )
            marker = ver

        # Clamp to 50-500 chars
        text = text[:500]
        if len(text) < 50:
            text = text + " " * (50 - len(text))

        samples.append(Sample(
            id=f"tech_{i:03d}",
            corpus_type="technical_docs",
            text=text,
            marker=marker,
            question=f"What is the function name mentioned in this doc? (or version)",
            answer=marker,
        ))
    return samples


# ── casual prose ───────────────────────────────────────────────────────────────

def _make_casual_prose(rng: random.Random) -> List[Sample]:
    intros = [
        "Hey, just wanted to let you know that",
        "So I was basically thinking",
        "Quick note:",
        "FYI,",
        "Just a heads up —",
        "Wanted to flag that",
        "Honestly,",
        "Not sure if you noticed, but",
    ]
    middles_filler = [
        "it's actually really important that we",
        "we should basically just",
        "this is obviously something we need to",
        "it's essentially just a matter of",
        "we really just have to",
    ]
    actions = [
        "update the configuration",
        "fix the database connection",
        "restart the service",
        "check the parameter values",
        "review the implementation details",
        "provide documentation",
        "run the migration script",
        "validate the input",
    ]
    samples = []
    for i in range(100):
        ip = rng.choice(IPS)
        port = rng.choice(PORTS)
        ver = rng.choice(VERSIONS)
        timeout = rng.choice(TIMEOUTS)
        intro = rng.choice(intros)
        mid = rng.choice(middles_filler) if i < 60 else ""
        action = rng.choice(actions)
        env = rng.choice(ENVS)

        if i < 60:
            # filler-heavy
            text = (
                f"{intro} {mid} {action} before the deployment. "
                f"The server at {ip} is basically running on port {port}. "
                f"We're actually using version {ver} in {env} right now. "
                f"The timeout is set to {timeout} seconds, which is really quite short."
            )
            marker = ip
        else:
            # less filler
            text = (
                f"{intro} the {env} server ({ip}:{port}) was restarted at {timeout}:00. "
                f"Running {ver}. Response times improved by about 40%. "
                f"Action: {action}."
            )
            marker = port

        text = text[:500]
        samples.append(Sample(
            id=f"casual_{i:03d}",
            corpus_type="casual_prose",
            text=text,
            marker=marker,
            question="What IP address or port is mentioned?",
            answer=marker,
        ))
    return samples


# ── code comments ──────────────────────────────────────────────────────────────

def _make_code_comments(rng: random.Random) -> List[Sample]:
    comment_styles = [
        # inline
        lambda fn, ver, t, err, p:
            f"# {fn} ({ver}): handles {p} processing. Raises {err} after {t}s timeout.",
        # docstring fragment
        lambda fn, ver, t, err, p:
            f'"""{fn} - Added in {ver}.\n\nProcesses {p} input. '
            f'Raises {err} if validation fails or timeout ({t}s) is exceeded.\n"""',
        # block comment
        lambda fn, ver, t, err, p:
            f"# TODO: Refactor {fn} before {ver} release.\n"
            f"# This function basically just wraps the {p} logic.\n"
            f"# It obviously doesn't handle {err} gracefully yet.",
        # JSDoc style
        lambda fn, ver, t, err, p:
            f"/**\n * @function {fn}\n * @since {ver}\n"
            f" * @param {p} - input value\n"
            f" * @throws {{{err}}} after {t}s\n */",
        # NOTE comment
        lambda fn, ver, t, err, p:
            f"# NOTE: {fn} was introduced in {ver}.\n"
            f"# Please provide {p} as a valid string.\n"
            f"# The implementation is essentially a thin wrapper around the {p} parser.",
    ]

    samples = []
    for i in range(100):
        fn = rng.choice(FUNC_NAMES)
        ver = rng.choice(VERSIONS)
        t = rng.choice(TIMEOUTS)
        err = rng.choice(ERRORS)
        p = rng.choice(TYPE_NAMES)
        style = rng.choice(comment_styles)
        text = style(fn, ver, t, err, p)
        text = text[:500]
        if len(text) < 50:
            text = text.ljust(50)

        # marker: the error type (specific, won't be in abbreviation dict)
        marker = err
        samples.append(Sample(
            id=f"code_{i:03d}",
            corpus_type="code_comments",
            text=text,
            marker=marker,
            question="What error/exception is mentioned?",
            answer=marker,
        ))
    return samples


# ── config files ───────────────────────────────────────────────────────────────

def _make_config_files(rng: random.Random) -> List[Sample]:
    formats = ["yaml", "json", "toml", "ini"]

    def yaml_block(ip, port, key, val, timeout, env):
        return (
            f"database:\n"
            f"  host: \"{ip}\"\n"
            f"  port: {port}\n"
            f"  {key}: {val}\n"
            f"  timeout: {timeout}\n"
            f"environment: {env}"
        )

    def json_block(ip, port, key, val, timeout, env):
        return (
            f'{{"database": {{"host": "{ip}", "port": {port}, '
            f'"{key}": {val}, "timeout": {timeout}}}, '
            f'"environment": "{env}"}}'
        )

    def toml_block(ip, port, key, val, timeout, env):
        return (
            f"[database]\n"
            f"host = \"{ip}\"\n"
            f"port = {port}\n"
            f"{key} = {val}\n"
            f"timeout = {timeout}\n\n"
            f"[app]\nenvironment = \"{env}\""
        )

    def ini_block(ip, port, key, val, timeout, env):
        return (
            f"[database]\n"
            f"host={ip}\n"
            f"port={port}\n"
            f"{key}={val}\n"
            f"timeout={timeout}\n\n"
            f"[app]\nenvironment={env}"
        )

    fmt_map = {"yaml": yaml_block, "json": json_block,
               "toml": toml_block, "ini": ini_block}

    samples = []
    for i in range(100):
        ip = rng.choice(IPS)
        port = rng.choice(PORTS)
        key = rng.choice(CFG_KEYS)
        val = rng.choice(CFG_VALS)
        timeout = rng.choice(TIMEOUTS)
        env = rng.choice(ENVS)
        fmt = rng.choice(formats)
        text = fmt_map[fmt](ip, port, key, val, timeout, env)
        text = text[:500]

        # marker: the IP address (structural, will be mangled by L4/L5 vowel removal)
        marker = ip
        samples.append(Sample(
            id=f"cfg_{i:03d}",
            corpus_type="config_files",
            text=text,
            marker=marker,
            question="What is the database host IP?",
            answer=marker,
        ))
    return samples


# ── public API ─────────────────────────────────────────────────────────────────

def build_corpus() -> List[Sample]:
    rng = _rng()
    corpus = (
        _make_technical_docs(rng)
        + _make_casual_prose(rng)
        + _make_code_comments(rng)
        + _make_config_files(rng)
    )
    assert len(corpus) == 400
    assert all(50 <= len(s.text) <= 600 for s in corpus), \
        "Some samples out of size bounds"
    return corpus
