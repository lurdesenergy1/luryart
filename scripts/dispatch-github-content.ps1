param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("concert", "news", "video")]
  [string]$Kind,

  [Parameter(Mandatory = $true)]
  [string]$PayloadPath,

  [string]$RepoOwner = $env:GITHUB_OWNER,
  [string]$RepoName = $env:GITHUB_REPO,
  [string]$Token = $env:GITHUB_TOKEN
)

if ([string]::IsNullOrWhiteSpace($RepoOwner) -or [string]::IsNullOrWhiteSpace($RepoName) -or [string]::IsNullOrWhiteSpace($Token)) {
  throw "Debes definir GITHUB_OWNER, GITHUB_REPO y GITHUB_TOKEN o pasarlos al script."
}

if (-not (Test-Path $PayloadPath)) {
  throw "No existe el archivo payload: $PayloadPath"
}

$payloadContent = Get-Content $PayloadPath -Raw | ConvertFrom-Json
$body = @{
  event_type = "telegram-content-update"
  client_payload = @{
    kind = $Kind
    entry = $payloadContent
  }
} | ConvertTo-Json -Depth 10

$headers = @{
  Accept = "application/vnd.github+json"
  Authorization = "Bearer $Token"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$url = "https://api.github.com/repos/$RepoOwner/$RepoName/dispatches"
Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body -ContentType "application/json"

Write-Host "Dispatch enviado a $RepoOwner/$RepoName para $Kind" -ForegroundColor Green
