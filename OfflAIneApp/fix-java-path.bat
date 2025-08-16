@echo off
echo ========================================
echo OfflAIne - Java PATH Configuration Fix
echo ========================================
echo.
echo This script will add Android Studio JBR Java to your system PATH
echo allowing 'java' and 'javac' commands to work from command line.
echo.
echo IMPORTANT: This script must be run as Administrator!
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Checking Java installation...
if not exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
    echo ERROR: Android Studio JBR Java not found!
    echo Expected location: C:\Program Files\Android\Android Studio\jbr\bin\java.exe
    echo Please install Android Studio or verify its location.
    echo.
    pause
    exit /b 1
)

echo Found Java at: C:\Program Files\Android\Android Studio\jbr\bin\java.exe
echo.

:: Get current system PATH
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH') do set "CurrentPath=%%B"

:: Check if Java path is already in PATH
echo %CurrentPath% | findstr /C:"C:\Program Files\Android\Android Studio\jbr\bin" >nul
if %errorLevel% equ 0 (
    echo Java path is already in system PATH!
    echo Current PATH already contains: C:\Program Files\Android\Android Studio\jbr\bin
    echo.
) else (
    echo Adding Java to system PATH...
    
    :: Add Java path to beginning of PATH
    set "NewPath=C:\Program Files\Android\Android Studio\jbr\bin;%CurrentPath%"
    
    :: Update system PATH registry
    reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH /t REG_EXPAND_SZ /d "%NewPath%" /f >nul
    
    if %errorLevel% equ 0 (
        echo SUCCESS: Java path added to system PATH!
        echo Added: C:\Program Files\Android\Android Studio\jbr\bin
        echo.
    ) else (
        echo ERROR: Failed to update system PATH!
        echo You may need to manually add the Java path to your system PATH.
        echo.
        pause
        exit /b 1
    )
)

:: Broadcast environment change
echo Broadcasting environment variable changes...
powershell -Command "& {[System.Environment]::SetEnvironmentVariable('PATH', [System.Environment]::GetEnvironmentVariable('PATH', 'Machine'), 'Machine')}" >nul 2>&1

echo.
echo ========================================
echo Java PATH Configuration Complete!
echo ========================================
echo.
echo IMPORTANT: You MUST restart your command prompt or IDE 
echo for the PATH changes to take effect.
echo.
echo To verify the fix:
echo 1. Open a NEW command prompt
echo 2. Run: java --version
echo 3. Run: javac --version
echo.
echo Both commands should now work properly.
echo.
pause