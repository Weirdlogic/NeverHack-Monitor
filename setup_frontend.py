import os
import pathlib
from typing import Dict, List

def create_file_structure(base_path: str = "frontend") -> None:
    # Define the directory structure with files
    structure: Dict[str, List[str]] = {
        "src/components/layout": ["Sidebar.tsx", "Header.tsx", "MainLayout.tsx"],
        "src/components/dashboard": [
            "AttackTimeline.tsx",
            "PortHeatmap.tsx", 
            "StatusGrid.tsx",
            "WatchList.tsx"
        ],
        "src/components/shared": ["SearchBar.tsx", "StatusIndicator.tsx"],
        "src/hooks": ["useDebounce.ts", "useSearch.ts", "useWebSocket.ts"],
        "src/services": ["api.ts", "search.ts", "websocket.ts"],
        "src/utils": ["formatters.ts", "validators.ts"],
        "src/types": ["api.types.ts", "dashboard.types.ts"],
        "src/context": ["DashboardContext.tsx"],
        "src/pages/dashboard": ["index.tsx", "analysis.tsx", "watchlist.tsx"]
    }

    # Create base directory
    base_dir = pathlib.Path(base_path)
    
    try:
        # Create directories and files
        for directory, files in structure.items():
            # Create full directory path
            dir_path = base_dir / directory
            dir_path.mkdir(parents=True, exist_ok=True)
            print(f"Created directory: {dir_path}")

            # Create files in directory
            for file in files:
                file_path = dir_path / file
                if not file_path.exists():
                    file_path.touch()
                    # Add basic content to TypeScript/React files
                    if file.endswith(('.tsx', '.ts')):
                        with open(file_path, 'w') as f:
                            if file.endswith('.tsx'):
                                f.write(f'''import React from 'react';\n\nconst {file.split('.')[0]} = () => {{\n  return (\n    <div>\n      {file.split('.')[0]} Component\n    </div>\n  );\n}};\n\nexport default {file.split('.')[0]};''')
                            else:
                                f.write(f'''// {file}\n// Add your code here\n''')
                    print(f"Created file: {file_path}")

        # Create package.json and tsconfig.json in root
        root_files = ["package.json", "tsconfig.json", ".gitignore"]
        for file in root_files:
            file_path = base_dir / file
            if not file_path.exists():
                file_path.touch()
                print(f"Created file: {file_path}")

        print("\nDirectory structure created successfully!")
        print(f"Location: {base_dir.absolute()}")

    except Exception as e:
        print(f"Error creating directory structure: {str(e)}")

if __name__ == "__main__":
    create_file_structure()