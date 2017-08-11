---
categories: Windows-Phone
---

In a post from late last year, I looked at using a .bat file to detect the platform and launch the WPConnect tool using the path appropriate to the OS (32bit or 64 bit).

I've since updated the batch file, which now closes the Zune software, waits a few seconds, and then attempts to use the WPConnect tool. It's not rocket science, but it eases the burden a little when debugging on a Window Phone device.

I had hoped to be able to respond to stdout/err of the WPConnect executable. Seems I couldn't redirect the output to monitor it, and retry the connection if it failed. If you know a work-around, please let me know.

Anyway, without further ado, here's the [new batch file](/Downloads/LaunchWPConnect.zip).

If you'd prefer to copy and paste; the content of the file is as follows:

 
```
@ECHO OFF

ECHO (c) Daniel Vaughan 2011 http://danielvaughan.org

:LoopStart

SET %errorlevel% = 0

taskkill /IM zune.exe
ECHO Waiting for Zune to close...
@choice /T 15 /C y /CS /D y | REM

IF PROCESSOR_ARCHITECTURE == x86 (
    "%ProgramFiles%\Microsoft SDKs\Windows Phone\v7.0\Tools\WPConnect\WPConnect.exe"
) ELSE "%ProgramFiles(x86)%\Microsoft SDKs\Windows Phone\v7.0\Tools\WPConnect\WPConnect.exe"

@choice /T 5 /C y /CS /D y | REM

:LoopEnd
```