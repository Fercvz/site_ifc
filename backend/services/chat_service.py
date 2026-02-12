"""
Chat Service — OpenAI-powered Q&A about the IFC model.
Builds context from the IFC index and returns answers with IFC source citations.
"""

import os
import json
import re
from typing import Any, Optional

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


def _build_system_prompt(ifc_index: dict, ifc_filename: str = "") -> str:
    """Build a system prompt with IFC model context for the AI."""
    header = ifc_index.get("header", {})
    hierarchy = ifc_index.get("hierarchy", {})
    version = ifc_index.get("version", {})
    entity_summary = ifc_index.get("entity_summary", {})
    units = ifc_index.get("units", [])
    georef = ifc_index.get("georef", {})

    # Header info
    file_name_header = header.get("file_name", {})
    header_name = file_name_header.get("name", "")
    header_author = ", ".join(file_name_header.get("author", [])) or "N/A"
    header_org = ", ".join(file_name_header.get("organization", [])) or "N/A"
    header_system = file_name_header.get("originating_system", "N/A")
    header_timestamp = file_name_header.get("time_stamp", "N/A")

    # Build a concise model summary
    project_name = hierarchy.get("project", {}).get("name", "Unknown")
    schema = version.get("version_label", version.get("schema", "Unknown"))

    # Full entity summary with all counts
    entity_count_str = "\n".join(
        f"  - {etype}: {count}" for etype, count in sorted(entity_summary.items())
    )
    total_elements = ifc_index.get("element_count", sum(entity_summary.values()))

    units_str = "\n".join(
        f"  - {u.get('unit_type', 'N/A')}: {u.get('name', 'N/A')}" for u in units if '_error' not in u
    )

    sites = hierarchy.get("sites", [])
    buildings = hierarchy.get("buildings", [])
    storeys = hierarchy.get("storeys", [])
    spaces = hierarchy.get("spaces", [])

    hierarchy_str = f"""
  Project: {project_name}
  Sites: {', '.join(s['name'] for s in sites) or 'Nenhum'}
  Buildings: {', '.join(b['name'] for b in buildings) or 'Nenhum'}
  Storeys: {', '.join(s['name'] for s in storeys) or 'Nenhum'}
  Spaces: {len(spaces)} espaços"""

    # Sample elements (first 50 for context window management)
    elements = ifc_index.get("elements", [])[:50]
    elements_str = ""
    for el in elements:
        psets_info = []
        for pset_name, props in el.get("psets", {}).items():
            prop_list = ", ".join(f"{k}={v}" for k, v in list(props.items())[:5])
            psets_info.append(f"    {pset_name}: {prop_list}")
        psets_block = "\n".join(psets_info) if psets_info else "    (sem property sets)"
        elements_str += f"""
  [{el.get('entity_type', '?')}] {el.get('name', 'Sem nome')}
    GlobalId: {el.get('global_id', '?')} | STEP #: {el.get('step_id', '?')}
{psets_block}
"""

    system_prompt = f"""Você é um assistente especialista em BIM e IFC. Responda perguntas EXCLUSIVAMENTE com base nos dados do modelo IFC carregado nesta sessão.

## Dados do Modelo IFC

**Nome do arquivo**: {ifc_filename or header_name or 'Não informado'}
**Schema**: {schema}
**Projeto**: {project_name}
**Autor**: {header_author}
**Organização**: {header_org}
**Sistema de origem**: {header_system}
**Data de criação**: {header_timestamp}
**Total de elementos**: {total_elements}

### Hierarquia Espacial
{hierarchy_str}

### Resumo de Entidades (CONTAGEM EXATA)
{entity_count_str}
  TOTAL: {total_elements} elementos

### Unidades
{units_str}

### Georreferenciamento
  Status: {"Presente" if georef.get("has_georef") else "Ausente"}
  Detalhes: {', '.join(georef.get('summary', []))}

### Elementos (amostra — {len(elements)} de {total_elements} total)
{elements_str}

## Regras de Resposta
1. Responda SOMENTE com base nos dados acima. Não invente informações.
2. Se não souber a resposta com base nos dados disponíveis, diga explicitamente.
3. Use os dados EXATOS fornecidos acima — por exemplo, para contagens de entidades, use os números da seção "Resumo de Entidades".
4. O nome do arquivo IFC é "{ifc_filename}" — use esse dado quando perguntado.
5. Quando descrever um elemento, SEMPRE liste TODOS os seus atributos e Property Sets (Psets) com todas as propriedades e valores. Formate assim:
   - **Atributos**: Nome, Tipo de Entidade, GlobalId, STEP id
   - **Property Sets**: Liste cada Pset com TODAS as propriedades e valores contidos nele
6. Ao final de TODA resposta, inclua uma seção "**Fontes no IFC:**" listando:
   - GlobalId (GUID) quando existir
   - STEP id (#NNN) quando aplicável
   - Entidade (IfcWall, IfcSpace, etc.)
   - Caminho do dado (ex.: Pset_X.PropY, IfcProject.Name, etc.)
7. Response in the same language as the user's question (Portuguese or English).
"""
    return system_prompt


def _find_relevant_elements(ifc_index: dict, user_message: str) -> str:
    """Search for elements mentioned in the user message and return their full data."""
    elements = ifc_index.get("elements", [])
    if not elements:
        return ""

    found = []

    # Search by GlobalId pattern (22 alphanumeric chars)
    guid_pattern = r'[0-9a-zA-Z_$]{20,22}'
    guids_in_msg = re.findall(guid_pattern, user_message)
    for guid in guids_in_msg:
        for el in elements:
            if el.get("global_id", "").startswith(guid) or guid in el.get("global_id", ""):
                if el not in found:
                    found.append(el)

    # Search by STEP id (#NNN)
    step_pattern = r'#(\d+)'
    steps_in_msg = re.findall(step_pattern, user_message)
    for step_id in steps_in_msg:
        step_int = int(step_id)
        for el in elements:
            if el.get("step_id") == step_int:
                if el not in found:
                    found.append(el)

    if not found:
        return ""

    # Build detailed context for found elements
    context = "\n\n## DADOS DETALHADOS DOS ELEMENTOS MENCIONADOS\n"
    context += "Use estas informações para responder à pergunta do usuário.\n\n"

    for el in found[:5]:  # Limit to 5 elements
        context += f"### [{el.get('entity_type', '?')}] {el.get('name', 'Sem nome')}\n"
        context += f"- **GlobalId**: {el.get('global_id', '?')}\n"
        context += f"- **STEP id**: #{el.get('step_id', '?')}\n"
        context += f"- **Tipo de Entidade**: {el.get('entity_type', '?')}\n"
        context += f"- **Nome**: {el.get('name', 'Sem nome')}\n\n"

        psets = el.get("psets", {})
        if psets:
            context += "**Property Sets:**\n"
            for pset_name, props in psets.items():
                context += f"\n  **{pset_name}**:\n"
                for prop_name, prop_val in props.items():
                    context += f"    - {prop_name}: {prop_val}\n"
        else:
            context += "  *(Sem Property Sets)*\n"
        context += "\n"

    return context


def chat_with_model(
    ifc_index: dict,
    user_message: str,
    conversation_history: Optional[list[dict]] = None,
    ifc_filename: str = "",
) -> dict:
    """
    Send a question about the IFC model to OpenAI and return the response with sources.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")

    if not api_key or api_key == "sk-your-key-here":
        return {
            "answer": "⚠️ Chave da API OpenAI não configurada. Configure a variável OPENAI_API_KEY no arquivo .env do backend.",
            "sources": [],
        }

    if OpenAI is None:
        return {
            "answer": "⚠️ Biblioteca openai não instalada. Execute: pip install openai",
            "sources": [],
        }

    client = OpenAI(api_key=api_key)

    system_prompt = _build_system_prompt(ifc_index, ifc_filename=ifc_filename)

    # Enrich with relevant element data based on user message
    element_context = _find_relevant_elements(ifc_index, user_message)

    messages = [{"role": "system", "content": system_prompt}]

    if conversation_history:
        messages.extend(conversation_history[-10:])  # Last 10 messages for context

    # If we found relevant elements, inject them before the user message
    if element_context:
        messages.append({"role": "system", "content": element_context})

    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.3,
            max_tokens=2000,
        )

        answer = response.choices[0].message.content

        # Parse sources from the answer
        sources = _extract_sources(answer, ifc_index)

        return {
            "answer": answer,
            "sources": sources,
        }

    except Exception as e:
        return {
            "answer": f"Erro ao consultar a IA: {str(e)}",
            "sources": [],
        }


def _extract_sources(answer: str, ifc_index: dict) -> list[dict]:
    """Extract IFC source citations from the AI response."""
    import re

    sources = []
    elements = ifc_index.get("elements", [])

    # Find GUIDs mentioned in the answer
    guid_pattern = r'[0-9a-zA-Z_$]{22}'
    found_guids = re.findall(guid_pattern, answer)

    for guid in found_guids:
        for el in elements:
            if el.get("global_id") == guid:
                sources.append({
                    "guid": guid,
                    "step_id": el.get("step_id"),
                    "entity": el.get("entity_type", ""),
                    "path": f"{el.get('entity_type', '')}.GlobalId",
                })
                break

    # Find STEP ids
    step_pattern = r'#(\d+)'
    found_steps = re.findall(step_pattern, answer)
    for step_id in found_steps:
        step_int = int(step_id)
        for el in elements:
            if el.get("step_id") == step_int:
                if not any(s.get("step_id") == step_int for s in sources):
                    sources.append({
                        "guid": el.get("global_id", ""),
                        "step_id": step_int,
                        "entity": el.get("entity_type", ""),
                        "path": f"#{step_id}",
                    })
                break

    return sources
