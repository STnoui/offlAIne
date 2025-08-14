@echo off
echo 🔧 OfflAIne Environment Fix - Safe Version
echo ========================================
echo.
echo This window will stay open so you can see any errors.
echo.

REM Check if Android Studio exists at the correct location
echo Checking if Android Studio exists...
if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    echo ✅ Android Studio found at correct location
) else (
    echo ❌ Android Studio NOT found at: C:\Program Files\Android\Android Studio\
    echo.
    echo Please make sure you have:
    echo 1. Renamed "Android Studio1" to "Android Studio"
    echo 2. Deleted the old broken "Android Studio" folder
    echo.
    pause
    exit /b 1
)

echo.
echo Setting environment variables...

REM Clear old variables
setx ANDROID_HOME "" >nul 2>&1
setx JAVA_HOME "" >nul 2>&1

REM Set new correct variables
setx ANDROID_HOME "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
if %errorlevel% == 0 (
    echo ✅ ANDROID_HOME set successfully
) else (
    echo ❌ Failed to set ANDROID_HOME
    pause
    exit /b 1
)

setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
if %errorlevel% == 0 (
    echo ✅ JAVA_HOME set successfully
) else (
    echo ❌ Failed to set JAVA_HOME
    pause
    exit /b 1
)

REM Create Android SDK directories
echo.
echo Creating Android SDK directories...
if not exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk" mkdir "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
if not exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools" mkdir "C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools"
echo ✅ Directories created

echo.
echo Testing Java installation...
"C:\Program Files\Android\Android Studio\jbr\bin\java.exe" -version
if %errorlevel% == 0 (
    echo ✅ Java is working
) else (
    echo ❌ Java test failed
)

echo.
echo ========================================
echo SETUP COMPLETE!
echo ========================================
echo.
echo IMPORTANT: Close ALL terminals and open a NEW one.
echo Then run: npx react-native run-android
echo.
echo Environment variables set:
echo ANDROID_HOME = C:\Users\%USERNAME%\AppData\Local\Android\Sdk
echo JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
echo.
pause