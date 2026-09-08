"""
Minimal dotted/bracket path addressing for the plain dict/list structures
used by the extraction JSON contract (the same shape GeminiProvider and
GeminiVisionProvider both produce).

This is intentionally NOT a general JSONPath implementation - it only
supports what the contract actually needs: dict-key access and integer
list indices, e.g. "medications[1].confidence.extraction_confidence".
Used by the vision agent to read/compare/patch specific fields flagged
for targeted re-inspection without having to special-case every entity
shape in the contract.
"""

import re
from typing import Any

_TOKEN_RE = re.compile(r"([^.\[\]]+)|\[(\d+)\]")

_MISSING = object()


def _tokens(path: str) -> list[str | int]:
    tokens: list[str | int] = []
    for match in _TOKEN_RE.finditer(path):
        key, index = match.groups()
        if key is not None:
            tokens.append(key)
        else:
            tokens.append(int(index))

    if not tokens:
        raise ValueError(f"Invalid path: {path!r}")

    return tokens


def get_path(data: Any, path: str, default: Any = None) -> Any:
    """
    Return the value at `path`, or `default` if any segment is missing
    or the wrong type. Never raises for a merely-absent path.
    """
    current = data

    try:
        for token in _tokens(path):
            current = current[token]
        return current
    except (KeyError, IndexError, TypeError):
        return default


def has_path(data: Any, path: str) -> bool:
    return get_path(data, path, _MISSING) is not _MISSING


def set_path(data: Any, path: str, value: Any) -> None:
    """
    Set the value at `path` in-place. Every intermediate segment must
    already exist (this never creates missing dicts/lists) - the
    extraction contract always has every key present per Section 15 of
    the extraction prompt ("keep every schema key present even when its
    value is null or []"), so callers operate on a fully-shaped dict.
    """
    tokens = _tokens(path)
    current = data

    for token in tokens[:-1]:
        current = current[token]

    current[tokens[-1]] = value


def parent_container(data: Any, path: str) -> tuple[Any, str | int]:
    """
    Return (container, final_key) for `path`, so a caller can both read
    and write the final segment without re-walking the path twice.
    """
    tokens = _tokens(path)
    current = data

    for token in tokens[:-1]:
        current = current[token]

    return current, tokens[-1]
