# Historical compatibility entry point. Restores original P13/P14/P15 stages
# from the verified content-addressed archive, never overwriting existing files.
$ErrorActionPreference = 'Stop'
$driver = Join-Path $PSScriptRoot 'restore_historical_stages_20261122.ps1'
& $driver -StageNames @('_p13_stage_20261116','_p14_stage_20261116','_p15_stage_20261116')
if (!$?) { throw 'P13/P14/P15 restoration failed' }
