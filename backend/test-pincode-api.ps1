# PowerShell test script for pincode API
Write-Host "🧪 Testing Pincode API Response Format" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Test pincodes
$pincodes = @("110001", "110008", "400001")
$baseUrl = "http://localhost:5000"

Write-Host ""
Write-Host "🔓 Test 1: Without Authentication" -ForegroundColor Yellow
Write-Host "---------------------------------" -ForegroundColor Yellow

foreach ($pincode in $pincodes) {
    Write-Host ""
    Write-Host "📍 Testing pincode: $pincode" -ForegroundColor Green
    Write-Host "URL: $baseUrl/api/tools/pincode-info/$pincode" -ForegroundColor Gray
    Write-Host ""
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/tools/pincode-info/$pincode" -Method GET -ContentType "application/json"
        Write-Host "✅ Response:" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
    }
    catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔐 Test 2: With Authentication" -ForegroundColor Yellow
Write-Host "-------------------------------" -ForegroundColor Yellow
Write-Host "To test with auth, run:" -ForegroundColor White
Write-Host "`$headers = @{'Authorization' = 'Bearer YOUR_JWT_TOKEN'}" -ForegroundColor Gray
Write-Host "`$response = Invoke-RestMethod -Uri '$baseUrl/api/tools/pincode-info/110001' -Headers `$headers" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Get JWT token from browser dev tools after login" -ForegroundColor White

Write-Host ""
Write-Host "🌐 Test 3: Direct Delhivery API" -ForegroundColor Yellow
Write-Host "-------------------------------" -ForegroundColor Yellow

# Test direct Delhivery API (replace with your actual API key)
$apiKey = "YOUR_DELHIVERY_API_KEY_HERE"
$pincode = "110001"
$delhiveryUrl = "https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=$pincode"

Write-Host "📍 Testing pincode: $pincode" -ForegroundColor Green
Write-Host "URL: $delhiveryUrl" -ForegroundColor Gray
Write-Host ""

try {
    $headers = @{
        'Authorization' = "Token $apiKey"
        'Accept' = 'application/json'
        'Content-Type' = 'application/json'
    }
    
    $response = Invoke-RestMethod -Uri $delhiveryUrl -Method GET -Headers $headers
    Write-Host "✅ Delhivery Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "❌ Delhivery Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Test completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Instructions:" -ForegroundColor White
Write-Host "1. Make sure your backend server is running on port 5000" -ForegroundColor Gray
Write-Host "2. Replace YOUR_DELHIVERY_API_KEY_HERE with actual API key" -ForegroundColor Gray
Write-Host "3. Check the response format and compare with frontend expectations" -ForegroundColor Gray
