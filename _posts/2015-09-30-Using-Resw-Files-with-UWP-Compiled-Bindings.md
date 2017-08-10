# Introduction
With UWP and WinRT, Microsoft introduced a new means for localizability, which differs significantly from the method employed 
in Silverlight and .NET desktop apps. The new model allows you to localize all aspects of your UI, including element dimensions, 
using x:Uid element identifiers. The downside is that you don't get the nice static typing that used to come for free with resx code generation.

In this article you see how to generate classes from a .resw file, which provides both static accessors and instance accessors that are compatible with UWP's compiled bindings; enabling compile time validation of your resource names. You see how the UI updates automatically when the current locale changes. You also learn how to plug in a  `StringParserService` to enable text to be dynamically inserted into strings, as well as embedding references to other resource strings.

> **NOTE:** The UWP and WinRT localizability model is the recommended approach by Microsoft and the techniques described in this article should not be seen as a replacement for the new model, but rather they complement it and can be used in conjuntion with it. 
See the [MSDN](https://msdn.microsoft.com/en-us/library/windows/apps/xaml/hh965329.aspx) resources for more information on preparing a UWP app for localization.

# Generating Resource Classes with T4
Using T4 to generate strongly typed resources is not new. I used T4 to provide [a unified way to access localized resource for Xamarin.Android and Xamarin.iOS](http://www.codeproject.com/Articles/842041/Sharing-Images-between-Projects-in-Xamarin-Forms). 
In fact there already exists [a Visual Studio extension](https://reswcodegen.codeplex.com/) for generating statically typed resources for UWP. The beauty of that tool is that there's no need to refresh the T4 template. 
So why this article? Well, we go further than just static static accessors. We look at supporting compiled bindings. 
It's as easy as adding a T4 template in your project. 
You also see how to leverage a `StringParserService` that allows you to add dynamic content to your localized strings.

To begin, we create a T4 template that generates two classes. The first contains the static accessors that you'd ordinarily see when using a .resx file. The second class contains non-static properties that we can bind to. See Listing 1. The output of the T4 template contains a RetrieveString method that uses the ResourceLoader instance to retrieve the resource value according to the current locale.

The T4 template generates an accessor for each resource in the .resw file, beginning with AppTitle. 
Take note of the RetrieveString method. This is an extensibility point for the script. You can plug in some logic to add a custom step to the string retrieval process. 
I chose to parse the string through [Calcium's](http://calcium.codeplex.com/) `IStringParserService`. 
The `IStringParserService` allows you to register custom tags that are able to married with actions to retrieve things like the current time. 
But, the main reason I enjoy using the `IStringParserService` is that it allows me to combine resource strings; embedding one string within another. 
For example, if there is a resource named AppTitle, the StringParserService allows you to compose another resource like so:

```
Welcome to ${l:AppTitle}
```

The `${...}` format is just a convention to distinguish the tag among other content.

At run-time the StringParserService recursively resolves embedded tags within the resources. 
We cover how to register a converter with the `StringParserService` at the end of the article.

**Listing 1:** Generated Strings class

```csharp
public partial class Strings 
{
    static readonly ResourceLoader resourceLoader; 
 
    static Strings() 
    {
    try
        {
            resourceLoader = ResourceLoader.GetForViewIndependentUse("Strings");
        }
    catch (TypeInitializationException ex)
        {
    throw new Exception("Unable to locate the .resw file with the name: Strings.resw", ex);
        }
    }
    public static string AppTitle => RetrieveString("AppTitle");
    public static string Commands_Register => RetrieveString("Commands_Register");
    // ...
    static IStringParserService stringParserService;
    static readonly object stringParserServiceLock = new object();
    static string RetrieveString(string resourceKey)
    {
    string resourceString = resourceLoader.GetString(resourceKey);
    if (resourceString == null || !resourceString.Contains("${"))
        {
    return resourceString;
        }
    if (stringParserService == null)
        {
    lock (stringParserServiceLock)
            {
    if (stringParserService == null)
                {
                    stringParserService = Dependency.Resolve<IStringParserService, StringParserService>();
                }
            }
        }
    var result = stringParserService.Parse(resourceString);
    return result;
    }
}
```

The second class output by the T4 template is a `BindableStrings` class. This class allows for data-binding in your UI. See Listing 2. 
`BindableStrings` leverages the Strings class to expose the resources outside of a static context. The class constructor subscribes to the `MapChanged` 
event of the `ResourceContext`'s `QualifierValues` object. When the current locale changes, the `MapChanged` event is raised; allowing you to update the bindings 
and trigger a repopulation of localized strings in the UI. It's elegant to see a change in locale reflected immediately in the UI, 
without requiring an app restart. By the way, you can see this in an action with Surfy Browser for Windows Phone when you change the language in the options screen.

> **NOTE:** The HandleMapChanged method invokes the call to TriggerUpdateBindings if the event is raised by a thread that is not the apps UI thread. If you don't do this, an  AccessViolationException can ensue.

**Listing 2:** BindableString Class

```csharp
public class BindableStrings : INotifyPropertyChanged
{
    public BindableStrings()
    {
		var resourceContext = ResourceContext.GetForViewIndependentUse();
        resourceContext.QualifierValues.MapChanged += HandleMapChanged;
    }

    void HandleMapChanged(IObservableMap<string, string> sender, IMapChangedEventArgs<string> @event)
    {
		var dispatcher = Windows.UI.Xaml.Window.Current.Dispatcher;
		if (dispatcher.HasThreadAccess)
        {
            TriggerUpdateBindings();
        }
		else
        {
            dispatcher.RunAsync(CoreDispatcherPriority.Normal, TriggerUpdateBindings);
        }
    }

    public event PropertyChangedEventHandler PropertyChanged;

    public void TriggerUpdateBindings()
    {
		var handlers = PropertyChanged;
		if (handlers != null)
		{
			handlers(this, new PropertyChangedEventArgs(string.Empty));
		}
	}

    public string AppTitle => Strings.AppTitle;
    public string Commands_Register => Strings.Commands_Register;

    //...
}
```

The `BindableStrings` class contains all the localizable string properties of the Strings class, however they aren't static, which allows binding to them.

There are a number of ways to consume the `BindableStrings` class. You can declare a `BindableString` instance as an application resources 
with your App.xaml file or an associated resource dictionary, which allows you to bind to it using the Binding markup extension. 
If, however, you wish to benefit from static verification during compilation, a `BindableStrings` object needs to be accessible 
via a property (direct or nested) of your page or control. Here's one way to do it:

Declare an instance of your BindableStrings object within your view or viewmodel or base viewmodel, like so:

```csharp
readonly static BindableStrings strings = new BindableStrings();
```

Expose the instance as a public property:

```csharp
public BindableStrings Strings => strings;
```

You can then place a compiled binding in your XAML, using the x:Bind markup expression, like so:

```xml
<TextBlock Text="{x:Bind ViewModel.Strings.AppTitle}" />
```

The T4 template allows you to override the default namespace of the resulting class. 
You must provide the path of the .resw file. See Listing 3. 

If a namespace is not provided, the T4 template uses a call to `Host.ResolveParameterValue(...)` to resolve the value. 
By convention it removes the last segment of namespaces ending in *Localizability*. 
You want the localizable string classes available broadly within your app, not hidden in a child namespace.

The T4 template's `GetResourceKeys` method extracts the resource keys from the .resw file. 
These are turned into accessors in the resulting classes.

**Listing 3.** String.tt T4 Template

```csharp
<#@ template debug="false" hostspecific="true" language="C#" #>
<#@ assembly name="System.Core" #>
<#@ assembly name="System.Xml" #>
<#@ assembly name="System.Xml.Linq" #>
<#@ import namespace="System.IO" #>
<#@ import namespace="System.Linq" #>
<#@ import namespace="System.Xml.Linq" #>
<#@ import namespace="System.Collections.Generic" #>
<#@ import namespace="Microsoft.CSharp" #>
<#@ output extension=".cs" #>
<#
var reswPath = @"../Localizability/ResourceFiles/en-US/Strings.resw";
string namespaceOveride = null;
 
var provider = new CSharpCodeProvider();
var className = provider.CreateEscapedIdentifier(
Path.GetFileNameWithoutExtension(Host.TemplateFile));
 
Directory.SetCurrentDirectory(Host.ResolvePath(""));
if (File.Exists(reswPath))
{ 
	int lastIndexOfSlash = reswPath.LastIndexOf("/") + 1;
	int lastIndexOfDot = reswPath.LastIndexOf(".");
	string reswFileNameWithoutExtension 
		= reswPath.Substring(lastIndexOfSlash, lastIndexOfDot - lastIndexOfSlash);
#>
using Windows.ApplicationModel.Resources;
using Windows.ApplicationModel.Resources.Core;
using Windows.Foundation.Collections;
using System;
using System.ComponentModel;
using Outcoder;
using Outcoder.Services;
 
namespace <#= GetNamespace(namespaceOveride) #> 
{
	public partial class <#= className #> 
	{
		static readonly ResourceLoader resourceLoader; 
 
		static <#= className #>() 
		{
			try
			{
				resourceLoader = ResourceLoader.GetForViewIndependentUse("<#= reswFileNameWithoutExtension #>");
			}
			catch (TypeInitializationException ex)
			{
					throw new Exception("Unable to locate the .resw file with the name: <#= reswFileNameWithoutExtension #>.resw", ex);
			}
		}
	<#
		foreach (string name in GetResourceKeys(reswPath).Where(n => !n.Contains(".")))
		{
	#>public static string <#= provider.CreateEscapedIdentifier(name) #> => RetrieveString("<#= name #>");
	<#
		}
	#>
		static IStringParserService stringParserService;
		static readonly object stringParserServiceLock = new object();

		static string RetrieveString(string resourceKey)
		{
			string resourceString = resourceLoader.GetString(resourceKey);
			if (resourceString == null || !resourceString.Contains("${"))
			{
				return resourceString;
			}

			if (stringParserService == null)
			{
				lock (stringParserServiceLock)
				{
					if (stringParserService == null)
					{
						stringParserService = Dependency.Resolve<IStringParserService, StringParserService>();
					}
				}
			}

			var result = stringParserService.Parse(resourceString);
			return result;
		}
	}

	public class Bindable<#= className #> : INotifyPropertyChanged
	{
		public BindableStrings()
		{
			var resourceContext = ResourceContext.GetForViewIndependentUse();
			resourceContext.QualifierValues.MapChanged += HandleMapChanged;
		}

		void HandleMapChanged(IObservableMap<string, string> sender, IMapChangedEventArgs<string> @event)
		{
			var dispatcher = Windows.UI.Xaml.Window.Current.Dispatcher;
			if (dispatcher.HasThreadAccess)
			{
				TriggerUpdateBindings();
			}
			else
			{
			dispatcher.RunAsync(CoreDispatcherPriority.Normal, TriggerUpdateBindings);
			}
		}
		
		public event PropertyChangedEventHandler PropertyChanged;
		
		public void TriggerUpdateBindings()
		{
			var handlers = PropertyChanged;
			if (handlers != null)
			{
				handlers(this, new PropertyChangedEventArgs(string.Empty));
			}
		}
	<#
		foreach (string name in GetResourceKeys(reswPath).Where(n => !n.Contains(".")))
		{
			string propertyName = provider.CreateEscapedIdentifier(name);
	#>public string <#= propertyName #> => Strings.<#= propertyName #>;
	<#
		}
	#>
	}
	}
	<#
	}
	else
	{
		throw new FileNotFoundException(); 
	}
	#>
	<#+
	string GetNamespace(string namespaceOveride)
	{
		if (!string.IsNullOrWhiteSpace(namespaceOveride))
		{
			return namespaceOveride;
		}

		string result = Host.ResolveParameterValue("directiveId", "namespaceDirectiveProcessor", "namespaceHint");
		
		if (result.EndsWith(".Localizability"))
		{
			result = result.Substring(0, result.LastIndexOf(".Localizability"));
		}

		return result;
	}
 
	static IEnumerable<string> GetResourceKeys(string filePath)
	{
		var doc = XDocument.Load(filePath);
		return doc.Root.Elements("data").Select(e => e.Attribute("name").Value);
	}
#>
```

# Registering a Converter with the StringParserService

Calcium's `StringParserService` allows you to register `IConverter` objects. An `IConverter` is used to resolve text when a string is being parsed.  
`IConverter` has a single `Convert` method and accepts an object parameter. The following shows the `LocalizableResourcesConverter` that allows you to embed resources within other resources:

```csharp
public class LocalizableResourcesConverter : IConverter
{
	public object Convert(object fromValue)
	{
		ArgumentValidator.AssertNotNull(fromValue, "fromValue");
		var result = Strings.ResourceManager.GetObject(fromValue.ToString());
		
		return result;
	}
}
```

In the app's startup code, I instantiate the `StringParserService` and then register the `LocalizableResourcesConverter`. 
I then register the `StringParserService` with the IoC container, as show:

```csharp
var stringParserService = new StringParserService();
IConverter converter = new LocalizableResourcesConverter();
stringParserService.RegisterConverter("l", converter);
Dependency.Register<IStringParserService>(stringParserService);
```

You could choose a fancier way of resolving the IConverters at run-time, but I haven't seen cause for that. You'll find more example of IoC registerations in the [Calcium template apps](http://calcium.codeplex.com/).

# Conclusion
This article demonstrated how to generate a classes from a .resw file, which provides both static accessors and instance accessors 
that are compatible with UWP's x:Bind markup extension; enabling compile time validation of your resource names. 
You also saw how to plug-in a StringParserService to enable text to be dynamically inserted into strings as well 
as resource strings with their own embedded references to other resource strings.

Download the sample code for this project: [UwpLocalizabilityExample.zip (105.95 kb)](/Downloads/UwpLocalizabilityExample.zip) 

Alternatively, to ensure you have the most up-to-date version of the code, 
I recommend that you download the source from the [Calcium repository](http://calcium.codeplex.com/) and locate the Calcium.Installation.Uwp solution within the repository.