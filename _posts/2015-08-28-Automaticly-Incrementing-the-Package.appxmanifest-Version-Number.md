---
categories: UWP
---

When submitting a UWP or WinRT app to the Windows Store, you must increase the Version number of the package or the submission will fail. 

It can be a chore to manually update the version number. One solution is to use a pre-build event action that executes a Powershell script that increments the version number automatically. 
In this post you see how a Powershell script reads the Package.appmanifest file for your project, replaces the Version attribute, and overwrites the Package.appmanifest file; leaving your package ready to submit without having to modify the manifest file manually.

To get started, create a Powershell file in the root of your project. You can call it IncrementVersion.ps1. See Listing 1. The Powershell script expects the path to the working directory to be provided. When testing the script in the Windows PowerShell ISE, the working directory is set to the script root. When, however, the script is run via a Pre-build event, the working directory is supplied using a parameter.

As you may be aware, a package's version number has four parts: major, minor, build, and revision. IncrementVersion.ps1 uses the same Major version that exists in the Package.appxmanifest file; it doesn't change it. It does, however, overwrite the minor, build, and revision numbers. It calculates the new values using the current year as the minor part; the day of the year as the build part; and the minute of the day as the revision part. You can, of course, invent a different scheme for calculating the version number.

The script uses a multi-line regular expression to locate the Identity element in the Package.appxmanifest file. The content of the file is read using a Get-Content (gc) commandlet. The result of the Get-Content is an array, which is collapsed to a string using the -join command. A string is needed to allow the regular expression to search correctly across multiple lines. The regex object uses a callback to construct the new Identity element; replacing the version parts with the calculated values. Using a callback, rather than a simple call to -replace, provides more control over dynamically calculating the new version number parts.

**Listing 1.** IncrementVersion.ps1

```
param([string]$workingDirectory = $PSScriptRoot)
Write-Host 'Executing Powershell script IncrementVersion.ps1 with working directory set to: ' $workingDirectory
Set-Location $workingDirectory

$inputFileName = 'Package.appxmanifest'
$outputFileName = $PSScriptRoot + '/Package.appxmanifest';

$now = Get-Date
$versionMinor = $now.Year
$versionBuild = $now.DayOfYear
$versionRevision = ($now.Hour * 60) + $now.Minute

$content = (gc $inputFileName) -join "`r`n"

$callback = {
  param($match)
    [string]$versionMajor = $match.Groups[2].Value
    $match.Groups[1].Value + 'Version="' + $versionMajor + '.' + $versionMinor + '.' + $versionBuild + '.' + $versionRevision + '"'
}

$identityRegex = [regex]'(\<Identity[^\>]*)Version=\"([0-9])+\.([0-9]+)\.([0-9]+)\.([0-9]+)\.*\"'
$newContent = $identityRegex.Replace($content, $callback)

[io.file]::WriteAllText($outputFileName, $newContent)
```

To have Visual Studio execute this script whenever you build your app, you need to modify the project's Build Events. 
Open your project's properties by selecting the project node and hitting Alt+Enter. Add the following Pre-build event:

```
Powershell -File "$(ProjectDir)IncrementVersion.ps1" "$(ProjectDir)\"
```

Notice the trailing back slash? It's important because the `$(ProjectDir)` macro includes a trailing back slash, 
but it ends up escaping the quote, which breaks the script. Hence another slash is appended, which is escaped by the output of the macro. A fiddly little detail.

If you receive a message informing you that execution of scripts is disabled you may want to try modifying 
the execution policy by issuing the following command at a Powershell command line prompt with Admin privileges.

```
set-executionpolicy remotesigned
```

You may also choose to set the execution policy to unrestricted. 
Be warned, however, that there are security implications for allowing any script to execute on your computer.

That's it. If all is in place, then your `Package.appxmanifest` file should update automatically, 
and you won't need to manually change the version number each time you submit your app to the Windows Store.

Download the sample project: [IncrementVersionNumber.zip (125.99 kb)](/Downloads/IncrementVersionNumber.zip)