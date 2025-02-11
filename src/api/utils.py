from datetime import datetime
from typing import Any
import json

class JSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def serialize_datetime(obj: Any) -> str:
    return json.dumps(obj, cls=JSONEncoder)
