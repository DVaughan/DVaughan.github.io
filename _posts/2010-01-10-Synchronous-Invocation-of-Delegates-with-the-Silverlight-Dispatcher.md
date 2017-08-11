---
categories: Silverlight
---

## Introduction
In this post I would like to briefly discuss the `System.Windows.Threading.Dispatcher` class, and the significant differences between its Silverlight and Desktop CLR implementations. 
We are going to look at solving two things:

1. Consuming the UI's Dispatcher in Silverlight before a page has been instanciated.
2. Allowing for synchronous invocation of delegates on the UI thread.

## Background

Recently my good friend [Sacha Barber](https://sachabarbs.wordpress.com/) published an [article](http://www.codeproject.com/KB/silverlight/SL4FileUploadAnd_SL4_MVVM.aspx), 
and in the comments of which we briefly touched on a cross threading issue that we have both experienced with the Silverlight `Dispatcher` class. 
I thought it was about time that I wrote some of this stuff up. This is the result.

## Silverlight Thread Affinity

When working with Silverlight, one has to contend with the usual single threaded apartment model (STA) that is also present when working with WPF or Windows Forms. 
This means that one must interact with UI components, in particular DependencyObject derived types, from the thread in which they were created on. 
Fortunately Silverlight/WPF/Windows Forms includes infrastructure that makes acquiring and invoking calls on the UI thread simpler; 
specifically the `System.Windows.Threading.Dispatcher`, which is a prioritized message loop that handles thread affinity.

There is an [excellent article](http://msdn.microsoft.com/en-us/magazine/cc163328.aspx) describing the `Dispatcher` in detail.

## Consuming the UI's Dispatcher

In Silverlight a Dispatcher becomes associated with the main page during initialization, thereby making it available via the Applications RootVisual property like so:

```csharp
Application.Current.RootVisual.Dispatcher
```

We can consume the `Dispatcher` this way, as long as we do so after the `RootVisual` has been defined. 
But in the case where we would like to consume the `Dispatcher` from the get-go, it leaves us out in the cold. 
Fortunately, though, the Silverlight `Dispatcher` instance is also available via the `System.Windows.Deployment.Current.Dispatcher` property. 
This instance is defined when the application starts, thereby making it possible to commence asynchronous operations before the first page is instanciated.

## Synchronous Invocation of Delegates on the UI Thread

The Silverlight `Dispatcher` is geared for asynchronous operations. As we can see from the following image, unlike the Desktop CLR Dispatcher, 
the Silverlight `Dispatcher` class's Invoke method overloads have internal visibility.

![Invoke methods](/assets/images/2010-01-10-Invoke.png)

It has to be said that the Desktop CLR Dispatcher, when compared with the Silverlight version, as with many other classes, has a much richer API. 
In order to provide a means to synchronously invoke a delegate on the UI thread we need another approach. 
The approach I have taken is to utilize the `System.Windows.Threading.DispatcherSynchronizationContext`.

![Invoke methods](/assets/images/2010-01-10-PostSend.png)

By using the `Post` and `Send` methods of the `DispatcherSynchronizationContext` we are able to regain the synchronous `Invoke` capabilities within the Silverlight environment.

I have rolled this up into a set of reusable classes, located in my core Silverlight library, which you can find in the Calcium.Silverlight project in the Calcium http://www.calciumsdk.net download.

```csharp
/// <summary>
/// Singleton class providing the default implementation 
/// for the <see cref="ISynchronizationContext"/>, specifically for the UI thread.
/// </summary>
public class UISynchronizationContext : ISynchronizationContext
{
	DispatcherSynchronizationContext context;
	Dispatcher dispatcher;
	
	#region Singleton implementation

	static readonly UISynchronizationContext instance = new UISynchronizationContext();
	
	/// <summary>
	/// Gets the singleton instance.
	/// </summary>
	/// <value>The singleton instance.</value>
	public static ISynchronizationContext Instance
	{
		get
		{
			return instance;
		}
	}

	#endregion

	public void Initialize()
	{
		EnsureInitialized();
	}

	readonly object initializationLock = new object();

	void EnsureInitialized()
	{
		if (dispatcher != null && context != null)
		{
			return;
		}

		lock (initializationLock)
		{
			if (dispatcher != null && context != null)
			{
				return;
			}

			try
			{
				dispatcher = Deployment.Current.Dispatcher;
				context = new DispatcherSynchronizationContext(dispatcher);
			}
			catch (InvalidOperationException)
			{
				/* TODO: Make localizable resource. */
				throw new ConcurrencyException("Initialised called from non-UI thread."); 
			}
		}
	}

	public void Initialize(Dispatcher dispatcher)
	{
		ArgumentValidator.AssertNotNull(dispatcher, "dispatcher");
		lock (initializationLock)
		{
			this.dispatcher = dispatcher;
			context = new DispatcherSynchronizationContext(dispatcher);
		}
	}

	public void InvokeAsynchronously(SendOrPostCallback callback, object state)
	{
		ArgumentValidator.AssertNotNull(callback, "callback");
		EnsureInitialized();

		context.Post(callback, state);
	}

	public void InvokeAsynchronously(Action action)
	{
		ArgumentValidator.AssertNotNull(action, "action");
		EnsureInitialized();

		if (dispatcher.CheckAccess())
		{
			action();
		}
		else
		{
			dispatcher.BeginInvoke(action);
		}
	}

	public void InvokeSynchronously(SendOrPostCallback callback, object state)
	{
		ArgumentValidator.AssertNotNull(callback, "callback");
		EnsureInitialized();

		context.Send(callback, state);
	}

	public void InvokeSynchronously(Action action)
	{
		ArgumentValidator.AssertNotNull(action, "action");
		EnsureInitialized();

		if (dispatcher.CheckAccess())
		{
			action();
		}
		else
		{
			context.Send(delegate { action(); }, null);
		}
	}

	public bool InvokeRequired
	{
		get
		{
			EnsureInitialized();
			return !dispatcher.CheckAccess();
		}
	}
}
```

A further advantage of using either a Silverlight or Desktop CLR implementation of the `ISynchronizationContext` is that we are able to write CLR agnostic code. 
That is, code that was written for the Desktop CLR can be easily moved to the Silverlight.

Using the code:

```csharp
UISynchronizationContext.Instance.InvokeSynchronously(delegate
{
	/* Code to execute on the UI thread. */
});
```

## Conclusion

In this post we have looked at consuming the UI's `Dispatcher` in Silverlight as soon as an application starts. 
We also saw how it is possible in Silverlight to accomplish synchronous invocation of delegates on the UI thread.

The full source shown in this article is available on the [Calcium Codeplex site](http://calcium.codeplex.com/). 

