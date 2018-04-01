---
categories: Codon
title: Asynchronous Commanding with Codon FX
published: true
---

## Introduction

Have you ever created a view-model for your app that contains an `ICommand` that needs to perform some asynchronous activity? Such as calling a web API or saving data to a file? If you have, you'll know that the synchronous `ICommand` interface doesn't lend itself easily to asynchronous operations. You end up having to build a mini-state-machine to disable and re-enable the command target when the command completes. Wouldn't it be nice if commands could function asynchronously? Well, in Codon, they can.

[Codon FX](http://www.codonfx.com) is a cross-platform framework for building maintainable applications. Codon comes with rich commanding infrastructure. As you'd expect there is a basic `ICommand` implementation: `ActionCommand`, that allows you to supply delegates that are called during command execution or when evaluating the command's `Enabled` property. There is also a `UICommand` class that, in addition to the features of the `ActionCommand` class, provides text, icon, and visibility support. 

Now, you'd be forgiven for thinking that these `ICommand` implementations, residing in Codon's core .NET Standard library, are all that Codon has to offer as far as commanding goes. But they're not. In Codon's *Extras* package there exists a number of other commands, which are analogous to those in the core library, but offer *async* support.  `AsyncActionCommand` brings in asynchronous method support, yet also implements `ICommand` seamlessly, making it compatible with the built-in commanding infrastructure of UWP, WPF, Xamarin Forms, and Codon's Xamarin Android binding system. 

In this post you look at using the `AsyncActionCommand`. You see how to create a view-model with an asynchronous command that kicks of a potentially long running operation. You also explore how to globally handle exceptions that occur during the execution of an asynchronous operation.

## Getting Started with Codon FX

Codon is built on .NET Standard. It has platform specific packages to support its dialog service and a number of other services. But, if you don't need the `IDialogService` implementation, page navigation, or any of the other platform specific features, then a NuGet reference to *Codon* or *Codon.Extras.Core* will suffice.

The sample UWP app makes use of Codon's `IDialogService`. For that reason, I've added a reference to the *Codon.Extras.Uwp* package.

The `MainViewModel` class in the sample contains a single `ICommand` named `DoWorkCommand`. See Listing 1.

`DoWorkCommand` is created with the following two parameters:
* An async execute method named `DoWorkAsync`, 
* and an async can-execute method names `CanDoWorkAsync`.

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

`MainViewModel` extends Codon's `ViewModelBase` class. The `Codon.UIModel.ViewModelBase` class extends `ObservableBase`, which implements `INotifyPropertyChanged` (and `INotifyPropertyChanging`) via a `PropertyChangeNotifier` object.  

The `MainViewModel` contains a boolean `Busy` property, which, as we shall see, is used to display a busy progress ring on a page. The property is defined in the view-model as shown:

```csharp
bool busy;

public bool Busy
{
	get => busy;
	private set => Set(ref busy, value);
}
```

Before we look at the `DoWorkCommand`s delegates, lets briefly examine Codon's property setter infrastructure and at the way property change notification happens behind the scenes. 

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

`ViewModelBase` extends `ObservableBase`, which makes use of a `PropertyChangeNotifier` object. The `PropertyChangeNotifier` class allows you to aggregate the INPC (INotifyPropertyChanged) behavior, and alleviates the need to inherit from a base class implementing `INotifyPropertyChanged`.

> **FUN FACT:** You can use `PropertyChangeNotifier` to enable INPC on any class.

If you're interested in the inner workings of Codon's INPC infrastructure please see the  [`Codon.ComponentModel.ObservableBase` class](https://github.com/CodonFramework/Codon/blob/master/Source/Framework/Codon/ComponentModel/ObservableBase.cs).

## Understanding Async Command Actions

In this part of the post we look at the two method delegates passed to the `AsyncActionCommand`'s constructor. The first is a the command's execution func `DoWorkAsync`, the second, `CanDoWorkAsync`, is a func that determines the `Enabled` state of the command and whether it can be executed.

The `CanDoWorkAsync` method relies on the `busy` flag, as shown in the following excerpt: 

```csharp
Task<bool> CanDoWorkAsync(object arg)
{
	return Task.FromResult(!busy);
}
```

When the view-model's `Busy` property is set to `true`, the `CanDoWorkAsync` method returns a `Task<bool>` equal to `false`, which sets the `Enabled` state of the command to `false`. There's some magic that happens behind the scenes to make all this happen asynchronously. Please see the source of [AsyncActionCommand](https://github.com/CodonFramework/Codon/blob/master/Source/Framework/Codon.Extras/UIModel/Input/Commands/AsyncActionCommand.cs) if you're interested.

> **Did you know?** Codon commands also support parameter type coercion. Codon's generic support means that if, for example, a command expects a `bool` parameter, then a parameter specified in XAML as `true` is automatically converted to a `bool`. This mechanism is also extensible; you can add your own type coercion capabilities by creating a custom `IImplicitTypeConverter` class which you then add to the IoC container, like so:

```csharp
Dependency.Register<IImplicitTypeConverter, MyImplicitTypeConverter>();
```

Let's return to the command's `DoWorkAsync` method.

The `DoWorkAsync` method is called when the `DoWorkCommand` is executed. See Lising 2. This method is marked async, which means we can *await* other async methods within its body.

It begins by setting a *Busy* flag to true. It then signals to the `doWorkCommand` that it should re-evaluate its `Enabled` property. Because `busy` is true at that point, the command's `Enabled` property is set to false. 

> **NOTE:** In contrast to traditional synchronous `ICommand` implementations, `RaiseCanExecuteChanged` may occur asynchronously, and so the `Enabled` state may not have necessarily changed after the call to its `RaiseCanExecuteChanged` method. To wait for the command to update its `Enabled` property, *await* its `RefreshAsync` method.

You'll notice that there is a `if (raiseException)` block within the method. We explore its purpose in a moment.

We use a `Task.Delay` call to prevent the method from completing for a few seconds, after which we use Codon's `IDialogService` to display an *Activity Complete* message to the user.

The *finally* block sets the `Busy` flag to `false` and once again calls the command's `RaiseCanExecuteChanged` method, which updates the command's `Enabled` property to `true`.

**Listing 2.** DoWorkAsync Method
```csharp
async Task DoWorkAsync(object arg)
{
	try
	{
		Busy = true;
		doWorkCommand.RaiseCanExecuteChanged();

		if (raiseException)
		{
			throw new Exception(
				"This exception is handled by the ShouldRethrowException method.");
		}

		/* Wait for a few seconds before completion. */
		await Task.Delay(5000);

		await Dependency.Resolve<IDialogService>().ShowMessageAsync(
			"The command has finished processing asynchronously.", "Activity Complete");
	}
	finally
	{
		Busy = false;
		doWorkCommand.RaiseCanExecuteChanged();
	}
}
```

So, what's with the `if (raiseException)` block? The view-model contains a `RaiseException` property that when set to `true` causes an exception to be thrown when the command executes. The purpose of this is to demonstrate the commanding infrastructure's global exception handling. 

Exceptions thrown from a non-UI thread are notoriously difficult to handle properly. Especially if your code is running on different platforms. Codon attempts to alleviate that fact by providing a exception handling extensibility point. This is true for the commanding infrastructure, the decoupled messaging system, and the application settings system.

For example, to be notified of, and have the opportunity to handle, exception that are thrown during command execution, we can register a custom `IExceptionHandler` with the IoC container. We can do this globally, using a service that is separate from any particular view-model (an approach I favor), or we can take the easy road and implement `IExceptionHandler` in a view-model and register that view-model with the IoC container, as I did in this example. See Listing 3.

**Listing 3.** Registering an IExceptionHandler
```csharp
public class MainViewModel : ViewModelBase, IExceptionHandler
{
	public MainViewModel()
	{
		/* If an exception occurs during the execution of a command,
			* the ShouldRethrowException method is called. */
		Dependency.Register<IExceptionHandler>(this);
	}
}
```

When an exception is thrown during the *executeAsync* or the *canExecuteAsync* funcs, then the `IExceptionHandler` implementation has the opportunity to handle (disregard/log etc.) the exception. See Listing 4.

The `MainViewModel`'s `ShouldRethrowException` method displays the exception in a dialog using the `IDialogService`. It could just as easily log the exception using Codon's `ILog` and evaluate some rules to determine if the exception should be rethrown or not; as indicated by the return value. If the method returns `true`, the commanding infrastructure re-throws the exception.

Now, if you're as old as I am, you may be thinking: Oh, this reminds me of that awfully complicated Exception Handling Application Block of the Enterprise Library from Patterns and Practices. And yes, it is a little bit like that. But, its real purpose, rather than being a way of applying policies to application errors, is to give your app the opportunity to handle exceptions raised by first or third-party components that might occur on a different thread and crash your app. When using Xamarin Android, for example, there isn't a way to globally handle exceptions.

**Listing 4.** MainViewModel ShouldRethrowException Method
```csharp
bool IExceptionHandler.ShouldRethrowException(Exception exception, object owner, 
	[CallerMemberName]string memberName = null, 
	[CallerFilePath]string filePath = null,
	[CallerLineNumber]int lineNumber = 0)
{
	Dependency.Resolve<IDialogService>().ShowMessageAsync(
		"Exception thrown: " + exception.Message);
			
	return false;
}
```

Let's now explore how the view-model is wired-up to the view. The `MainPage` class of the app sports a `ViewModel` property of type `MainViewModel`. See Listing 5. 

We expose the `MainViewModel` as a property to allow the use of `x:Bind` binding expressions in XAML. The page's `DataContext` property is also set to the `MainViewModel` for good measure. I find it useful to do this for cases where I need the flexibility of old style Binding expressions.  

**Listing 5.** MainPage.xaml.cs
```csharp
public sealed partial class MainPage : Page
{
	public MainPage()
	{
		this.InitializeComponent();

		DataContext = Dependency.Resolve<MainViewModel>();
	}

	public MainViewModel ViewModel => (MainViewModel)DataContext;
}
```

The *MainPage.xaml* file is bound to the view-model's `DoWorkCommand`. See Listing 6.

The `ProgressRing` and the `StackPanel` both share row 0 of the parent `Grid`. The `ProgressRing` sits on top of the other elements.

**Listing 6.** MainPage.xaml Excerpt
```xml
<Page x:Class="AsyncCommandsExample.MainPage"
	...>

	<Grid Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">

		<StackPanel>
		
			<Button Command="{x:Bind ViewModel.DoWorkCommand}" 
					Content="Show Dialog with Timer" />
					
			<ToggleSwitch IsOn="{x:Bind ViewModel.RaiseException, Mode=TwoWay}"
				    Header="Raise Exception during Command Execution" />
				
		</StackPanel>

		<ProgressRing IsActive="{x:Bind ViewModel.Busy, Mode=OneWay}" />

	</Grid>

</Page>
```

A `ProgressRing` control is shown when the view-model's `Busy` property is set to `true`, which occurs for 5 seconds when the button is clicked. See Figure 1.

<figure><img src='/assets/images/2018-04-01_Progress.png'><figcaption>Figure 1. View-model in busy state as command executing.</figcaption></figure>

When the `DoWorkCommand` completes a dialog is presented and the busy state is restored to `false`. See Figure 2.

<figure><img src='/assets/images/2018-04-01_Complete.png'><figcaption>Figure 2. Command execution complete and busy state restored to false.</figcaption></figure>

A `ToggleSwitch` is bound to the view-model's `RaiseException` property. When `IsOn` is set to `true`,
and the button is clicked, an exception is raised in the `DoWorkAsync` method of the view-model. See Figure 3.

<figure><img src='/assets/images/2018-04-01_Exception.png'><figcaption>Figure 3. Exception raised during command execution.</figcaption></figure>

## Conclusion

In this post you've seen how Codon comes with rich commanding infrastructure. As you'd expect there is a basic `ICommand` implementation: `ActionCommand`, that allows you to supply delegates that are called during command execution or when evaluating the command's `Enabled` property. There is also a `UICommand` class that, in addition to the features of the `ActionCommand` class, provides text, icon, and visibility support. However, in Codon's *Extras* package there exists a number asynchronous commands, which are analogous to those in the core library, and offer *async* support.  `AsyncActionCommand` brings in asynchronous method support, yet also implements the `ICommand` interface seamlessly, making it compatible with the built-in commanding infrastructure of UWP, WPF, Xamarin Forms, and Codon's Xamarin Android binding system. 

You saw how to create a view-model with an asynchronous command that kicks of a potentially long running operation. You also explored how to globally handle exceptions that occur during the execution of an asynchronous operation.

[Download or View the Sample Code on GitHub](https://github.com/CodonFramework/Samples)

I hope you find this post useful. Have a great day!