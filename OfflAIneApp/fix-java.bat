@echo off
echo Fixing JAVA_HOME for Android Studio1...

setx JAVA_HOME "C:\Program Files\Android\Android Studio1\jbr"

echo JAVA_HOME updated to: C:\Program Files\Android\Android Studio1\jbr
echo.
echo IMPORTANT: Close ALL command prompts and terminals, then open a new one.
echo Then run: npx react-native run-android
pause