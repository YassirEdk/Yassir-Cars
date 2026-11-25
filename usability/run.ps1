# Runs the simulated customers on http://localhost:5998, then writes the report.
#   usability\run.ps1 -BaseUrl http://localhost:1234 -Model nom-du-modele
# or, with ANTHROPIC_API_KEY set on this computer (screenshots go to Anthropic):
#   usability\run.ps1
param([string]$BaseUrl, [string]$Model, [string]$Out = "results\latest", [switch]$DryRun)

$foveal = if ($env:FOVEAL) { $env:FOVEAL } else { "$HOME\Desktop\usability-agent-main\.venv\Scripts\foveal.exe" }
$env:PYTHONUTF8 = "1"
if (-not $env:FOVEAL_CHROMIUM_PATH) {
  $env:FOVEAL_CHROMIUM_PATH = Get-ChildItem "$env:LOCALAPPDATA\ms-playwright\chromium_headless_shell-*\*\chrome-headless-shell.exe" |
    Sort-Object FullName | Select-Object -Last 1 -ExpandProperty FullName
}
Push-Location $PSScriptRoot
try {
  $opts = @("study", "study.yaml", "--out", $Out)
  if ($BaseUrl) { $opts += "--base-url", $BaseUrl, "--persona-model", $Model }
  if ($DryRun) { $opts += "--dry-run" }
  & $foveal @opts
  if (-not $DryRun) { & $foveal study-report $Out }
} finally { Pop-Location }
