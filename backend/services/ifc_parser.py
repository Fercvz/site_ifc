"""
IFC Parser Service — Extracts structured index from IFC files using ifcopenshell.
Produces a JSON-serializable index containing header, units, georef, hierarchy, and element map.
"""

import ifcopenshell
import ifcopenshell.util.element
import json
import os
import re
from typing import Any


def _safe_str(val) -> str:
    """Safely convert an IFC value to a string."""
    if val is None:
        return None
    if hasattr(val, "wrappedValue"):
        return str(val.wrappedValue)
    return str(val)


def _get_step_id(entity) -> int:
    """Get the STEP file line id (#NNN) for an entity."""
    try:
        return entity.id()
    except:
        return None


def parse_header(model) -> dict:
    """Extract IFC header information."""
    header = {}
    try:
        h = model.header
        # FILE_DESCRIPTION
        if hasattr(h, "file_description"):
            fd = h.file_description
            header["file_description"] = {
                "description": list(fd.description) if fd.description else [],
                "implementation_level": fd.implementation_level or "",
            }
        # FILE_NAME
        if hasattr(h, "file_name"):
            fn = h.file_name
            header["file_name"] = {
                "name": fn.name or "",
                "time_stamp": fn.time_stamp or "",
                "author": list(fn.author) if fn.author else [],
                "organization": list(fn.organization) if fn.organization else [],
                "preprocessor_version": fn.preprocessor_version or "",
                "originating_system": fn.originating_system or "",
                "authorization": fn.authorization or "",
            }
        # FILE_SCHEMA
        if hasattr(h, "file_schema"):
            fs = h.file_schema
            header["file_schema"] = {
                "schema_identifiers": list(fs.schema_identifiers) if fs.schema_identifiers else [],
            }
    except Exception as e:
        header["_error"] = str(e)
    return header


def parse_version(model) -> dict:
    """Extract IFC version/schema information."""
    version_info = {
        "schema": model.schema,
        "schema_identifier": "",
        "version_label": "",
    }
    schema = model.schema.upper() if model.schema else ""
    version_info["schema_identifier"] = schema

    if "IFC4X3" in schema:
        version_info["version_label"] = "IFC 4.3"
    elif "IFC4" in schema:
        version_info["version_label"] = "IFC 4"
    elif "IFC2X3" in schema:
        version_info["version_label"] = "IFC 2x3"
    elif "IFC2X2" in schema:
        version_info["version_label"] = "IFC 2x2"
    elif "IFC2X" in schema:
        version_info["version_label"] = "IFC 2x"
    else:
        version_info["version_label"] = schema

    return version_info


def parse_units(model) -> list[dict]:
    """Extract unit assignments from the IFC model."""
    units = []
    try:
        projects = model.by_type("IfcProject")
        if not projects:
            return units
        project = projects[0]
        unit_assignment = project.UnitsInContext
        if not unit_assignment:
            return units

        for unit in unit_assignment.Units:
            unit_data = {
                "type": unit.is_a(),
                "step_id": _get_step_id(unit),
            }
            if unit.is_a("IfcSIUnit"):
                unit_data["unit_type"] = str(unit.UnitType) if unit.UnitType else ""
                unit_data["prefix"] = str(unit.Prefix) if unit.Prefix else ""
                unit_data["name"] = str(unit.Name) if unit.Name else ""
            elif unit.is_a("IfcConversionBasedUnit"):
                unit_data["unit_type"] = str(unit.UnitType) if unit.UnitType else ""
                unit_data["name"] = str(unit.Name) if unit.Name else ""
            elif unit.is_a("IfcDerivedUnit"):
                unit_data["unit_type"] = str(unit.UnitType) if unit.UnitType else ""
                elements_str = []
                if unit.Elements:
                    for elem in unit.Elements:
                        base = elem.Unit
                        exp = elem.Exponent
                        base_name = str(base.Name) if hasattr(base, "Name") and base.Name else base.is_a()
                        elements_str.append(f"{base_name}^{exp}" if exp != 1 else base_name)
                unit_data["name"] = " · ".join(elements_str)
            elif unit.is_a("IfcMonetaryUnit"):
                unit_data["unit_type"] = "MONETARY"
                unit_data["name"] = str(unit.Currency) if hasattr(unit, "Currency") else ""
            else:
                unit_data["name"] = unit.is_a()

            units.append(unit_data)
    except Exception as e:
        units.append({"_error": str(e)})
    return units


def parse_georef(model) -> dict:
    """Extract georeference information from the IFC model."""
    georef = {
        "has_georef": False,
        "site_data": None,
        "map_conversion": None,
        "projected_crs": None,
        "summary": [],
    }
    try:
        sites = model.by_type("IfcSite")
        if sites:
            site = sites[0]
            site_data = {
                "name": site.Name or "",
                "step_id": _get_step_id(site),
                "global_id": site.GlobalId,
            }
            # RefLatitude / RefLongitude
            if hasattr(site, "RefLatitude") and site.RefLatitude:
                lat = site.RefLatitude
                site_data["ref_latitude"] = list(lat) if lat else None
                georef["has_georef"] = True
                georef["summary"].append("RefLatitude presente")
            else:
                georef["summary"].append("RefLatitude ausente")

            if hasattr(site, "RefLongitude") and site.RefLongitude:
                lng = site.RefLongitude
                site_data["ref_longitude"] = list(lng) if lng else None
                georef["has_georef"] = True
                georef["summary"].append("RefLongitude presente")
            else:
                georef["summary"].append("RefLongitude ausente")

            if hasattr(site, "RefElevation") and site.RefElevation is not None:
                site_data["ref_elevation"] = float(site.RefElevation)
                georef["summary"].append("RefElevation presente")
            else:
                georef["summary"].append("RefElevation ausente")

            georef["site_data"] = site_data

        # IfcMapConversion (IFC4+)
        try:
            map_conversions = model.by_type("IfcMapConversion")
            if map_conversions:
                mc = map_conversions[0]
                georef["map_conversion"] = {
                    "step_id": _get_step_id(mc),
                    "eastings": float(mc.Eastings) if mc.Eastings else None,
                    "northings": float(mc.Northings) if mc.Northings else None,
                    "orthogonal_height": float(mc.OrthogonalHeight) if mc.OrthogonalHeight else None,
                    "x_axis_abscissa": float(mc.XAxisAbscissa) if hasattr(mc, "XAxisAbscissa") and mc.XAxisAbscissa else None,
                    "x_axis_ordinate": float(mc.XAxisOrdinate) if hasattr(mc, "XAxisOrdinate") and mc.XAxisOrdinate else None,
                    "scale": float(mc.Scale) if hasattr(mc, "Scale") and mc.Scale else None,
                }
                georef["has_georef"] = True
                georef["summary"].append("IfcMapConversion presente")
        except:
            pass

        # IfcProjectedCRS (IFC4+)
        try:
            crs_list = model.by_type("IfcProjectedCRS")
            if crs_list:
                crs = crs_list[0]
                georef["projected_crs"] = {
                    "step_id": _get_step_id(crs),
                    "name": str(crs.Name) if crs.Name else "",
                    "description": str(crs.Description) if hasattr(crs, "Description") and crs.Description else "",
                    "geodetic_datum": str(crs.GeodeticDatum) if hasattr(crs, "GeodeticDatum") and crs.GeodeticDatum else "",
                    "vertical_datum": str(crs.VerticalDatum) if hasattr(crs, "VerticalDatum") and crs.VerticalDatum else "",
                    "map_projection": str(crs.MapProjection) if hasattr(crs, "MapProjection") and crs.MapProjection else "",
                    "map_zone": str(crs.MapZone) if hasattr(crs, "MapZone") and crs.MapZone else "",
                }
                georef["has_georef"] = True
                georef["summary"].append("IfcProjectedCRS presente")
        except:
            pass

        if not georef["has_georef"]:
            georef["summary"] = ["Nenhum dado de georreferenciamento encontrado"]

    except Exception as e:
        georef["_error"] = str(e)
    return georef


def parse_hierarchy(model) -> dict:
    """Extract the spatial hierarchy: Project → Site → Building → Storeys."""
    hierarchy = {"project": None, "sites": [], "buildings": [], "storeys": [], "spaces": []}
    try:
        projects = model.by_type("IfcProject")
        if projects:
            p = projects[0]
            hierarchy["project"] = {
                "name": p.Name or "",
                "global_id": p.GlobalId,
                "step_id": _get_step_id(p),
                "description": _safe_str(p.Description) if p.Description else "",
            }

        for site in model.by_type("IfcSite"):
            hierarchy["sites"].append({
                "name": site.Name or "",
                "global_id": site.GlobalId,
                "step_id": _get_step_id(site),
            })

        for bldg in model.by_type("IfcBuilding"):
            hierarchy["buildings"].append({
                "name": bldg.Name or "",
                "global_id": bldg.GlobalId,
                "step_id": _get_step_id(bldg),
            })

        for storey in model.by_type("IfcBuildingStorey"):
            hierarchy["storeys"].append({
                "name": storey.Name or "",
                "global_id": storey.GlobalId,
                "step_id": _get_step_id(storey),
                "elevation": float(storey.Elevation) if storey.Elevation else None,
            })

        for space in model.by_type("IfcSpace"):
            hierarchy["spaces"].append({
                "name": space.Name or "",
                "global_id": space.GlobalId,
                "step_id": _get_step_id(space),
                "long_name": _safe_str(space.LongName) if hasattr(space, "LongName") and space.LongName else "",
            })
    except Exception as e:
        hierarchy["_error"] = str(e)
    return hierarchy


def build_entity_summary(model) -> dict:
    """Build a summary of entities by type with counts."""
    summary = {}
    try:
        for product in model.by_type("IfcProduct"):
            entity_type = product.is_a()
            if entity_type not in summary:
                summary[entity_type] = 0
            summary[entity_type] += 1
    except Exception as e:
        summary["_error"] = str(e)
    return summary


def build_element_map(model) -> list[dict]:
    """
    Build element map: list of all products with their psets/properties.
    Used for validation and chat queries.
    """
    elements = []
    try:
        for product in model.by_type("IfcProduct"):
            elem = {
                "global_id": product.GlobalId,
                "step_id": _get_step_id(product),
                "entity_type": product.is_a(),
                "name": product.Name or "",
                "psets": {},
            }
            try:
                psets = ifcopenshell.util.element.get_psets(product)
                # Normalize values to strings for JSON serialization
                for pset_name, props in psets.items():
                    elem["psets"][pset_name] = {}
                    for prop_name, prop_val in props.items():
                        if prop_name == "id":
                            continue  # skip internal id
                        elem["psets"][pset_name][prop_name] = _safe_str(prop_val)
            except Exception:
                # fallback manual extraction
                try:
                    for definition in product.IsDefinedBy:
                        if definition.is_a("IfcRelDefinesByProperties"):
                            property_set = definition.RelatingPropertyDefinition
                            if property_set.is_a("IfcPropertySet"):
                                pset_name = property_set.Name or "Unnamed"
                                props = {}
                                for prop in property_set.HasProperties:
                                    if prop.is_a("IfcPropertySingleValue"):
                                        val = _safe_str(prop.NominalValue)
                                        props[prop.Name] = val
                                elem["psets"][pset_name] = props
                except:
                    pass
            elements.append(elem)
    except Exception as e:
        elements.append({"_error": str(e)})
    return elements


def parse_ifc(file_path: str) -> dict:
    """
    Main entry point: parse an IFC file and return a structured index.
    The index contains all data needed for analysis, validation, and chat.
    """
    model = ifcopenshell.open(file_path)

    index = {
        "header": parse_header(model),
        "version": parse_version(model),
        "units": parse_units(model),
        "georef": parse_georef(model),
        "hierarchy": parse_hierarchy(model),
        "entity_summary": build_entity_summary(model),
        "elements": build_element_map(model),
        "element_count": 0,
    }
    index["element_count"] = len(index["elements"])

    # Clean up - delete the file after parsing
    try:
        os.remove(file_path)
    except:
        pass

    return index
