@echo off
echo Fixing environment variables for Android Studio1...

setx ANDROID_HOME "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Android\Android Studio1\jbr"

echo Environment variables updated. 
echo IMPORTANT: Close this window and open a NEW command prompt to run the app.
pause