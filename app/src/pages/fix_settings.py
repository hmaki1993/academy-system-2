import sys

file_path = r'g:\my work\MyRestoredProjects\healy-system\app\src\pages\Settings.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix Login tab (Line 1226 - index 1225)
# Current: '                                 )}\n'
# New: '                                    </div>\n                                )}\n'
lines[1225] = '                                    </div>\n                                )}\n'

# Fix Profile tab and Root (Lines 1298-1301 - index 1297-1300)
# This includes closing space-y-8, the block, the parent grid, and the root div.
lines[1297] = '                                </div>\n'
lines[1298] = '                            )}\n'
lines[1299] = '                        </div>\n'
lines[1300] = '                    </div>\n'

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Settings.tsx structural fixes applied.")
