#!/bin/bash

# Simple curl test script for pincode API
echo "🧪 Testing Pincode API Response Format"
echo "======================================"

# Test pincodes
PINCODES=("110001" "110008" "400001")
BASE_URL="http://localhost:5000"

echo ""
echo "🔓 Test 1: Without Authentication"
echo "---------------------------------"

for pincode in "${PINCODES[@]}"; do
    echo ""
    echo "📍 Testing pincode: $pincode"
    echo "URL: $BASE_URL/api/tools/pincode-info/$pincode"
    echo ""
    
    curl -X GET \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        "$BASE_URL/api/tools/pincode-info/$pincode" \
        -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
        -s
    
    echo "----------------------------------------"
done

echo ""
echo "🔐 Test 2: With Authentication (if you have a token)"
echo "---------------------------------------------------"
echo "To test with auth, run:"
echo "curl -X GET \\"
echo "  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  '$BASE_URL/api/tools/pincode-info/110001'"
echo ""
echo "📝 Get JWT token from browser dev tools after login"

echo ""
echo "🌐 Test 3: Direct Delhivery API"
echo "-------------------------------"

# Test direct Delhivery API (replace with your actual API key)
API_KEY="YOUR_DELHIVERY_API_KEY_HERE"
PINCODE="110001"
DELHIVERY_URL="https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=$PINCODE"

echo "📍 Testing pincode: $PINCODE"
echo "URL: $DELHIVERY_URL"
echo ""

curl -X GET \
    -H "Authorization: Token $API_KEY" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    "$DELHIVERY_URL" \
    -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
    -s

echo ""
echo "======================================"
echo "✅ Test completed!"
echo ""
echo "📋 Instructions:"
echo "1. Make sure your backend server is running on port 5000"
echo "2. Replace YOUR_DELHIVERY_API_KEY_HERE with actual API key"
echo "3. Check the response format and compare with frontend expectations"
