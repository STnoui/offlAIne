@echo off
echo Testing Android environment...
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

echo Testing Gradle...
cd android
gradlew.bat --version
cd..

pause