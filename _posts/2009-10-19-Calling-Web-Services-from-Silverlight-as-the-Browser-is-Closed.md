---
categories: Silverlight
redirect_from:
 - /post/Calling-Web-Services-from-Silverlight-as-the-Browser-is-Closed.aspx.html
---

## Introduction

Today I was reading an [excellent post](http://blog.galasoft.ch/archive/2009/10/18/clean-shutdown-in-silverlight-and-wpf-applications.aspx) 
by my fellow Disciple [Laurent Bugnion](http://blog.galasoft.ch/Default.aspx), 
which led on to a [short discussion](http://groups.google.com/group/wpf-disciples/browse_thread/thread/e3200f524f4e0592) 
about performing actions after a user attempts to close a browser window. It got me thinking about the capability to dispatch a web service call in Silverlight just after a user attempts to close the browser window or navigate elsewhere. I have been asked the question before, yet before now, have not attempted to answer it. So today I decided to do some experimenting.

There are two things I wanted to look at. Firstly, I wanted to allow a web service to be called after the Silverlight application's Exit event is raised. Secondly, I wanted to provide the Silverlight application with the opportunity to cancel, or at least interrupt the close window process.

In the first scenario I found the way I could achieve the call after the Silverlight applications Exit event was raised, was to call a JavaScript method from Silverlight, and then finally a PageMethod; to perform the housekeeping.

![Diagram of a web service is called after the user closes the browser.](/assets/images/2009-10-19-WebService.gif)

**Figure 1.** A web service is called after the user closes the browser.

We see that in our App.xaml.cs the `Exit` event handler is called, which then calls a JavaScript function, as demonstrated in the following excerpt:

```csharp
void Application_Exit(object sender, EventArgs e)
{
    HtmlPage.Window.Invoke("NotifyWebserviceOnClose", 
          new[] { guid.ToString() });
}
```

We then call a `PageMethod` on the page hosting the application like so:

```javascript
function NotifyWebserviceOnClose(identifier) {
    PageMethods.SignOff(identifier, OnSignOffComplete);            
}
```

The `PageMethod` is where we are able to update a list of connected clients, or do whatever takes our fancy.

```csharp
[WebMethod]
[System.Web.Script.Services.ScriptMethod] 
public static void SignOff(string identifier)
{
    /* Update your list of signed in users here etc. */
    System.Diagnostics.Debug.WriteLine("*** Signing Off: " + identifier);
}
```

Caveat lector- According to Laurent this is not reliable. So, you will need to test it for yourself. I've tested it locally in Firefox 3.5 and IE8. But, your results may differ.

Now, the second thing I wanted to look at was the ability to provide some interaction with the user, 
either cancelling or calling a web service, when the user attempts to close the browser; but before the browser is actually closed.

The way I did this was to place an `onbeforeunload` handler in the body tag of the page, as shown:

```html
<body onbeforeunload="OnClose()">
```

I then created the `OnClose` handler in a JavaScript script block as shown in the following excerpt:

```javascript
function OnClose() {           
    var plugin = document.getElementById("silverlightControl");
    var shutdownManager = plugin.content.ShutdownManager;
    var shutdownResult = shutdownManager.Shutdown();
    if (shutdownResult) {
        event.returnValue = shutdownResult;
    }
}
```

Here we see that we retrieve the Silverlight application and resolve an instance of the `ShutdownManager` class present in the Silverlight App class. 
The `ShutdownManager` is a class that is able to perform some arbitrary duty when the application is closing. 
It is made accessible to the host webpage by registering it with a call to `RegisterScriptableObject`.

```csharp
void Application_Startup(object sender, StartupEventArgs e)
{
    HtmlPage.RegisterScriptableObject("ShutdownManager", shutdownManager);
    this.RootVisual = new MainPage();
}
```

## Understanding the ShutdownManager

The `ShutdownManager` is decorated with two attributes that allow it to be consumed by an external source. 
They are `SciptableType` and `ScriptableMember`. As we see below, they are used to allow the `ShutdownManager` class to be called via Ajax.

```csharp
[ScriptableType]
public class ShutdownManager
{
    [ScriptableMember]
    public string Shutdown()
    {
        string result = null;
        var page = (MainPage)Application.Current.RootVisual;

        if (page.Dirty)
        {
            var messageBoxResult = MessageBox.Show(
                "Save changes you have made?", "Save changes?", MessageBoxButton.OKCancel);
            if (messageBoxResult == MessageBoxResult.OK)
            {
                var waitingWindow = new WaitingWindow();
                waitingWindow.Show();

                waitingWindow.NoticeText = "Saving work on server. Please wait...";
                page.SetNotice("Saving work on server. Please wait...");

                var client = new ShutdownServiceClient();
                client.SaveWorkCompleted += ((sender, e) =>
                    {
                        waitingWindow.NoticeText = "It is now safe to close this window.";
                        page.SetNotice("It is now safe to close this window.");
                        page.Dirty = false;
                        waitingWindow.Close();
                    });
                client.SaveWorkAsync("Test id");
                result = "Saving changes.";
            }
            else
            {
                result = "If you close this window you will lose any unsaved work.";
            }
        }

        return result;
    }
}
```

Here we see that once the `Shutdown` method is called we test if the main (Silverlight) page is dirty. 
If so, we prompt the user to save changes. If changes are to be saved we dispatch our async web service call 
using a service client. The key thing to note here is that we are returning a string value if the page is deemed dirty. 
This string value then indicates to the consuming JavaScript code that the window should not be closed immediately. 
Once the call makes it back to our JavaScript `onbeforeload` handler, we assign the `event.returnValue` the value of this string. 
If this value is not an empty string it will cause the web browser to display a dialog; asking the user whether they really wish to leave the page.

![Browser prompts with 'Are you sure ...' message.](/assets/images/2009-10-19-AreYouSure.png)

**Figure 2.** Browser prompts with 'Are you sure ...' message.

In the demo application accompanying this post, you will notice that we simulate a user modification. This is done by ticking the Page dirty checkbox.

![The demonstration application simulates a modification to the data model.](/assets/images/2009-10-19-SimulatesModification.png)

**Figure 3.** The demonstration application simulates a modification to the data model.

Unticked, closing the browser will result in the window closing immediately. However, ticked will cause the presentation of a Save Changes dialog, as shown below.

![Save Changes Prompt](/assets/images/2009-10-19-SaveChangesDialog.png)

**Figure 4.** Save changes dialog prompts user.

What happens if the user cancels the operation? Remember our event.returnValue string in the JavaScript `OnClose` function. 
If the user cancels, then this value is assigned a string value of 'If you close this window you will lose any unsaved work.' We can see how the browser chooses to display the string shown below:

![User is prompted with browser initiated dialog.](/assets/images/2009-10-19-AreYouSureYouWantToNavigateAway.png)

**Figure 5.** User is prompted with browser initiated dialog.

Obviously we must deal with when the user selects the nominal Ok button in the save dialog. 
To provide a somewhat more agreeable user experience, I have dropped in a Silverlight `ChildWindow` control, with a `ProgressBar` control for good measure.

![](/assets/images/2009-10-19-ProgressBar.png)

**Figure 6.** A progress bar is presented to the user while saving.

Once the user hits Ok on the Save Changes dialog, that web service call is dispatched almost immediately. 
In order for the web service call to occur though, we must perform interrupt the thread so that our Silverlight App has a chance to dispatch the call. 
We can do that with a JavaScript alert call, or as we see here, we assign the event.returnValue, which causes a dialog to be displayed in much the same manner.

## Conclusion
In this post we have seen how it is possible to call a web service after a Silverlight App's Exit event has been raised. 
While this may not be reliable, I'd be interested to know your experience with this approach, 
and certainly of any alternate approaches. 
Finally we looked at interacting with the user, to allow cancellation of a close window event or to perform last minute web service calls. 
This was achieved using the `onbeforeunload` event and a JavaScript handler.

Thanks for reading.

[Download the sample (557.06 kb)](/Downloads/WebserviceCallOnShutdown.zip)
