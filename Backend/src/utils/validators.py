import json
from typing import Dict, Any
from jsonschema import validate, ValidationError

# JSON schema for target files
TARGET_SCHEMA = {
    "type": "object",
    "required": ["targets"],
    "properties": {
        "targets": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["host", "ip", "type", "method", "port", "use_ssl", "path"],
                "properties": {
                    "host": {"type": "string"},
                    "ip": {"type": "string"},
                    "type": {"type": "string"},
                    "method": {"type": "string"},
                    "port": {"type": "integer"},
                    "use_ssl": {"type": "boolean"},
                    "path": {"type": "string"}
                }
            }
        }
    }
}

def validate_json_file(filepath: str) -> tuple[bool, str]:
    """Validate JSON file against schema"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        validate(instance=data, schema=TARGET_SCHEMA)
        return True, "Valid"
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON format: {str(e)}"
    except ValidationError as e:
        return False, f"Schema validation failed: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"
