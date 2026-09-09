from __future__ import annotations

from typing import Any


def get_value(obj: Any, key: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        value = obj.get(key, default)
    else:
        value = getattr(obj, key, default)
    return default if value is None else value


def js_number_str(value: float) -> str:
    if value == 0:
        return "0"
    if float(value).is_integer():
        return str(int(value))
    return format(value, ".15g")


def js_truthy(value: Any) -> bool:
    if value is None or value is False:
        return False
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if value == 0:
            return False
        try:
            if value != value:
                return False
        except Exception:
            pass
    if isinstance(value, str) and value == "":
        return False
    return True


def js_or(value: Any, fallback: Any) -> Any:
    return value if js_truthy(value) else fallback
