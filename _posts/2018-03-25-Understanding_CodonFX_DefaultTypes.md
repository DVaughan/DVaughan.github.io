---
categories: Codon
title: Understanding Default Type Mapping with Codon FX
---

[Codon FX](http://www.codonfx.com) is a cross-platform framework for building maintainable applications. I use it for all of my .NET based applications.
Codon is built on .NET Standard and uses platform specific assemblies to support various platforms such as Xamarin Android, iOS, WPF, and UWP. It's a zero-configuration framework. By that I mean that it doesn't require bootstrapping; services used internally and in user code are resolved automatically, despite being potentially located in platform specific assemblies. The way that Codon resolves platform specific services deserves some explanation. That's the purpose of this post.

There are various abstractions within Codon, such as the `ISynchronizationService`, `IDialogService`, `IClipboardService`, `INavigationMonitor`, `ISettingsService`, `IMemoryUsage`, `IPowerService`, and `IStateManager` to name just a few. If you take a look at one of these services you'll notice that it is decorated with a `Codon.InversionOfControl.DefaultTypeAttribute` and/or a `Codon.InversionOfControl.DefaultTypeName`. These attributes give Codon's IoC container `FrameworkContainer` a hint on how to resolve service implementations at run-time. For example, the `IDialogService` is a decidedly platform specific service. It is used to display dialogs, ask the user questions, and popup toasts. Implementations exist for it in each of the platform specific assemblies. The `IDialogService` is decorated with a `DefaultTypeName` attribute, as shown in the following excerpt:

```csharp
[DefaultTypeName(AssemblyConstants.Namespace + "." + nameof(DialogModel)
		+ ".DialogService, " + AssemblyConstants.PlatformAssembly, Singleton = true)]
public interface IDialogService
{
...
}
```

Consumers of the `IDialogService` retrieve the service implementation either via dependency injection (constructor or property), or by leveraging the IoC container directly. This is ordinarily done by calling the static `Dependency.Resolve<IDialogService>()` method. When a request to resolve the `IDialogService` arrives, the `FrameworkContainer` looks for a registered type implementing `IDialogService`. If it doesn't find one, it then turns to the `DefaultTypeName` and `DefaultType` attributes to located the implementation. In the case of the `IDialogService` it probes for the implementation using the fully qualified type name *Codon.DialogModel.DialogService, Codon.Platform*. Notice that the assembly name is *Codon.Platform*. Codon uses this assembly name for all of its platform specific core assemblies. Thus making it easy to reference types in, for example, XAML regardless of what platform the application is running on.

> **NOTE:** When set to `true` the `Singleton` property of the `DefaultType` and `DefaultTypeName` attributes indicate to the IoC container that only one instance of the specified mapped type should be created, which is reused for all subsequent requests. When `false`, the IoC container creates a new instance of the default type upon each request. The default value of the `Singleton` property is true.

The `IDialogService` only makes use of the `DefaultTypeName` attribute. That's because there is no non-platform-specific implementation for this service. There are, however, other services that do have default implementations, such as the `IExceptionHandler` interface. The `IExceptionHandler` allows your application to process exceptions raised within other services and types. The commanding infrastructure uses the `IExceptionHandler` to hand-off exceptions that are thrown during command excecution and potentially not from the UI thread. This saves you from having to wrap all your command logic in try/catch blocks. But, I digress. The default implementation for the `IExceptionHandler` is the `LoggingExceptionHandler` and it is specified by decorating the `IExceptionHandler` with a `DefaultType` attribute, as shown in the following excerpt: 

```csharp
[DefaultType(typeof(LoggingExceptionHandler))]
public interface IExceptionHandler
{
...
}
```

The default implementation of the `IExceptionHandler` simply logs the message using the registered `ILog` instance and returns true; indicating to the caller that the exception should be re-thrown. See Listing 1.

> **NOTE:** The `IExceptionHandler` interface is one service for which you should really consider providing your own implementation.


**Listing 1.** LoggingExceptionHandler Class
```csharp
class LoggingExceptionHandler : IExceptionHandler
{
	public bool ShouldRethrowException(
		Exception exception, 
		object owner, 
		string memberName = null, 
		string filePath = null,
		int lineNumber = 0)
	{
		var log = Dependency.Resolve<ILog>();
		if (log.ErrorEnabled)
		{
			log.Error("LoggingExceptionHandler: Unhandled exception occurred. " + owner,
						exception, null, memberName, filePath, lineNumber);
		}

		return true;
	}
}
```

We've seen how Codon's `DefaultType` and `DefaultTypeName` attributes are used to resolve default implementations. But, what happens if you want to specify a default implementation from an assembly that does not reference the Codon core .NET Standard library. To achieve that, you can use the `System.ComponentModel.DefaultValueAttribute`. This attribute allows you to specify a default implementation as demonstrated in the following example:

```csharp
[System.ComponentModel.DefaultValue(typeof(UndoService))]
public interface IUndoService
{
...
}
```

> **NOTE:** When using `System.ComponentModel.DefaultValueAttribute` to specify a default implementation, the implementation is considered to be a singleton. The `DefaultValueAttribute` does not allow you to provide other parameters such as whether or not the class should be instantiated upon each request.

In this post we've seen how Codon is a zero-configuration framework; it doesn't require bootstrapping. Services used internally and in user code are resolved automatically, despite potentially being located in platform specific assemblies. Codon's `DefaultType` and `DefaultTypeName` attributes are used to specify default type mappings. Types can also being specified using the `System.ComponentModel.DefaultValueAttribute`, allowing you to specify default implementations within class libraries that do not reference Codon's core assembly.

I hope you find this post useful. Have a great day!