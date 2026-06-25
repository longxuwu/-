$ErrorActionPreference = "Stop"

$developPython = "D:\Develop\python-3.12.10-embed-amd64\python.exe"
$bundledPython = "C:\Users\W\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$python = if ($env:HIREPILOT_PYTHON) {
  $env:HIREPILOT_PYTHON
} elseif (Test-Path $developPython) {
  $developPython
} elseif (Test-Path $bundledPython) {
  $bundledPython
} else {
  "python"
}

& $python "backend\server.py" --host 127.0.0.1 --port 8787
