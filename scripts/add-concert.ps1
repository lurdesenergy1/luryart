param(
  [string]$Path = (Join-Path $PSScriptRoot "..\\content\\concerts.json")
)

function Remove-Diacritics {
  param([string]$Text)

  $normalized = $Text.Normalize([Text.NormalizationForm]::FormD)
  $builder = New-Object System.Text.StringBuilder

  foreach ($char in $normalized.ToCharArray()) {
    $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
    if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($char)
    }
  }

  return $builder.ToString().Normalize([Text.NormalizationForm]::FormC)
}

function New-Slug {
  param([string]$Text)

  $plain = Remove-Diacritics -Text $Text
  return (($plain.ToLower() -replace "[^a-z0-9]+", "-").Trim("-"))
}

if (-not (Test-Path $Path)) {
  throw "No se encuentra el archivo de conciertos: $Path"
}

$title = Read-Host "Título del concierto"
$date = Read-Host "Fecha (AAAA-MM-DD)"
$time = Read-Host "Hora (opcional, ej. 19:30)"
$venue = Read-Host "Recinto o iglesia"
$city = Read-Host "Ciudad"
$description = Read-Host "Descripción corta"
$ticketUrl = Read-Host "URL de más información (opcional)"
$featuredAnswer = Read-Host "¿Destacar en portada? (s/n)"
$status = Read-Host "Estado [upcoming, soldout, cancelled] (Enter para upcoming)"

if ([string]::IsNullOrWhiteSpace($title)) {
  throw "El título es obligatorio."
}

if ($date -notmatch "^\d{4}-\d{2}-\d{2}$") {
  throw "La fecha debe tener formato AAAA-MM-DD."
}

if ([string]::IsNullOrWhiteSpace($status)) {
  $status = "upcoming"
}

$featured = $featuredAnswer -match "^(s|si|sí|y|yes)$"
$id = "{0}-{1}" -f (New-Slug -Text $title), $date

$existing = Get-Content $Path -Raw | ConvertFrom-Json
if ($null -eq $existing) {
  $existing = @()
}

$updated = @($existing) + [pscustomobject]@{
  id = $id
  title = $title
  date = $date
  time = $time
  venue = $venue
  city = $city
  description = $description
  ticketUrl = $ticketUrl
  status = $status
  featured = $featured
}

$sorted = $updated | Sort-Object @{ Expression = { $_.featured -eq $true }; Descending = $true }, @{ Expression = { $_.date } }
$json = $sorted | ConvertTo-Json -Depth 5
Set-Content -Path $Path -Value $json -Encoding UTF8

Write-Host ""
Write-Host "Concierto añadido en $Path" -ForegroundColor Green
Write-Host "Siguiente paso: sube estos cambios al sitio o al repositorio conectado a Netlify."
