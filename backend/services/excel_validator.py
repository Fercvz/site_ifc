"""
Excel Validation Service — Validates IFC properties against rules from an Excel spreadsheet.
Implements all business rules from the spec (section 5).
"""

import re
from typing import Any, Optional


def extract_discipline_stage(filename: str) -> tuple[str, str]:
    """
    Extract discipline (chars 7-9, 1-indexed) and stage (chars 11-13, 1-indexed)
    from the IFC filename.
    Example: VG076-GAS-COB01 → discipline=GAS, stage=COB
    """
    # Remove extension
    base = filename.rsplit(".", 1)[0] if "." in filename else filename

    if len(base) < 13:
        raise ValueError(
            f"Nome de arquivo fora do padrão esperado: '{filename}'. "
            f"O nome deve ter ao menos 13 caracteres para extrair disciplina (7-9) e etapa (11-13)."
        )

    discipline = base[6:9]  # chars 7-9 (0-indexed: 6,7,8)
    stage = base[10:13]     # chars 11-13 (0-indexed: 10,11,12)

    return discipline, stage


def parse_excel_rules(rows: list[dict], discipline: str, stage: str) -> list[dict]:
    """
    Filter and parse Excel rules based on discipline and stage.
    Expected columns: DISCIPLINA CATEGORIZADA, CATEGORIA IFC, Pset, PROPRIEDADE IFC,
                      EMB, TOR, DPX, COB, AC, FAC
    """
    STAGE_COLUMNS = ["EMB", "TOR", "DPX", "COB", "AC", "FAC"]

    if stage.upper() not in STAGE_COLUMNS:
        raise ValueError(
            f"Etapa '{stage}' não reconhecida. Etapas válidas: {', '.join(STAGE_COLUMNS)}"
        )

    filtered_rules = []
    for row in rows:
        row_discipline = str(row.get("DISCIPLINA CATEGORIZADA", "")).strip()
        if row_discipline != discipline:
            continue

        category = str(row.get("CATEGORIA IFC", "")).strip()
        pset_name = str(row.get("Pset", "")).strip()
        prop_name = str(row.get("PROPRIEDADE IFC", "")).strip()
        expected = str(row.get(stage.upper(), "")).strip() if row.get(stage.upper()) is not None else ""

        if not category or not pset_name or not prop_name:
            continue

        filtered_rules.append({
            "category": category,
            "pset": pset_name,
            "property": prop_name,
            "expected": expected,
        })

    return filtered_rules


def parse_expected_value(expected: str) -> dict:
    """
    Parse the expected value to determine the validation rule type.
    Returns: { type: "ignore"|"exists"|"list"|"exact", values: [...] }
    """
    if not expected or expected.strip() == "":
        return {"type": "ignore", "values": []}

    if expected.strip().upper() == "NÃO SE APLICA":
        return {"type": "ignore", "values": []}

    if expected.strip().upper() == "SIM":
        return {"type": "exists", "values": []}

    # Check for list patterns: [A, B, C] (Opção B) or A,B,C
    list_match = re.match(r'^\[(.+?)\](?:\s*\(.+?\))?$', expected.strip())
    if list_match:
        items = [item.strip() for item in list_match.group(1).split(",")]
        return {"type": "list", "values": items}

    # Check for comma-separated without brackets
    if "," in expected and not expected.startswith("["):
        items = [item.strip() for item in expected.split(",")]
        if len(items) > 1:
            return {"type": "list", "values": items}

    return {"type": "exact", "values": [expected]}


def validate_element(element: dict, rules: list[dict]) -> list[dict]:
    """
    Validate a single element against all applicable rules.
    Returns a list of result dicts per rule.
    """
    results = []
    entity_type = element.get("entity_type", "")
    psets = element.get("psets", {})

    for rule in rules:
        if rule["category"] != entity_type:
            continue

        parsed = parse_expected_value(rule["expected"])

        if parsed["type"] == "ignore":
            results.append({
                "global_id": element.get("global_id", ""),
                "step_id": element.get("step_id"),
                "entity_type": entity_type,
                "name": element.get("name", ""),
                "pset": rule["pset"],
                "property": rule["property"],
                "expected": rule["expected"],
                "actual": None,
                "status": "Ignorado",
                "reason": "",
            })
            continue

        # Check pset
        pset_data = psets.get(rule["pset"])
        if pset_data is None:
            results.append({
                "global_id": element.get("global_id", ""),
                "step_id": element.get("step_id"),
                "entity_type": entity_type,
                "name": element.get("name", ""),
                "pset": rule["pset"],
                "property": rule["property"],
                "expected": rule["expected"],
                "actual": None,
                "status": "Não Conforme",
                "reason": "Pset ausente",
            })
            continue

        # Check property
        actual_value = pset_data.get(rule["property"])
        if actual_value is None:
            results.append({
                "global_id": element.get("global_id", ""),
                "step_id": element.get("step_id"),
                "entity_type": entity_type,
                "name": element.get("name", ""),
                "pset": rule["pset"],
                "property": rule["property"],
                "expected": rule["expected"],
                "actual": None,
                "status": "Não Conforme",
                "reason": "Propriedade ausente",
            })
            continue

        actual_str = str(actual_value).strip() if actual_value is not None else ""

        # Rule: SIM → property must exist and not be empty
        if parsed["type"] == "exists":
            if actual_str == "" or actual_str.lower() == "none":
                results.append({
                    "global_id": element.get("global_id", ""),
                    "step_id": element.get("step_id"),
                    "entity_type": entity_type,
                    "name": element.get("name", ""),
                    "pset": rule["pset"],
                    "property": rule["property"],
                    "expected": rule["expected"],
                    "actual": actual_str,
                    "status": "Não Conforme",
                    "reason": "Valor ausente",
                })
            else:
                results.append({
                    "global_id": element.get("global_id", ""),
                    "step_id": element.get("step_id"),
                    "entity_type": entity_type,
                    "name": element.get("name", ""),
                    "pset": rule["pset"],
                    "property": rule["property"],
                    "expected": rule["expected"],
                    "actual": actual_str,
                    "status": "Conforme",
                    "reason": "",
                })
            continue

        # Rule: list → actual must exactly match one item
        if parsed["type"] == "list":
            if actual_str in parsed["values"]:
                results.append({
                    "global_id": element.get("global_id", ""),
                    "step_id": element.get("step_id"),
                    "entity_type": entity_type,
                    "name": element.get("name", ""),
                    "pset": rule["pset"],
                    "property": rule["property"],
                    "expected": rule["expected"],
                    "actual": actual_str,
                    "status": "Conforme",
                    "reason": "",
                })
            else:
                results.append({
                    "global_id": element.get("global_id", ""),
                    "step_id": element.get("step_id"),
                    "entity_type": entity_type,
                    "name": element.get("name", ""),
                    "pset": rule["pset"],
                    "property": rule["property"],
                    "expected": rule["expected"],
                    "actual": actual_str,
                    "status": "Não Conforme",
                    "reason": "Fora da lista permitida",
                })
            continue

        # Rule: exact match
        if actual_str == rule["expected"]:
            results.append({
                "global_id": element.get("global_id", ""),
                "step_id": element.get("step_id"),
                "entity_type": entity_type,
                "name": element.get("name", ""),
                "pset": rule["pset"],
                "property": rule["property"],
                "expected": rule["expected"],
                "actual": actual_str,
                "status": "Conforme",
                "reason": "",
            })
        else:
            results.append({
                "global_id": element.get("global_id", ""),
                "step_id": element.get("step_id"),
                "entity_type": entity_type,
                "name": element.get("name", ""),
                "pset": rule["pset"],
                "property": rule["property"],
                "expected": rule["expected"],
                "actual": actual_str,
                "status": "Não Conforme",
                "reason": "Valor divergente",
            })

    return results


def run_validation(elements: list[dict], rules: list[dict]) -> dict:
    """
    Run the full validation pipeline across all elements and rules.
    Returns aggregated results with summary statistics.
    """
    all_results = []
    for element in elements:
        element_results = validate_element(element, rules)
        all_results.extend(element_results)

    # Compute aggregations
    non_ignored = [r for r in all_results if r["status"] != "Ignorado"]
    conformes = [r for r in non_ignored if r["status"] == "Conforme"]
    nao_conformes = [r for r in non_ignored if r["status"] == "Não Conforme"]

    # Unique elements evaluated
    evaluated_guids = set(r["global_id"] for r in non_ignored if r["global_id"])
    conforme_guids = set()
    nao_conforme_guids = set()
    for guid in evaluated_guids:
        element_results = [r for r in non_ignored if r["global_id"] == guid]
        if all(r["status"] == "Conforme" for r in element_results):
            conforme_guids.add(guid)
        else:
            nao_conforme_guids.add(guid)

    # By entity
    by_entity = {}
    for r in non_ignored:
        et = r["entity_type"]
        if et not in by_entity:
            by_entity[et] = {"total": 0, "conforme": 0, "nao_conforme": 0}
        by_entity[et]["total"] += 1
        if r["status"] == "Conforme":
            by_entity[et]["conforme"] += 1
        else:
            by_entity[et]["nao_conforme"] += 1

    # By property
    by_property = {}
    for r in non_ignored:
        key = f"{r['pset']}.{r['property']}"
        if key not in by_property:
            by_property[key] = {"total": 0, "conforme": 0, "nao_conforme": 0}
        by_property[key]["total"] += 1
        if r["status"] == "Conforme":
            by_property[key]["conforme"] += 1
        else:
            by_property[key]["nao_conforme"] += 1

    # By reason
    by_reason = {}
    for r in nao_conformes:
        reason = r["reason"]
        by_reason[reason] = by_reason.get(reason, 0) + 1

    summary = {
        "total_evaluated_elements": len(evaluated_guids),
        "total_conforme_elements": len(conforme_guids),
        "total_nao_conforme_elements": len(nao_conforme_guids),
        "percent_conforme": round(len(conforme_guids) / max(len(evaluated_guids), 1) * 100, 1),
        "total_rules_applied": len(non_ignored),
        "total_conformes": len(conformes),
        "total_nao_conformes": len(nao_conformes),
    }

    return {
        "summary": summary,
        "by_entity": by_entity,
        "by_property": by_property,
        "by_reason": by_reason,
        "issues": nao_conformes,
        "all_results": all_results,
    }
