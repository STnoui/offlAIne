# OfflAIne Environment Fix - Comprehensive Solution
# Run this AFTER renaming Android Studio1 to Android Studio

Write-Host "🔧 OfflAIne Environment Fix" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

# Force admin elevation for system-wide changes
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "🔐 Requesting administrator privileges..." -ForegroundColor Yellow
    Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Step 1: Clear all existing Android/Java environment variables
Write-Host "🧹 Clearing old environment variables..." -ForegroundColor Cyan

$varsToDelete = @("ANDROID_HOME", "ANDROID_SDK_ROOT", "JAVA_HOME")
foreach ($var in $varsToDelete) {
    [Environment]::SetEnvironmentVariable($var, $null, [EnvironmentVariableTarget]::User)
    [Environment]::SetEnvironmentVariable($var, $null, [EnvironmentVariableTarget]::Machine)
    Write-Host "   Cleared: $var" -ForegroundColor Gray
}

# Step 2: Verify Android Studio location
Write-Host ""
Write-Host "🔍 Verifying Android Studio installation..." -ForegroundColor Cyan

$studioPath = "C:\Program Files\Android\Android Studio"
$studioExe = Join-Path $studioPath "bin\studio64.exe"
$jbrPath = Join-Path $studioPath "jbr"

if (Test-Path $studioExe) {
    Write-Host "   ✅ Android Studio found: $studioPath" -ForegroundColor Green
} else {
    Write-Host "   ❌ Android Studio NOT found at: $studioPath" -ForegroundColor Red
    Write-Host "   Please ensure you've renamed Android Studio1 to Android Studio" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

if (Test-Path $jbrPath) {
    Write-Host "   ✅ JBR found: $jbrPath" -ForegroundColor Green
} else {
    Write-Host "   ❌ JBR NOT found at: $jbrPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 3: Set correct environment variables
Write-Host ""
Write-Host "⚙️ Setting environment variables..." -ForegroundColor Cyan

$androidHome = "$env:USERPROFILE\AppData\Local\Android\Sdk"
$javaHome = $jbrPath

# Set system-wide variables
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidHome, [EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, [EnvironmentVariableTarget]::Machine)

Write-Host "   ✅ ANDROID_HOME = $androidHome" -ForegroundColor Green
Write-Host "   ✅ JAVA_HOME = $javaHome" -ForegroundColor Green

# Step 4: Fix PATH
Write-Host ""
Write-Host "🛤️ Updating PATH..." -ForegroundColor Cyan

$currentPath = [Environment]::GetEnvironmentVariable("PATH", [EnvironmentVariableTarget]::Machine)

# Remove any old Android paths
$pathsToRemove = @(
    "*Android*platform-tools*",
    "*Android*tools*",
    "*Android*cmdline-tools*"
)

$cleanPath = $currentPath
foreach ($pattern in $pathsToRemove) {
    $cleanPath = $cleanPath -replace [regex]::Escape($pattern.Replace("*", "")), ""
    $cleanPath = $cleanPath -replace ";;+", ";"  # Remove double semicolons
}

# Add correct Android paths
$pathsToAdd = @(
    "$androidHome\platform-tools",
    "$androidHome\tools\bin",
    "$androidHome\cmdline-tools\latest\bin"
)

$newPath = $cleanPath
foreach ($pathToAdd in $pathsToAdd) {
    if ($newPath -notlike "*$pathToAdd*") {
        $newPath += ";$pathToAdd"
        Write-Host "   + Added: $pathToAdd" -ForegroundColor Green
    } else {
        Write-Host "   ✓ Already exists: $pathToAdd" -ForegroundColor Gray
    }
}

[Environment]::SetEnvironmentVariable("PATH", $newPath, [EnvironmentVariableTarget]::Machine)

# Step 5: Create Android SDK directories
Write-Host ""
Write-Host "📁 Creating SDK directories..." -ForegroundColor Cyan

$sdkDirs = @(
    $androidHome,
    "$androidHome\platform-tools",
    "$androidHome\tools",
    "$androidHome\cmdline-tools",
    "$androidHome\licenses"
)

foreach ($dir in $sdkDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
        Write-Host "   ✅ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "   ✓ Exists: $dir" -ForegroundColor Gray
    }
}

# Step 6: Test environment
Write-Host ""
Write-Host "🧪 Testing environment..." -ForegroundColor Cyan

# Test Java
try {
    $javaVersion = & "$javaHome\bin\java.exe" -version 2>&1 | Select-Object -First 1
    Write-Host "   ✅ Java: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Java test failed" -ForegroundColor Red
}

# Test Node.js
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found - install from nodejs.org" -ForegroundColor Red
}

# Step 7: Create verification script
Write-Host ""
Write-Host "📝 Creating verification script..." -ForegroundColor Cyan

$verifyScript = @"
@echo off
echo Testing OfflAIne Environment...
echo.
echo ANDROID_HOME = %ANDROID_HOME%
echo JAVA_HOME = %JAVA_HOME%
echo.
echo Testing ADB...
adb version
echo.
echo Testing Java...
"%JAVA_HOME%\bin\java.exe" -version
echo.
echo Ready to run: npx react-native run-android
pause
"@

Set-Content -Path "verify-env.bat" -Value $verifyScript
Write-Host "   ✅ Created verify-env.bat" -ForegroundColor Green

# Final instructions
Write-Host ""
Write-Host "🎉 Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. 🔄 Close ALL terminals and PowerShell windows" -ForegroundColor White
Write-Host "2. ✅ Open Android Studio and install SDK components:" -ForegroundColor White
Write-Host "   - Tools > SDK Manager > Install Platform-Tools" -ForegroundColor Gray
Write-Host "   - Install Android 16 (API Level 35)" -ForegroundColor Gray
Write-Host "3. 📱 Create AVD: Tools > AVD Manager > Create Device" -ForegroundColor White
Write-Host "4. 🔍 Test: Run verify-env.bat in new terminal" -ForegroundColor White
Write-Host "5. 🚀 Run: npx react-native run-android" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")