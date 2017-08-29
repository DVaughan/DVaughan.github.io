---
categories: Xamarin Android
redirect_from:
 - /post/Generating-Localized-Resources-in-Mono-for-Android-Using-T4.aspx.html
---

## Introduction
Recently I have been using the Xamarin products: Mono for iOS and Mono for Android, to port some of our Windows Phone apps to iOS and Android. 
I like the Xamarin products a lot. Being able to contain most of my development activities 
to the familiar environment of Visual Studio has made getting up to speed easier.

One key facet of the Xamarin products, in particular Mono for Android, is that they do not attempt 
to overly abstract the APIs of the underlying platform. When you are working with Mono for Android, 
the class hierarchy, in the most part, mirrors that of the Java Android SDK. This means that you 
don't miss out on learning how 'native' development is done, and that you aren't introducing an undue dependency on a third party API.

There isn't a built-in unified UI framework for Xamarin's mono products. 
You still have to define your views separately for each platform. Obviously this adds to development time, 
yet it makes sense. Each platform has a different look and feel, and users prefer apps that conform 
to the UI conventions of their particular mobile platform. There are open source projects out there that attempt to bridge the gap. 
If though, you wish to leverage the UI visual development tools provided by Xcode and Visual Studio, 
there is no getting away from providing a separate UI implementation for each platform. 
If you are new to iOS development like I am, then using Xcode's Interface Builder also allows you 
to explore and improve your understanding of the UI framework.

Aside from the absence of a unified UI framework, there is also a major difference in the localization model 
in Mono for Android. Mono for Android uses the same localization model as that of apps built in Java 
using the Android SDK. This creates an incompatibility with Windows Phone and Mono for iOS projects, 
which both normally use Resx files for localization.

This article looks at creating a T4 template to generate a Mono for Android localization files from Resx files. 
You see how to reuse the template with the import directive. 
You see how to generate a designer class with statically typed properties using T4. 
Finally the article demonstrates how to dynamically change the UI language at run-time.

## Localization Model Differences Between .NET and Mono for Android

Although Mono for Android's localizability model is markedly different to the Resx model, 
they do have similarities. Android's string localization model uses XML files, containing 
key value pairs that declare localized strings in your app. Unlike .NET, however, these files are placed 
in a Resources directory within your Mono for Android project and compilation to satellite assemblies does not occur.

In Android, you add support for additional languages by creating additional XML files; 
placing them in folders within the Resources directory that are suffixed with language and region codes. 
Android chooses the appropriate set of resources depending on the locale that the app is running under. 
This is much like the .NET hub and spoke localization model, where a default Resx file is complimented 
by other localized Resx files. If a string cannot be located in a specific language, fall back occurs to the default resource file.

In .NET, Resx files are accompanied by a generated designer class that allows you to reference 
localized strings using statically typed properties, which gives you compile time assurance 
that the resource names have been correctly specified in your code. Although Mono for Android also generates a designer class, 
it surfaces the resources as an integer identifier, which introduces an extra step to retrieving a localized resource. 
If you link files into your Mono for Android project that make use of the .NET designer class then your project will not compile. 
The designer class in the .NET project makes use of a ResourceManager object and retrieves localized resources in a manner 
that does not work in Android. Thus, in addition to needing a way to convert each Resx file to an Android localized string file, 
you need a way to generate a Mono for Android-friendly designer class.

## Converting a Resx File to a Mono for Android Localized XML File

Resx files are XML files comprised of, among other things, data elements, which specify the name of the resource and its localized value (see Listing 1).

**Listing 1.** Resx File (Excerpt)

```xml
<?xml version="1.0" encoding="utf-8"?>
<root>
  ...
  <data name="Greeting" xml:space="preserve">
	<value>Hello</value>
  </data>
</root>
```

The downloadable sample code includes a T4 template named ResxToAndroidXml.txt (see Listing 2). 

The file contains a single method named `Process` that accepts a path to a Resx file and converts the Resx to an Android compatible localized resource file. 

It does this by loading the Resx file into an `XDocument` object. Each data node within the Resx is written as a string element in the resulting Android resource file.

**Listing 2.** ResxToAndroidXml.txt

```csharp
<#@ output extension=".xml" #>
<#@ template language="C#" hostSpecific="true" #>
<#@ assembly name="System.Core" #>
...
<#@ import namespace="System.Globalization" #><#+

public void Process(string resxRelativePath)
{
	WriteLine("<?xml version=\"1.0\" encoding=\"utf-8\" ?>");
	WriteLine("<resources>");

	XDocument document;
	try
	{
		document = XDocument.Load(resxRelativePath);
	}
	catch (FileNotFoundException)
	{
		WriteLine("<!-- File not found: " + resxRelativePath + " -->");
		WriteLine("</resources>");
		return;
	}

	IEnumerable<XElement> dataElements = document.XPathSelectElements("//root/data");

	foreach (XElement element in dataElements)
	{
		string elementName = element.Attribute("name").Value;
		string elementValue;

		XElement valueElement = element.Element("value");

		if (valueElement != null)
		{
			elementValue = valueElement.Value;
		}
		else
		{
			continue;
		}

		string cleanedValue = elementValue.Replace("'", "\\'");

		WriteLine(string.Format("    <string name=\"{0}\">{1}</string>", elementName, cleanedValue));
	}

	WriteLine("</resources>");    
}
#>
```

Android requires that localized files be placed in directories named according to the culture 
and region codes (see Figure 1). The default string resources are placed in a Values directory. 
Localized resources are placed in directories suffixed with the culture and optionally a region code.

![Android Resx T4 Android Project](/assets/images/AndroidResxT4Android.png)

**Figure 1.** The Sample Android Project Structure

To create a T4 template in your Mono for Android project, add a new text file to the project 
using the Add New Item dialog, and then rename the file, giving it a .tt file extension.

A String.tt template, which references the ResxToAndroidXml.txt include, is placed in each Values directory. 
Each specifies a different Resx file in the .NET project, as demonstrated in Listing 3.

**Listing 3.** Strings.tt

```csharp
<#@ include file="..\..\..\..\ResxToAndroidXml.txt" #>
<#@ output extension=".xml" #>
<#@ template language="C#" hostSpecific="true" #>
<#
	Process(Path.GetDirectoryName(Host.TemplateFile) 
			 + "../../../../AndroidResxT4/Resources/AppResources.resx");
#>
```

Resulting String.xml files must have their Build Action set to AndroidResource (see Listing 4). 
You can see that the name attribute of the data element in the Resx file maps to the name attribute 
of the string element in the Android resource, and that the value element in the Resx file maps to the content of the string element in the Android resource.

**Listing 4.** Strings.xml

```xml
<?xml version="1.0" encoding="utf-8" ?>
<resources>
	<string name="Greeting">Hello</string>
</resources>
```

## Generating Statically Typed Properties for Resource Values

The generated Mono for Android localized string files can be consumed in Mono for Android layout files or in code. 
Recall, however, that the generated Resx designer class in the .NET project cannot be reused in your Android project. 
What you need is an independent designer class just for the Mono for Android project that contains 
the same properties as the .NET Resx designer class. For this we turn to T4 once again.

The ResxToAndroidAccessorClass.txt file in the downloadable sample is a T4 template with a single method named `Process`. 
`Process` accepts the path to your Resx file and the namespace you wish the resulting designer class to reside in (see Listing 5). 

The method attempts to load the Resx file into an `XDocument` object and then generates a property element for each data element in the Resx file. 
The class is placed into the specified namespace. This allows you to align the code with that of your .NET project.

**Listing 5.** ResxToAndroidAccessorClass.txt Process Method

```csharp
<#@ output extension=".cs" #>
<#@ template language="C#" hostSpecific="true" #>
<#@ assembly name="System.Core" #>
...
<#@ import namespace="System.Globalization" #><#+

public void Process(string resxRelativePath, string namespaceName)
{
	WriteLine("using Android.App;");
	WriteLine("namespace " + namespaceName);
	WriteLine("{");
	WriteLine("    public class AppResources {");
	//throw new Exception(Directory.GetCurrentDirectory());
	XDocument document;
	try
	{
		document = XDocument.Load(resxRelativePath);
	}
	catch (FileNotFoundException)
	{
		WriteLine("<!-- File not found: " + resxRelativePath + " -->");
		WriteLine("}}");
		return;
	}

	IEnumerable<XElement> dataElements = document.XPathSelectElements("//root/data");

	foreach (XElement element in dataElements)
	{
		string elementName = element.Attribute("name").Value;
		string elementValue;

		XElement valueElement = element.Element("value");

		if (valueElement != null)
		{
			elementValue = valueElement.Value;
		}
		else
		{
			continue;
		}

		string cleanedValue = elementValue.Replace("'", "\\'");

		{% raw %}WriteLine(string.Format("public static string {0} {{ get {{ return Application.Context.GetString(Resource.String.{0}); }}}}", elementName));{% endraw %}
	}

	WriteLine("}}");
}
#>
```

To leverage the ResxToAndroidAccessorClass.txt file, create a T4 file named AppResources.tt in your Mono for Android project. 
Use the include directive to import the template and call the `Process` method with the path of the Resx file and the desired namespace (see Listing 6).

**Listing 6.** AppResources.tt

```csharp
<#@ include file="..\..\ResxToAndroidAccessorClass.txt" #>
<#@ output extension=".cs" #>
<#@ template language="C#" hostSpecific="true" #>
<#
	Process(Path.GetDirectoryName(Host.TemplateFile) 
				  + "../../AndroidResxT4/Resources/AppResources.resx", "AndroidResxT4");
#>
```

The template produces a class with properties for all of the localized string in your default resource file (see Listing 7)

**Listing 7.** AppResources.cs in Mono for Android Project

```csharp
using Android.App;
namespace AndroidResxT4
{
	public class AppResources 
	{
		public static string Greeting 
		{ 
			get 
			{ 
				return Application.Context.GetString(Resource.String.Greeting); 
			}
		}
	}
}
```

The AppResources class in your Mono for Android project should mirror your designer class in your .NET project, 
allowing you to seamlessly link to classes in your .NET project without breaking compilation.

## Sample Project Overview

In addition to converting Resx to Android resources and generating a resource designer class, 
the downloadable sample code demonstrates how to change the UI language of your Mono for Android app at runtime.

The `MainActivity` class contains a `SetLocale` method that creates a new `Locale` object and updated the app's configuration (see Listing 8). 
The `AttachView` and `DetachView` methods subscribe and unsubscribe to the button's `Click` event.

**Listing 8.** SetLocale Method

```csharp
void SetLocale(string languageCode)
{
	Resources resources = Resources;
	Configuration configuration = resources.Configuration;
	configuration.Locale = new Java.Util.Locale(languageCode);
	DisplayMetrics displayMetrics = resources.DisplayMetrics;
	resources.UpdateConfiguration(configuration, displayMetrics);

	DetachView();

	SetContentView(Resource.Layout.Main);

	AttachView();
}
```

Updating the configuration with a French Locale, specified using the 'fr' language code, causes the text of a TextView to change from Hello to Bonjour, as shown in Figure 2.

![App shown displaying English and French](/assets/images/2013-04-14-AndroidScreenShot.png)

**Figure 2.** Tapping the Change Locale Button Switches the Language

The `AppResources` class can be used as it would in a .NET app. Notice that tapping the button writes the localized Greeting message to the console (see Listing 9).

**Listing 9.** Button.Click Handler

```csharp
void HandleButtonClick(object sender, EventArgs e)
{
	SetLocale(!localeToggled ? "fr" : "en");
	localeToggled = !localeToggled;

	Console.WriteLine(AppResources.Greeting);
}
```

## Summary

This article looked at creating a T4 template to generate a Mono for Android localization file. 
You saw how to reuse T4 templates using the import directive. You saw how to generate a designer class with statically 
typed properties using T4. Finally the article demonstrated how to dynamically change the UI language of an Android app at run-time.

If you apply the principles of [IoC](http://en.wikipedia.org/wiki/Inversion_of_control) and avoid mixing platform specific API calls in your app logic, 
you can maximize code reuse across platforms. I have almost completed porting the entirety of the [Calcium SDK](http://www.calciumsdk.com/) base library 
to Mono for Android and Mono for iOS. Calcium includes numerous features that make building multifaceted maintainable apps easier, 
including an IoC and DI system and a user preference API. Anyway, more on that later.

Sample: [AndroidResxT4_01.zip (52.71 kb)](/Downloads/AndroidResxT4_01.zip)