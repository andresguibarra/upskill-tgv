"""Valida azure-pipelines.yml y sus templates contra el schema oficial (el de la extensión de VS Code).

Uso: python3 tools/validate_azure_pipelines.py [archivo.yml ...]
Sin argumentos valida azure-pipelines.yml y pipelines/templates/*.yml.
Necesita: pip install pyyaml jsonschema
"""
import glob
import json
import sys
import urllib.request

import jsonschema
import yaml
from jsonschema.exceptions import best_match

SCHEMA_URL = "https://raw.githubusercontent.com/microsoft/azure-pipelines-vscode/main/service-schema.json"

# Tasks más nuevas que el schema publicado: se reemplazan por un placeholder válido y no se validan.
NEWER_THAN_SCHEMA = {"PublishCodeCoverageResults@2"}


def replace_newer_tasks(node):
    """Recorre todo el documento (también ${{ if }} y templates) y devuelve cuántas tasks reemplazó."""
    count = 0
    if isinstance(node, dict):
        if node.get("task") in NEWER_THAN_SCHEMA:
            node["task"], node["inputs"] = "CmdLine@2", {"script": "true"}
            count += 1
        for value in node.values():
            count += replace_newer_tasks(value)
    elif isinstance(node, list):
        for item in node:
            count += replace_newer_tasks(item)
    return count


def is_expression(key):
    return isinstance(key, str) and key.strip().startswith("${{")


def normalize(node):
    """Lleva el documento a lo que ve el schema.

    - Azure lee todos los escalares de YAML como strings (`default: true` es "true").
    - Las inserciones `${{ if }}:` / `${{ else }}:` se expanden con todas sus ramas,
      así se valida el contenido de cada una (el schema no conoce las expresiones).
    """
    if isinstance(node, list):
        out = []
        for item in node:
            if isinstance(item, dict) and len(item) == 1 and is_expression(next(iter(item))):
                body = normalize(next(iter(item.values())))
                out.extend(body if isinstance(body, list) else [body])
            else:
                out.append(normalize(item))
        return out
    if isinstance(node, dict):
        out = {}
        for key, value in node.items():
            if is_expression(key) and isinstance(value, dict):
                out.update(normalize(value))
            else:
                out[key] = normalize(value)
        return out
    if isinstance(node, bool):
        return "true" if node else "false"
    if isinstance(node, (int, float)):
        return str(node)
    return node


def validate(path, validator):
    doc = normalize(yaml.safe_load(open(path, encoding="utf-8")))
    skipped = replace_newer_tasks(doc)
    errors = list(validator.iter_errors(doc))
    if errors:
        error = best_match(errors)
        while error.context:
            error = max(error.context, key=lambda e: len(e.absolute_path))
        print(f"{path}: inválido en {list(error.absolute_path)}: {error.message[:300]}")
        return False
    print(f"{path}: válido" + (f" ({skipped} task(s) más nuevas que el schema sin validar)" if skipped else ""))
    return True


def main(paths):
    schema = json.load(urllib.request.urlopen(SCHEMA_URL))
    validator = jsonschema.Draft7Validator(schema)
    paths = paths or ["azure-pipelines.yml", *sorted(glob.glob("pipelines/templates/*.yml"))]
    results = [validate(p, validator) for p in paths]
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
