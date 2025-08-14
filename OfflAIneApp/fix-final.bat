@echo off
echo Final fix for Android environment...

REM Delete old wrong environment variables
setx JAVA_HOME "" >nul 2>&1

REM Set correct paths
setx ANDROID_HOME "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Android\Android Studio1\jbr"
setx PATH "%PATH%;C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools"

echo Fixed! Close ALL terminals and open a NEW one.
echo Then run: npx react-native run-android
pause