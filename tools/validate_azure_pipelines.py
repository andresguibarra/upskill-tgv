"""Valida azure-pipelines.yml contra el schema oficial (el mismo que usa la extensión de VS Code).

Uso: python3 tools/validate_azure_pipelines.py [azure-pipelines.yml]
Necesita: pip install pyyaml jsonschema
"""
import json
import sys
import urllib.request

import jsonschema
import yaml
from jsonschema.exceptions import best_match

SCHEMA_URL = "https://raw.githubusercontent.com/microsoft/azure-pipelines-vscode/main/service-schema.json"

# Tasks más nuevas que el schema publicado: se validan aparte, no contra el schema.
NEWER_THAN_SCHEMA = {"PublishCodeCoverageResults@2"}


def steps(doc):
    for job in doc.get("jobs", []):
        yield from job.get("steps", [])
    for stage in doc.get("stages", []):
        for job in stage.get("jobs", []):
            yield from job.get("steps", [])
            for hook in job.get("strategy", {}).get("runOnce", {}).values():
                yield from hook.get("steps", [])


def main(path):
    schema = json.load(urllib.request.urlopen(SCHEMA_URL))
    doc = yaml.safe_load(open(path, encoding="utf-8"))

    skipped = [s for s in steps(doc) if s.get("task") in NEWER_THAN_SCHEMA]
    for step in skipped:
        step["task"] = "CmdLine@2"          # placeholder válido para que el resto del archivo se valide
        step["inputs"] = {"script": "true"}

    errors = list(jsonschema.Draft7Validator(schema).iter_errors(doc))
    if errors:
        error = best_match(errors)
        while error.context:
            error = max(error.context, key=lambda e: len(e.absolute_path))
        print(f"{path}: inválido en {list(error.absolute_path)}: {error.message[:300]}")
        return 1

    print(f"{path}: válido ({len(skipped)} task(s) más nuevas que el schema sin validar: {sorted(NEWER_THAN_SCHEMA)})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "azure-pipelines.yml"))
