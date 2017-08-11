---
categories: Windows-Phone
---

With the latest release of [Surfy for Windows Phone 8](http://www.windowsphone.com/en-us/store/app/surfy-free/a5820177-5118-4f34-b8c1-6715289fc321) I've been getting more deeply acquainted 
with the intricacies of Windows Phone Voice Command localizability. 
In the process I have uncovered some issues that may snag an unsuspecting dev or two.

If you are not familiar with Voice Commands then this post is probably not for you. 
If you're still interested, there's a [primer on Voice Commands on MSDN](http://msdn.microsoft.com/en-us/library/windowsphone/develop/jj206959(v=vs.105).aspx).

The Windows Phone OS Voice Command system is rather particular when it comes to selecting a command set. 
If Windows Phone is unable to find a language code for your command set matching the speech language of the device, 
your app's voice commands are ignored. And the OS exhibits some unexpected behaviour when matching a command set 
with the phone's speech language. If you've tried implementing Voice Commands on Windows Phone for English speakers, 
you may be unaware that your voice commands are enabled for either US or UK English speakers, but not both!

In this post I'll quickly detail the problem and provide a work around at the end.

The `xml:lang` attribute of `CommandSet` elements in the voice command definition file doesn't behave as you might expect. 
The speech recognition system selects command sets corresponding to the speech language setting on the phone, 
but the `VoiceCommandService.InstalledCommandSets` API returns the command set corresponding to something else. (which, BTW is not the current thread culture. Perhaps it's the app's neutral language, but I haven't tested that. Yes, I got lazy.)

In my testing, if I used xml:lang="en" in the definition file, at runtime this is changed to the more specific en-US 
in the `CommandSet` object. This is essentially broken for phones with a speech language set to 'en-GB'

Initially I attempted to work around this by explicitly using two CommandSets (both in the same file): one with `xml:lang="en-GB"` and the other with `xml:lang="en-US"`

The speech language on my phone is set to en-GB. When I call `VoiceCommandService.InstalledCommandSets`, a single `CommandSet` is returned with the language en-US.

It's the wrong one.

The voice command system only recognizes phrases in the en-GB `CommandSet`, but it's impossible to update the phrase list of the `CommandSet`.

The work around is to load a different definition file that matches the language of the speech voice. You may end up duplicating much of the content, but at least you'll be satisfying users on both sides of the pond.