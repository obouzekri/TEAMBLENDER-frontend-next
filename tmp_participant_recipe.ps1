$ErrorActionPreference = "Stop"
$ownerLoginBody = @{ email = "admin@test.com"; password = "Test1234!" } | ConvertTo-Json
$ownerLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body $ownerLoginBody
$ownerHeaders = @{ Authorization = "Bearer $($ownerLogin.token)"; "Content-Type" = "application/json" }
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$pEmail = "participant.recipe.$stamp@test.com"
$pPass = "Recipe1234!"
$createPBody = @{ email = $pEmail; first_name = "Recipe"; last_name = "Participant"; password = $pPass; job_title = "QA"; department = "Ops" } | ConvertTo-Json
$createP = Invoke-RestMethod -Method Post -Uri ("http://localhost:3000/api/users/{0}/participants" -f $ownerLogin.user.id) -Headers $ownerHeaders -Body $createPBody
$participantId = [int]$createP.participantId
$ch = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/challenges" -Headers $ownerHeaders
$target = @($ch) | Where-Object { $_.engine_key -eq "phrase_collaborative_v1" } | Select-Object -First 1
if (-not $target) { $target = @($ch) | Select-Object -First 1 }
$createSBody = @{ name = "Session Recipe $stamp"; challenge_ids = @([int]$target.id); modality = "remote"; status = "preparee" } | ConvertTo-Json
$session = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/sessions" -Headers $ownerHeaders -Body $createSBody
$sessionId = [int]$session.id
$assignBody = @{ sessionId = $sessionId } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri ("http://localhost:3000/api/participants/{0}/assign-session" -f $participantId) -Headers $ownerHeaders -Body $assignBody | Out-Null
$activateBody = @{ active_challenge_id = [int]$target.id } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri ("http://localhost:3000/api/sessions/{0}/active-challenge" -f $sessionId) -Headers $ownerHeaders -Body $activateBody | Out-Null
$participantLoginBody = @{ email = $pEmail; password = $pPass } | ConvertTo-Json
$participantLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login-participant" -ContentType "application/json" -Body $participantLoginBody
$participantHeaders = @{ Authorization = "Bearer $($participantLogin.token)" }
$runtime = Invoke-RestMethod -Method Get -Uri ("http://localhost:3000/api/sessions/{0}/runtime-challenge" -f $sessionId) -Headers $participantHeaders
Write-Output ("RECIPE_OWNER=" + $ownerLogin.user.email + "|" + $ownerLogin.user.role)
Write-Output ("RECIPE_PARTICIPANT_EMAIL=" + $pEmail)
Write-Output ("RECIPE_PARTICIPANT_PASSWORD=" + $pPass)
Write-Output ("RECIPE_PARTICIPANT_ID=" + $participantId)
Write-Output ("RECIPE_SESSION_ID=" + $sessionId)
Write-Output ("RECIPE_ENGINE=" + $runtime.engine_key)
