When developing an application, clearly it's prudent to have uniformity in the manner certain tasks are carried out, 
thereby avoiding violation of the DRY principle. An example of this is displaying common dialog boxes. 
But wait, if you think this post is just going to be about an abstracted dialog box system, then think again. 
While Calcium does provide a common dialog system, it also allows us to display a dialog to the user 
from the server during any WCF call! Moreover, it allows us to consume the same api on the client and the server. 
This means we are able to interact with the user directly, without having to e.g., interpret the result 
of a WCF call in the client. It effectively narrows the tier gap.

In this post, firstly we will discuss the client-side message service, then we will examine how it is leveraged 
from the server-side to provide the location agnosticism.

So, obviously it's unwise for each member of a development team to be creating his or her own dialogs 
for simple tasks such as asking the user a closed ended question (e.g. a Yes/No question box). 
If we decide to change the caption in the dialogs across the board, it is rather more difficult if dialogs 
are scattered across the project. Likewise if we wish to port the application from WPF to Silverlight, 
or even to a command line interface, think Powershell or mobile applications, it's great to be able 
to swap out the implementation for any given scenario. Clearly an abstracted system is in order.

Out of the box, Calcium comes with a number of Message Service implementations. There is a client implementation for WPF, 
another client-side implementation for command line driven applications, and a server-side implementation 
that sends messages back to the client via a callback, and leverages the client-side IMessageService implementation.

The Message Service has various overloads which allow the caption and message to be specified.

Let's take a look at the IMessageService interface and client-side implementations.

![IMessageService allows us to interact with the user in a UI agnostic manner](/assets/images/2009-06-15-ClassDiagram01.png)

**Figure 1.** IMessageService allows us to interact with the user in a UI agnostic manner.

The Message Service allows for a Message Importance level to be specified. 
This allows for a threshold noise level to be specified by the user. 
If the MessageImportance is lower than the user's preference, then the user won't be bothered with the message. 
In a later version of Calcium we shall see a Preferences Service for specifying the preferred level.

![MessageService and CommandLineMessageService both override](/assets/images/2009-06-15-ClassDiagram02.png)

**Figure 2.** MessageService and CommandLineMessageService both override `ShowCustomDialog`
method of MessageServiceBase to cater for their particular environments.

By applying variation through merely overriding the `ShowCustomDialog` method it also makes it very easy to mock the `MessageServiceBase` class for testing.

Our client-side WPF implementation channels all messaging requests through the
`ShowCustomDialog` method as shown in the following excerpt.

```csharp
/// <summary>
/// WPF implementation of the <see cref="IMessageService"/>.
/// </summary>
public class MessageService : MessageServiceBase
{
    public override MessageResult ShowCustomDialog(string message, string caption,
        MessageButton messageButton, MessageImage messageImage, 
        MessageImportance? importanceThreshold, string details)
    {
        /* If the importance threshold has been specified 
         * and it's less than the minimum level required (the filter level) 
         * then we don't show the message. */
        if (importanceThreshold.HasValue && importanceThreshold.Value < MinumumImportance)
        {
            return MessageResult.OK;
        }

        if (MainWindow.Dispatcher.CheckAccess())
        {    /* We are on the UI thread, and hence no need to invoke the call.*/
            var messageBoxResult = MessageBox.Show(MainWindow, message, caption, 
                messageButton.TranslateToMessageBoxButton(), 
                messageImage.TranslateToMessageBoxButton());
            return messageBoxResult.TranslateToMessageBoxResult();
        }

        MessageResult result = MessageResult.OK; /* Satisfy compiler with default value. */
        MainWindow.Dispatcher.Invoke((ThreadStart)delegate
        {
            var messageBoxResult = MessageBox.Show(MainWindow, message, caption, 
                messageButton.TranslateToMessageBoxButton(), 
                messageImage.TranslateToMessageBoxButton());
            result = messageBoxResult.TranslateToMessageBoxResult();
        });

        return result;
    }

    static Window MainWindow
    {
        get
        {
            return UnitySingleton.Container.Resolve<IMainWindow>() as Window;
        }
    }
}
```

I have created various extension methods for translating between the native WPF enums `MessageBoxButton`, `MessageBoxImage`, and `MessageBoxResult`. 
Why go to all of this trouble? On first appearances it appears like an antipattern. 
The reason is in fact a good one: there are differences in these enums in WPF and Silverlight, and this allows us to cater for bother without duplication.

I am considering expanding the service to support message details, and perhaps reducing the number of overloads 
with a reference type Message parameter. Another improvement would be to implement a Don't show again checkbox system. 
I leave that for a future incarnation. I may even use Karl Shifflet's excellent [Common TaskDialog project](http://www.codeproject.com/KB/WPF/WPFTaskDialogVistaAndXP.aspx) (with Karl's permission).

## Server-side Message Service

We've looked at the basic client-side implementation of `IMessageService`, but now things are going to get a little more interesting. 
With Calcium we have the capability to consume the IMessageService in the same way on both the client and server. 
To accomplish this we use a WCF custom header and a duplex service callback.

The demonstration application contains a module called the `MessageServiceDemoModule`. 
The view for this module contains a single button that becomes enabled when the `CommunicationService` has connectivity with the server.

This is code in a WCF service, which we can execute asynchronously as shown, and present the user with dialogs on the client side. 
Remember, this code executes server-side!

```csharp
public void DemonstrateMessageService()
{
    var messageService = UnitySingleton.Container.Resolve<IMessageService>();
    ThreadPool.QueueUserWorkItem(delegate
    {
        messageService.ShowMessage(
            "This is a synchronous message invoked from the server." + 
            "The service method is still executing and waiting for your response.",
            "DemoService", MessageImportance.High);
        bool response1 = messageService.AskYesNoQuestion(
            "This is a question invoked from the server. Select either Yes or No.",
            "DemoService");
        string responseString = response1 ? "Yes" : "No";
        messageService.ShowMessage(string.Format(
            "You selected {0} as a response to the last question.", responseString), 
            MessageImportance.High);
    });
}
```

In the above excerpt, we retrieve the `IMessageService` instance from the Unity container. 
This is done in same manner as we would do on the client! 
Being location agnostic allows us to move business logic far more easily. 
I have placed the Message Service calls here inside a `QueueUserWorkItem` delegate just to demonstrate the independence of the Message Service, 
in that the WCF call returns almost immediately, yet a child thread will continue to work in the background 
and will still retain the capability to communicate with the user. Without using a child thread to communicate with the user, 
we may experience a timeout if the user fails to respond fast enough. Please note that we are required to retrieve 
the Message Service from the Unity container before the service call completes. Without doing so will raise an exception, 
as the `OperationContext` for the service call will no longer be present.

![Server causes dialog to be presented client-side.](/assets/images/2009-06-15-ServerCausesDialog.jpg)

**Figure 3.** Server causes dialog to be presented client-side.

![](/assets/images/2009-06-15-QuestionAsked.jpg)

**Figure 4.** Question asked from server.

![ Question asked from server.](/assets/images/2009-06-15-ResponseReceived.jpg)

**Figure 5.** Response received and echoed back to user.

How does it all work? When we need a service channel we use our `IChannelManager` instance to retrieve an instance.

I've discussed the `IChannelManager` in a couple of articles, 
in particular [here](http://www.codeproject.com/KB/silverlight/SynchronousSilverlight.aspx#ManagingChannelsInAnEfficientManner) 
and [here](http://www.codeproject.com/KB/smart/Perceptor.aspx#ServiceChannelManagement).

In order to support identification of the application instance from any WCF service call we place a custom header 
into every service channel we create, as shown in the following excerpt from the `ServiceManagerSingleton` and `InstanceIdHeader` classes:

```csharp
public static class InstanceIdHeader
{
    public static readonly String HeaderName = "InstanceId";
    public static readonly String HeaderNamespace 
            =  OrganizationalConstants.ServiceContractNamespace;
}
```

We use this static class to place the header, and also to retrieve the header on the server.

```csharp
void AddCustomHeaders(IClientChannel channel)
{
    MessageHeader shareableInstanceContextHeader = MessageHeader.CreateHeader(
        InstanceIdHeader.HeaderName,
        InstanceIdHeader.HeaderNamespace,
        instanceId.ToString());

    var scope = new OperationContextScope(channel);
    OperationContext.Current.OutgoingMessageHeaders.Add(shareableInstanceContextHeader);
}
```

So, when we create the service channel we add the custom header as shown in the following excerpt.

```csharp
public TChannel GetChannel<TChannel>()
{
    Type serviceType = typeof(TChannel);
    object service;

    channelsLock.EnterUpgradeableReadLock();
    try
    {
        if (!channels.TryGetValue(serviceType, out service))
        {    /* Value not in cache, therefore we create it. */
            channelsLock.EnterWriteLock();
            try
            {
                /* We don't cache the factory as it contains a list of channels 
                 * that aren't removed if a fault occurs. */
                var channelFactory = new ChannelFactory<TChannel>("*");

                service = channelFactory.CreateChannel();
                AddCustomHeaders((IClientChannel)service);

                var communicationObject = (ICommunicationObject)service;
                communicationObject.Faulted += OnChannelFaulted;
                channels.Add(serviceType, service);
                communicationObject.Open(); 
                ConnectIfClientService(service, serviceType);

                UnitySingleton.Container.RegisterInstance<TChannel>((TChannel)service);
            }
            finally
            {
                channelsLock.ExitWriteLock();
            }
        }
    }
    finally
    {
        channelsLock.ExitUpgradeableReadLock();
    }

    return (TChannel)service;
}
```

We cache the channel until it is closed or faults. But as soon as we create a new channel, 
we add the header to be consumed on the server. We also have duplex channel support, which works in much the same way.

We must talk to the `ICommunicationService` in order to create a callback, before we attempt 
to consume the Message Service on the server-side. This is done automatically by the `CommunicationModule`. 
In fact, the Communication Module polls the server periodically to let it know that it is still alive. 
It also will detect network connectivity, or the lack thereof, and disable or enable the polling accordingly.

```csharp
/// <summary>
/// Notifies the server communication service that the client is still alive.
/// Occurs on a ThreadPool thread. <see cref="NotifyAlive"/>
/// </summary>
/// <param name="state">The unused state.</param>
void NotifyAliveAux(object state)
{
    try
    {
        if (!NetworkInterface.GetIsNetworkAvailable())
        {
            return;
        }
        var channelManager = UnitySingleton.Container.Resolve<IChannelManager>();
        var communicationService 
            = channelManager.GetDuplexChannel<ICommunicationService>(callback);
        communicationService.NotifyAlive();
        if (!connected)
        {
            connected = true;
            connectionEvent.Publish(ConnectionState.Connected);
        }
        lastExceptionType = null;
    }
    catch (Exception ex)
    {
        Type exceptionType = ex.GetType();
        if (exceptionType != lastExceptionType)
        {
            Log.Warn("Unable to connect to communication service.", ex);
        }
        lastExceptionType = exceptionType;
        if (connected)
        {
            connected = false;
            connectionEvent.Publish(ConnectionState.Disconnected);
        }
    }
    finally
    {
        connecting = false;
    }
}
```

As an aside, the Communication Module itself has no UI. 
Its purpose is to interact with the `CommunicationService`, and to provide notifications to the client when various server-side events take place. 
One such is `CompositeEvent` is the `ConnectionEvent`, which can be seen in the previous excerpt.

I plan on expanding the Message Service system to allow text input, drop down list selection, and maybe even custom dialogs.

To find out more about Calcium please see the [CodePlex site](http://calcium.codeplex.com/).
