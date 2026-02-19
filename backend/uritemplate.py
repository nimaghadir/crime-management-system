"""Minimal uritemplate compatibility for DRF OpenAPI without extra dependency."""


import re

_VARIABLE_PATTERN = re.compile(r"{([^}]+)}")


def variables(template: str):
    names = []
    for raw in _VARIABLE_PATTERN.findall(template):
        name = raw.lstrip("+#./;?&")
        if "*" in name:
            name = name.split("*", 1)[0]
        if ":" in name:
            name = name.split(":", 1)[0]
        if name:
            names.append(name)
    return names
