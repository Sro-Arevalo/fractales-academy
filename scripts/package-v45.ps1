$ErrorActionPreference='Stop'
$projectPath=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$packagePath=Join-Path $projectPath 'fractales-deploy-v45-20261028.zip'
$contentPaths=@('server','public','package.json','package-lock.json','web.config','.deployment') | ForEach-Object { Join-Path $projectPath $_ } | Where-Object { Test-Path -LiteralPath $_ }
Compress-Archive -LiteralPath $contentPaths -DestinationPath $packagePath -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[IO.Compression.ZipFile]::OpenRead($packagePath)
try {
 foreach($entry in $archive.Entries){
  if($entry.FullName -match '(^|[\\/])(node_modules|\.env|tests|scripts|artifacts|\.git)([\\/]|$)' -or $entry.FullName -match '\.(bak|bacpac|mdf|ldf|log)$'){throw "Contenido privado inesperado: $($entry.FullName)"}
  if($entry.Name -eq ''){continue}
  $taskSha=[Security.Cryptography.SHA256]::Create();$stream=$entry.Open()
  try{$entryHash=[BitConverter]::ToString($taskSha.ComputeHash($stream)).Replace('-','')}finally{$stream.Dispose();$taskSha.Dispose()}
  $sourceHash=(Get-FileHash -LiteralPath (Join-Path $projectPath $entry.FullName) -Algorithm SHA256).Hash
  if($sourceHash -ne $entryHash){throw "El paquete difiere de la fuente: $($entry.FullName)"}
 }
 Write-Output "Paquete preparado: $packagePath ($($archive.Entries.Count) entradas). No se publico en Azure."
} finally {$archive.Dispose()}
Get-FileHash -LiteralPath $packagePath -Algorithm SHA256 | Select-Object Algorithm,Hash,Path
