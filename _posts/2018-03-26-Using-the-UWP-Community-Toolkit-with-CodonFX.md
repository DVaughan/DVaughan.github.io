---
categories: Codon
title: Using the UWP Community Toolkit with Codon FX
published: false
---

[Codon FX](http://www.codonfx.com) is a cross-platform framework for building maintainable applications. I use it for all of my .NET based applications.

Codon is built on .NET Standard and uses platform specific assemblies to support various platforms including UWP. Codon has no references to third-party libraries, keeping it light-weight and free from version conflicts. There is, however, nothing preventing you from enriching Codon with your own custom services tailored for a particular platform. 

There are various services that can be easily swapped out using Codon's IoC infrastructure. One such service is Codon's dialog service (`Codon.Services.IDialogService`), which is used to display various dialogs to the user, or to ask the user a question, or to display toast notifications. Currently, there's an implementation of `IDialogService` for UWP, WPF, and Xamarin Android/iOS/Forms. 

There are several Codon services that I find indispensable when building apps. `IDialogService` is one of these. Being able to quickly ask the user a question or display a message is such a common use case. I couldn't bear not having a cross-platform dialog service at my fingertips; having to rely on building a platform specific dialog for each interaction would slow down development considerably.

The UWP implementation of the `IDialogService`, however, relies on the UWP toast API, which places toast notifications adjacent to the Windows Status bar. This isn't optimal considering that the notification is not front and center while your app is in the foreground, and displaying toasts down in the status area while your app is in the foreground is generally frowned upon.

We can improve the way toasts are displayed for UWP apps by creating a custom `IDialogService`, inheriting from the UWP `DialogService`, and overriding its toast related methods. In this article you see how to achieve that, along with leveraging the [UWP Community Toolkit](https://github.com/Microsoft/UWPCommunityToolkit)'s `InAppNotification` API to display in-app notifications.

All of Codon's services and many of its other components are designed to be replaceable. If you don't like the way something works, or you want to provide enhancements to a component, there's nothing stopping you from swapping it out with your own implementation. For example, want to change how logging is performed? Substitute in your own `ILog` implementation. All of Codon's logging will utilize your `ILog` implementation.

## Creating a Custom Dialog Service

To create a custom UWP `IDialogService` implementation, begin by using the NuGet package manager to reference the package *Codon.Uwp*. This package brings in Codon's .NET Standard core library and a UWP platform specific library.
While you're at it, use the NuGet package manager to reference the UWP Community Toolkit package named *Microsoft.Toolkit.UWP*.

Once you've referenced Codon, you can take the default `IDialogService` implementation for a spin by using the following:

```csharp
bool userHitOkay = await Dependency.Resolve<IDialogService>()
                    .AskOkayCancelQuestionAsync("Would you like to continue?");
```
Here we resolve the `IDialogService` from the IoC container using the static `Dependency.Resolve` method.
The `IDialogService` implementation has an awaitable `AskOkayCancelQuestion` method that returns `true`
if the user clicks/taps okay; `false` otherwise. There are a bunch of other useful methods that I use a lot 
when I'm building apps. The most frequently used is the good ol' `ShowMessageAsync` method. Though, I especially like the `AskQuestionAsync` method, that lets you pass in a question object. For example, here's one I use in [Surfy Browser](http://SurfyBrowser.com) for Windows Mobile and Android:

```csharp
var question = new TextQuestion(string.Empty)
	{
		DefaultResponse = string.Empty,
		Caption = AppResources.AppBar_MenuItem_FindOnPage,
		InputScope = InputScopeNameValue.Text
	};

var questionResponse = await DialogService.AskQuestionAsync(question);
```

Here I create a `TextQuestion` object that defines a caption to display on a dialog ("Find on Page"), a default value to place in the text box, and even an input scope value, which determines the soft input panel keyboard. Figure 1. shows the dialog displayed within Surfy Browser on Android.

<figure><img src='/assets/images/2018-03-25_FindOnPage.png'><figcaption>Figure 1. Using the IDialogService to ask the user a text response question.</figcaption></figure>

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

Now, while I don't particularly care for this approach, in that I'd prefer to see the control live independently from the page, placed dynamically in the visual tree. But, for this example, I'm going to live with it.

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

In this post you've seen how to supplant Codon's `IDialogService` implementation, with a custom implementation that leverages the UWP Community Toolkit's `InAppNotification` component, to display in-app toast messages. You also saw how Codon's services and components can be replaced to provide new capabilities. Codon is a zero-dependency framework. There are no references to third party libraries, keeping it light-weight and free from version conflicts. There is, however, nothing preventing you from enriching Codon with your own custom services tailored for a particular platform.

I hope you find this post useful. Have a great day!