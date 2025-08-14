@echo off
echo 🧪 Testing Android Setup
echo =======================
echo.

echo Current environment variables:
echo ANDROID_HOME = %ANDROID_HOME%
echo JAVA_HOME = %JAVA_HOME%
echo.

echo Testing Android Studio location...
if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    echo ✅ Android Studio found
) else (
    echo ❌ Android Studio not found
)

echo.
echo Testing Java...
if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
    "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" -version
    if %errorlevel% == 0 (
        echo ✅ Java is working
    ) else (
        echo ❌ Java failed
    )
) else (
    echo ❌ Java executable not found
)

echo.
echo Testing Node.js...
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Node.js is available
    node --version
) else (
    echo ❌ Node.js not found
)

echo.
pause