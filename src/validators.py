import json
from typing import Dict, Any
import jsonschema

# Schema for validating DDoSia target list files
TARGET_LIST_SCHEMA = {
    "type": "object",
    "required": ["targets", "randoms"],
    "properties": {
        "targets": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["target_id", "request_id", "host", "ip", "type", "method", "port"],
                "properties": {
                    "target_id": {"type": "string"},
                    "request_id": {"type": "string"},
                    "host": {"type": "string"},
                    "ip": {"type": "string"},
                    "type": {"type": "string"},
                    "method": {"type": "string"},
                    "port": {"type": "integer"},
                    "use_ssl": {"type": "boolean"},
                    "path": {"type": "string"},
                    "body": {"type": "object"},
                    "headers": {"type": ["object", "null"]}
                }
            }
        },
        "randoms": {
            "type": "array",
            "items": {
                "type": "object"
            }
        }
    }
}

class JsonValidator:
    @staticmethod
    def validate_file(filepath: str) -> tuple[bool, str]:
        """
        Validate a JSON file against the schema
        Returns: (is_valid, error_message)
        """
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            jsonschema.validate(instance=data, schema=TARGET_LIST_SCHEMA)
            return True, ""
        
        except json.JSONDecodeError as e:
            return False, f"Invalid JSON format: {str(e)}"
        except jsonschema.exceptions.ValidationError as e:
            return False, f"Schema validation failed: {str(e)}"
        except Exception as e:
            return False, f"Validation error: {str(e)}"
