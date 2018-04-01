---
categories: Codon
title: Asynchronous Commanding with Codon FX
published: false
---

## Introduction

Have you ever created a view-model for your app that contains an `ICommand` that needs to perform some asynchronous activity? Such as calling a web API or saving data to a file? If you have, you'll be aware that synchronous `ICommand` interface doesn't easily lend itself to asynchronous operations. You end up having to build a mini-state-machine to disable and re-enable the command target when the command completes. Wouldn't it be nice if commands could function asynchronously? Well, in Codon, they can.

[Codon FX](http://www.codonfx.com) is a cross-platform framework for building maintainable applications. Codon comes with a rich commanding infrastructure. As you'd expect there is a basic `ICommand` implementation: `ActionCommand`, that allows you to supply delegates that are called during command execution or when evaluating the command's `Enabled` property. There is also a `UICommand` class that, in addition to the features of the `ActionCommand` class, provides text, icon, and visibility support. You'd be forgiven for thinking that these `ICommand` implementations, residing in Codon's core .NET Standard library, are all that Codon has to offer. But they're not. In Codon's *Extras* package there exists a number asynchronous commands, which are analogous to those in the core library, and offer *async* support.  `AsyncActionCommand` brings in asynchronous method support, yet also implements `ICommand` seamlessly, making it compatible with the built-in commanding infrastructure of UWP, WPF, Xamarin Forms, and Codon's Xamarin Android binding system. 

In this post you look at using the `AsyncActionCommand`. You see how to create a view-model with an asynchronous command that kicks of a potentially long running operation. You also explore how to globally handle exceptions that occur during the execution of an asynchronous operation.

## Getting Started with Codon FX

Codon is built on .NET Standard. It has platform specific packages to support its dialog service and a number of other services. But, if you don't need the `IDialogService` implementation, page navigation, or any of the other platform specific features, then a NuGet reference to *Codon* or *Codon.Extras.Core* will suffice.

I the sample UWP app in the downloadable sample code, we make use of Codon's `IDialogService`. For that reason, I've added a reference to the *Codon.Extras.Uwp* package.

The `MainViewModel` class in the sample contains a single `ICommand` named `DoWorkCommand`. See Listing 1.

`DoWorkCommand` is created with the following two parameters:
* An async execute method, 
* and an async can-execute method.

There isn't a traditional getter or setter for the `DoWorkCommand` property. Instead I've used a C# 7.0 expression bodied getter to lazy-load the command. You don't need to do it this way, I just happen to like the conciseness of this syntax.

**Listing 1.** The Asynchronous DoWorkCommand
```csharp
public class MainViewModel : ViewModelBase, IExceptionHandler
{
    ...
    
	AsyncActionCommand doWorkCommand;

	public ICommand DoWorkCommand => doWorkCommand
		?? (doWorkCommand = new AsyncActionCommand(
				DoWorkAsync, CanDoWorkAsync));
		
    ...
}
```

`MainViewModel` extends Codon's `ViewModelBase` class. The `Codon.UIModel.ViewModelBase` class extends `ObservableBase`, which implements `INotifyPropertyChanged` (and `INotifyPropertyChanging`) via its `PropertyChangeNotifier`.  

The `MainViewModel` contains a boolean `Busy` property, which, as we shall see, is used to display a busy progress ring on a page. The property is defined in the view-model as shown:

```csharp
bool busy;

public bool Busy
{
	get => busy;
	private set => Set(ref busy, value);
}
```

Before we look at the `DoWorkCommand`s handlers, lets briefly examine Codon's property setter infrastructure and the way property change notification happens behind the scenes. We use the initialism INPC to refer to `INotifyPropertyChanged`.

## Understanding Codon's Property Setter API

The `ViewModelBase` class's `Set` method updates the field only if it has changed, and ensures that the update occurs on the UI thread so no cross-thread exceptions are thrown.

The `Set` method returns one of the following `AssignmentResult` enum values:
* Success
* Cancelled
* AlreadyAssigned
* OwnerDisposed

`Success` indicates that the field was not equal to the value being applied and that the field is now set to the specified value.

`Cancelled` may be returned if a subscriber to the view-model's `INotifyPropertyChanging` method, marks the `PropertyChangingEventArgs` as *Cancelled*, which prevents the field value from being updated.

If `AlreadyAssigned` is returned, then the field is equal to the value being applied. Neither the `PropertyChanging` event nor the `PropertyChanged` event is raised in this case.

`ViewModelBase` extends `ObservableBase`, which makes use of a `PropertyChangeNotifier` object. The `PropertyChangeNotifier` class allows you to aggregate the INPC behavior, and alleviates the need inherit from a base class implementing `INotifyPropertyChanged`.

> **FUN FACT:** You can use `PropertyChangeNotifier` to enable INPC on any class.

If you're interested in the inner workings of Codon's INPC infrastructure please see [`Codon.ComponentModel.ObservableBase`](https://github.com/CodonFramework/Codon/blob/master/Source/Framework/Codon/ComponentModel/ObservableBase.cs).

## Understanding Async Command Actions

In this part of the post we look at the two method delegates passed to the `AsyncActionCommand`'s constructor. The first is the command's execution method, the second is a method that determines the `Enabled` state of the command and whether it can be executed.

The `CanDoWorkAsync` method relies on the `busy` flag, as shown in the following excerpt: 

```csharp
Task<bool> CanDoWorkAsync(object arg)
{
	return Task.FromResult(!busy);
}
```

When the view-model's `Busy` property is set to `true`, the `CanDoWorkAsync` method returns a `Task<bool>` equal to `false`, which sets the `Enabled` state of the command to `false`. There's some magic that happens behind the scenes to make all this happen asynchronously. Please see the source of [AsyncActionCommand](https://github.com/CodonFramework/Codon/blob/master/Source/Framework/Codon.Extras/UIModel/Input/Commands/AsyncActionCommand.cs) if you're interested.

> **NOTE:** A little know fact, Codon commands also support parameter type coercion. Codon commands support generics, so that if, for example, a command expects a `bool` parameter then a parameter specified in XAML as `true` is automatically converted to a `bool`. This mechanism is also extensible; you can add your own type coercion capabilities by creating a custom `IImplicitTypeConverter` class which you then add to the IoC container, like so:

```csharp
Dependency.Register<IImplicitTypeConverter, MyImplicitTypeConverter>();
```




<figure><img src='/assets/images/2018-03-25_FindOnPage.png'><figcaption>Figure 1. Using the IDialogService to ask the user a text response question.</figcaption></figure>

## Leveraging the UWP Community Toolkit

Let's turn our attention back at the task at hand: changing the toast notification behavior of the `IDialogService` implementation.

The UWP Community Toolkit contains an in-app notification component. You use it by placing an instance of `Windows.UI.Xaml.Controls.ContentControl.InAppNotification` on your page or control, as shown in Listing 1.

**Listing 1.** Using the InAppNotification on a Page
```xml
<Page
	x:Class="Outcoder.Foo.MainPage"
	xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
	xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
	xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
	xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
	xmlns:controls="using:Microsoft.Toolkit.Uwp.UI.Controls"
	mc:Ignorable="d">
	...
<controls:InAppNotification x:Name="InAppNotification" />
...
</Page>
```

While I'm not so keen on the approach that `InAppNotification` takes, in that I'd prefer to see the control live independently from the page, placed dynamically in the visual tree, for this example I'm going to live with it.

With the `InAppNotification` element on the page you can then call the `InAppNotification`'s `Show` method; passing in the text to display and the duration before it is hidden again.

What we are going to do is pass the `InAppNotification` object to a custom `IDialogService`.

The next step is to subclass Codon's UWP `DialogService`. See Listing 2.

We override the `ShowToastAsync` method of the base `DialogService` class. Our new `CustomDialogService` depends on an instance of the `InAppNotification` class. Without it, it can't display notifications and the `CustomDialogService` falls back to the default behavior.

**Listing 2.** CustomDialogService Class
```csharp
public class CustomDialogService : DialogService
{
	public InAppNotification InAppNotification { get; set; }
	public uint ToastHideMS { get; set; } = 3000;

	public override Task<object> ShowToastAsync(ToastParameters toastParameters)
	{
		if (InAppNotification != null)
		{
			int hiddenMS = 0;
			if (toastParameters.MillisecondsUntilHidden.HasValue)
			{
				hiddenMS = toastParameters.MillisecondsUntilHidden.Value;
			}

			InAppNotification.Show(toastParameters.Caption?.ToString(), 
				hiddenMS > 0 ? hiddenMS : (int)ToastHideMS);

			return Task.FromResult(new object());
		}

		return base.ShowToastAsync(toastParameters);
	}
}
```

The `CustomDialogService` `InAppNotification` property is populated in the `MainPage`'s code-beside file. See Listing 3.

**Listing 3.** MainPage Excerpt
```csharp
public sealed partial class MainPage : Page
{
    public MainPage()
    {
        this.InitializeComponent();

        DataContext = ViewModel = Dependency.Resolve<MainViewModel, MainViewModel>(true);

        Loaded += HandleLoaded;

        var dialogService = (CustomDialogService)Dependency.Resolve<IDialogService>();
        dialogService.InAppNotification = InAppNotification;
    }
    ...
}
```

> **NOTE:** If you're concerned about testability because we are tying the `InAppNotification` component to the `IDialogService` implementation, set your mind at ease. There exists a `Codon.DialogModel.MockDialogService` class within the Codon's core library, specifically designed for testing purposes. You can register it with the IoC container, instead of your `CustomDialogService` when your unit-test project is launching, as demonstrated:

```csharp
Dependency.Register<IDialogService>(new MockDialogService());
```

Likewise, to register your `CustomDialogService` for non-unit-testing configurations, place the following somewhere in your app's startup code:

```csharp
Dependency.Register<IDialogService>(new CustomDialogService());
```

Passing an instance of the `CustomDialogService` class to the `Register` method causes a singleton mapping to be created; that instance will be returned from all requests to `Resolve<IDialogService>`. 

> **NOTE:** If you have multiple pages or views, you'll need to assign the `InAppNotification` object to the `CustomDialogService` when the view becomes visible. I'm not happy with that approach. As I mentioned above, I'd like to see the `InAppNotification` component placed dynamically in the visual tree so it is not dependent on being explicitly defined for each page or control.

## Conclusion

In this post you've seen how to supplant Codon's `IDialogService` implementation, with a custom implementation that leverages the UWP Community Toolkit's `InAppNotification` component, to display in-app toast messages. You also saw how Codon's services and components can be replaced to provide new capabilities. Codon is a zero-dependency framework. There are no references to third party libraries, keeping it light-weight and free from version conflicts. There is, however, nothing preventing you from enriching Codon with your own custom services tailored for a particular platform.

You can download the source code for this article from the [Codon Samples repository](https://github.com/CodonFramework/Samples) on GitHub.

I hope you find this post useful. Have a great day!