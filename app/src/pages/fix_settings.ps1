$file = 'g:\my work\MyRestoredProjects\healy-system\app\src\pages\Settings.tsx'
$lines = [System.IO.File]::ReadAllLines($file)

$targetLines = [System.Collections.Generic.List[string]]::new($lines)

# Structural Review of Indices:
# Line 1300: )} (Index 1299)
# Line 1301: </div> (Index 1300)
# Line 1302: </div> (Index 1301)
# Line 1303: </div> (Index 1302) -> EXTRA
# Line 1304: ); (Index 1303)
# Line 1305: } (Index 1304) -> EXTRA

Write-Host "Initial line 1303: '$($targetLines[1302])'"
Write-Host "Initial line 1305: '$($targetLines[1304])'"

# Remove extra </div> (Index 1302)
$targetLines.RemoveAt(1302)
# Now what was at 1304 is at 1303
Write-Host "New line 1304 (now 1303): '$($targetLines[1303])'"

# Remove extra } (Now at Index 1303, was original line 1305)
$targetLines.RemoveAt(1303)

[System.IO.File]::WriteAllLines($file, $targetLines, [System.Text.UTF8Encoding]::new($false))
Write-Host "Cleaned up extra tags successfully."
