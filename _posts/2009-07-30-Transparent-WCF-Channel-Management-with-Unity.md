---
categories: WCF
---

## Introduction

It is generally considered good form to define a separate `ServiceContract` interface for all WCF services. 
By doing so, it decouples the contract from the implementation. Still, if we consume a service contract via conventional means 
such as generating a proxy using a ChannelFactory or using a ServiceReference generated proxy, 
we couple the service with the WCF infrastructure. So what could be wrong with that? 
Well, say if we have a local version of a service, and a remote implementation of the service, 
one must be retrieved using a WCF specific measure like those just mentioned, while the other can be registered with our DI container 
and retrieved that way. But the code that is shared between the local and remote implementations must be aware of this, 
and this inhibits reusability. Wouldn't it be better if retrieval of all services was done homogeneously? 
We can indeed achieve this, and without any coupling to the WCF infrastructure. I will explain how in just a moment, but first some background.

## Background

I choose to manage my service channels in a centralized way. I do this by using an `IChannelManager` implementation. 
You can find out more about the use of the `IChannelManager` implementation 
in a number of my articles. In particular [here](http://www.codeproject.com/KB/silverlight/SynchronousSilverlight.aspx#ManagingChannelsInAnEfficientManner) 
and [here](http://www.codeproject.com/KB/smart/Perceptor.aspx#ServiceChannelManagement).

There are a several advantages to this approach, not least of which is that the Channel Manager takes care of caching channel proxies, 
and recreating them if and when a fault occurs.

## Using Unity's `IStaticFactoryConfiguration` to Transparently Retrieve Proxies

Those familiar with Unity will know that to registers a type or an instance with the container, 
one can either define the association in config or at runtime by calling the Containers RegisterInstance or RegisterType methods. 
There is, however, a third approach: we can register a factory method to perform the retrieval by configuring the IStaticFactoryConfiguration. 
This enables us to have Unity drive the generation or retrieval of a channel proxy using the ChannelManagerSingleton.

![Retrieval of a service channel via Unity](/assets/images/2009-07-30-Retrieval.gif)

Figure: Retrieval of a service channel via Unity.

Firstly we must register the extension with Unity. The extension can be found in the Microsoft.Practices.Unity.StaticFactory.dll assembly, 
and should be reference by your project. We then add the extension to our Unity container like so:

```csharp
Container.AddNewExtension<StaticFactoryExtension>();
```

We are then able to have Unity retrieve the IChannelManager instance in order to retrieve the service proxy when it is requested.

```csharp
var channelManager = UnitySingleton.Container.Resolve<IChannelManager>();
UnitySingleton.Container.Configure<IStaticFactoryConfiguration>().RegisterFactory<IMyService>(
				container => channelManager.GetChannel<IMyService>());
```

Thus, we no longer need to retrieve the IChannelManager in our code in order to retrieve the channel proxy. 
All we need do is grab it straight from Unity like so:

```csharp
var myService = UnitySingleton.Container.Resolve<IMyService>();
```

Opening the channel, testing connectivity, caching it etc., is all done behind the scenes!

There is a drawback to this approach. If, for whatever reason, the channel proxy is unable to be retrieved 
by the Channel Manager then Unity will raise a `ResolutionFailedException`, and the reason for the failure will be hidden as an inner exception. 
So, we must gear our code to be resilient to resolution failures and depend not only on Unit Tests discovering missing type registrations. 
This post covers simplex services, and I have still to explore an elegant way to achieve the same result for duplex services with their callback instances.

## Conclusion

We have seen how, by using Unity, we are able to further abstract the retrieval of channel proxies. 
This allows us to consume services in the same way whether they be local or via WCF. 
By doing this we are able to achieve location agnostic service consumption, and increase the reusability 
of shared code across local and remote deployment scenarios. 
The source for the Channel Manager and other goodies can be found at http://calcium.codeplex.com/
