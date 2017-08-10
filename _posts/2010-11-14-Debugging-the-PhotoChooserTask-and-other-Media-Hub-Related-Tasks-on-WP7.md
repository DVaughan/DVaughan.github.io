Using the device debugger is a snap in Windows Phone 7. There are many benefits, and you can see your app executing in a real world environment, with most of the launchers and choosers available for testing. Some choosers, however, rely on the Windows Phone Media Hub; such as the PhotoChooserTask. Trying to debug across a call to that bad boy, with the Zune software running, will lock up your app.

Fortunately there's an easy to use tool that solves the problem by removing the need to have the Zune software running while debugging. It's called the Windows Phone Connect Tool. 
It was released as part of the recent update to the Windows Phone Developer Tools. This tool allows you to close the Zune software, after your phone device is connected; which means that choosers such as the PhotoChooserTask are able to function correctly while you are debugging.

There are a few steps to launching the tool. Opening a command prompt, navigating to a directory, launching the tool. So I've wrapped these steps up into a batch file which takes care of detecting the platform, locating the path to the WPConnect executable, and launching the tool. The steps for using the batch file are as follows:

1. Connect your Windows Phone to your computer and ensure that it is detected by the Zune software.
2. Close the Zune software after your Windows Phone is connected.
3. Double click on the batch file.

[Download it here (1 Kb) (Updated 24 Mar 2011)](/Downloads/LaunchWPConnect.zip)

Alternatively, to use the Windows Phone Connect Tool manually, follow these steps:

1. Open a command prompt and navigate to the directory containing the Windows Phone Connect Tool (WPConnect.exe). The location of this file will be %ProgramFiles%\Microsoft SDKs\Windows Phone\v7.0\Tools\WPConnect.
2. Connect your Windows Phone to your computer and ensure that it is detected by the Zune software.
3. Close the Zune software after your Windows Phone is connected.
4. At the command prompt, enter the command WPConnect.exe.