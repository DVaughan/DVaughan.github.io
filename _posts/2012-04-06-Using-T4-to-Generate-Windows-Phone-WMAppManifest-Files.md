---
categories: Windows-Phone
redirect_from:
 - /post/Using-T4-to-Generate-the-WMAppManifest-File-For-Windows-Phone-Apps.aspx.html
---

Recently, Eric Schoenholzer began an interesting discussion on the Windows Phone Experts group on linkedin centred around techniques for effectively monetizing your apps on the Windows Phone marketplace. In particular, he raised the interesting question of whether it is better to publish a single app with a trial, or whether it is more effective to go for two apps: a free version with ads and a paid version without ads. These days I favour the later in most cases (I explain why in linkedin discussion). But the downside is that because of the reliance on the WMAppManifest file in your phone app, it often means you have to maintain two versions of your app. Rather than do that, my approach has been to rely on a T4 template to generate the WMAppManifest file, which takes care of changing various fields such as the title of the app depending on the value of a pre-processor directive. This allows you to maintain a single version of your app, and a single version of your WMAppManifest file. It's an approach that I have used in several published apps, and it has made maintaining them that little bit easier.

To replace the static WMAppManifest file with a dynamic T4 generated file, perform the following steps:

1. Add a new text file named WMAppManifest.txt to your project.
2. Place the text file in the Properties directory of your project by dragging it with the Visual Studio Solution Explorer.
3. Copy the contents of the existing WMAppManifest.xml file to the newly created WMAppManifest.txt file. When you paste the text, you may find it is incorrectly formatted as HTML. This is Visual Studio trying to be helpful, but in this case we want the text pasted as is. Press Ctrl-Z once, and the auto-formatting will be removed.
4. Add the following T4 directives to the top of the WMAppManifest.txt file:
```xml
<#@ template debug="false" hostspecific="true" language="C#" #>
<#@ output extension=".xml" #>
```
Notice that the template directive specifies that the template is host specific. This gives the template access to the Visual Studio DTE, which is discussed later in this article.
5. Delete the existing WMAppManifest.xml file.
6. Rename WMAppManifest.txt to WMAppManifest.tt. This should produce a WMAppManifest.xml file, which is nested beneath the T4 template (as shown in Figure 1).

![Solution Explorer with T4 template](/assets/images/2012-04-06-SolutionExplorer.jpg)

**Figure 1:** Solution Explorer with T4 template

Using a T4 template to generate the WMAppManifest file is, in itself, not difficult. The fun part is determining your project configuration from the T4 template. This can be done by reading a property value, which is set according to a preprocessor directive, from the template. The system I use is convention based. It relies on a class called DeploymentConfiguration, which is expected to contain a Boolean constant named PaidConfiguration (see Listing 1). A preprocessor directive determines the value of the PaidConfiguration constant. The DeploymentConfiguration class contains several other related properties that can be used to determine the visibility and behaviour of visual elements based on whether the app has been purchased or not.

**Listing 1:** DeploymentConfiguration Class

```csharp
//#define PAID

class DeploymentConfiguration
{
    /// <summary>
    /// The app identifier for the non-free version of the app. 
    /// This is used to provide a link to buy the paid app from the free app.
    /// </summary>
    public static string PaidAppId
    {
        get
        {
            return "11111111-1111-1111-1111-11111111";
        }
    }

    public static string AdAppId
    {
        get
        {
#if DEBUG
            return "test_client";
#else
            return "11111111-1111-1111-1111-11111111";
#endif
        }
    }

    public static string AdUnitId
    {
        get
        {
            return "11111";
        }
    }

    /* This should be false when publishing a paid version; true otherwise. */
    public static bool ShowAds
    {
        get
        {
            return !PaidConfiguration;
        }
    }

    public static bool Paid
    {
        get
        {
            return PaidConfiguration;
        }
    }

    public const bool PaidConfiguration =
#if PAID
 true;
#else
 false;
#endif
}
```

As you see in a moment, the WMAppManifest.tt relies on a include file named ProjectVariables.ttinclude (see Listing 2). 
ProjectVariables.ttinclude relies on the DTE, which is the top level Visual Studio automation object. 
The DTE allows you to traverse the structure of your solution. In this case, it is used to retrieve the value 
of the `PaidConfiguration` constant in the DeploymentConfiguration.cs file.

**Listing 2:** ProjectVariables.ttinclude

```csharp
<#@ assembly name="System.Core" #>
<#@ assembly name="EnvDTE" #>
<#@ import namespace="EnvDTE" #>
<#@ import namespace="System" #>
<#@ import namespace="System.Text" #>
<#@ import namespace="System.Collections.Generic" #>
<#@ import namespace="System.Diagnostics" #>
<#@ import namespace="System.Linq" #>
<#@ import namespace="System.Text.RegularExpressions" #>
<#@ import namespace="System.Globalization" #>
<# 
/* Retrieve the DTE. */
IServiceProvider hostServiceProvider = (IServiceProvider)Host;
EnvDTE.DTE dte = (EnvDTE.DTE)hostServiceProvider.GetService(typeof(EnvDTE.DTE));
/* Retrieve the project in which this template resides. */
EnvDTE.ProjectItem containingProjectItem = dte.Solution.FindProjectItem(Host.TemplateFile);
Project project = containingProjectItem.ContainingProject;
var projectName = project.FullName;
ProjectItem deploymentConfiguration = GetProjectItem(project, "DeploymentConfiguration.cs");

if (deploymentConfiguration == null)
{
    throw new Exception("Unable to resolve DeploymentConfiguration.cs file");
}

var codeModel = deploymentConfiguration.FileCodeModel;
bool paid = false;

foreach (CodeElement codeElement in codeModel.CodeElements)
{
    if (codeElement.Name == "DeploymentConfiguration")
    {
        CodeClass codeClass = (CodeClass)codeElement;
        foreach (CodeElement memberElement in codeClass.Members)
        {
            if (memberElement.Name == "PaidConfiguration")
            {
                CodeVariable variable = (CodeVariable)memberElement;
                paid = bool.Parse(variable.InitExpression.ToString());
            }
        }
    }
} 
#>
<#+ EnvDTE.ProjectItem GetProjectItem(Project project, string fileName)
{
    foreach (ProjectItem projectItem in project.ProjectItems)
    {
        if (projectItem.Name.EndsWith(fileName))
        {
            return projectItem;
        }
        var item = GetProjectItem(projectItem, fileName);
        if (item != null)
        {
            return item;
        }
    }
    return null;
}

EnvDTE.ProjectItem GetProjectItem(EnvDTE.ProjectItem projectItem, string fileName)
{
    if (projectItem.ProjectItems != null 
        && projectItem.ProjectItems.Count > 0)
    {
        foreach (ProjectItem item in projectItem.ProjectItems)
        {
            if (item.Name.EndsWith(fileName))
            {
                return item;
            }
        }
    }
    return null;
} 
#>
```

When the ProjectVariables.ttinclude is defined as an include in the WMAppManifest.tt file, the value of the paid variable 
can be used to determine the title of the app and any other configurable aspects of the app (see Listing 3).

A title variable is assigned according to the value of the paid variable (defined in the ProjectVariables.ttinclude). 
The title variable is then used within the App element.

You'll notice that the include file directive immediately precedes the string title variable definition, 
and that there is no space between them. This isn't merely a case of sloppy formatting but rather the positioning 
of line breaks within the T4 template is important. Adding a line break produces an invalid WMAppManifest, 
because the xml definition must be placed on the first line of the file.

**Listing 3.** WMAppManifest.tt T4 Template

```xml
<#@ template debug="false" hostspecific="true" language="C#" #>
<#@ output extension=".xml" #>
<#@ assembly name="System.Core" #>
<#@ assembly name="EnvDTE" #>
<#@ import namespace="EnvDTE" #>
<#@ import namespace="System" #>
<#@ import namespace="System.Text" #>
<#@ import namespace="System.Collections.Generic" #>
<#@ import namespace="System.Diagnostics" #>
<#@ import namespace="System.Linq" #>
<#@ import namespace="System.Text.RegularExpressions" #>
<#@ import namespace="System.Globalization" #>
<#@ include file="ProjectVariables.ttinclude" #><#
string title = paid ? "My App Pro" : "My App with Ads";
#>
<?xml version="1.0" encoding="utf-8"?>
<Deployment xmlns="http://schemas.microsoft.com/windowsphone/2009/deployment" AppPlatformVersion="7.1">
  <App xmlns="" ProductID="{11111111-1111-1111-1111-111111111111}" Title="<#= title #>" RuntimeType="Silverlight" 
       Version="1.0.0.0" Genre="apps.normal"  Author="Example Author" Description="Sample description" Publisher="Example Publisher">

    <IconPath IsRelative="true" IsResource="false">ApplicationIcon.png</IconPath>
    <Capabilities>
      <Capability Name="ID_CAP_GAMERSERVICES"/>
      <Capability Name="ID_CAP_IDENTITY_DEVICE"/>
      <Capability Name="ID_CAP_IDENTITY_USER"/>
      <Capability Name="ID_CAP_LOCATION"/>
      <Capability Name="ID_CAP_MEDIALIB"/>
      <Capability Name="ID_CAP_MICROPHONE"/>
      <Capability Name="ID_CAP_NETWORKING"/>
      <Capability Name="ID_CAP_PHONEDIALER"/>
      <Capability Name="ID_CAP_PUSH_NOTIFICATION"/>
      <Capability Name="ID_CAP_SENSORS"/>
      <Capability Name="ID_CAP_WEBBROWSERCOMPONENT"/>
      <Capability Name="ID_CAP_ISV_CAMERA"/>
      <Capability Name="ID_CAP_CONTACTS"/>
      <Capability Name="ID_CAP_APPOINTMENTS"/>
    </Capabilities>
    <Tasks>
      <DefaultTask  Name ="_default" NavigationPage="/MainPage.xaml"/>
    </Tasks>
    <Tokens>
      <PrimaryToken TokenID="Your App token id" TaskName="_default">
        <TemplateType5>
          <BackgroundImageURI IsRelative="true" IsResource="false">Background.png</BackgroundImageURI>
          <Count>0</Count>
          <Title>Your app title</Title>
        </TemplateType5>
      </PrimaryToken>
    </Tokens>
  </App>
</Deployment>
```

The app, in the downloadable sample code, supports two configurations: 
a paid configuration and free with ads configuration. The main page title is set according 
to the DeploymentConfiguration.Paid property value, as shown in the following excerpt:

```csharp
public MainPage()
{
    InitializeComponent();

    ApplicationTitle.Text = DeploymentConfiguration.Paid 
                                 ? "MY APP PRO" : "MY APP FREE";
}
```

This indicates the configuration of the application when the PAID preprocessor directive 
is changed in the DeploymentConfiguration class (see Figure 2).

| ![](/assets/images/2012-04-06-FreeScreenShot.jpg) | ![](/assets/images/2012-04-06-PaidScreenShot.jpg) |

**Figure 2:** The main page title changes according to the Paid property.

This enables you to verify that the app has indeed been built for a specific deployment scenario. More importantly, and in both cases, if you switch to the App List after deploying to the emulator you'll see the application title updated to reflect the value in the generated WMAppManifest.xml file (see Figure 3).

| ![](/assets/images/2012-04-06-FreeAppList.jpg) | ![](/assets/images/2012-04-06-PaidAppList.jpg) |


**Figure 3:** App title reflects deployment scenario in the App List.

Thus, there is no longer any need to maintain two copies of your WMAppManifest.xml file or the entire project.

> **NOTE:** The WMAppManifest.tt T4 template must be re-processed when the PAID directive is changed. 
This does not happen automatically. To rerun the T4 template right on the template and select Run Custom Tool. 
Alternative, use the Transform All Templates button in the Solution Explorer tool bar (see Figure 4).

![](/assets/images/2012-04-06-ProcessAllTemplatesButton.jpg)

**Figure 4.** Process All Templates Button

If you wish, the preprocessor directive can be associated with a build configuration for your project, 
allowing you to switch to a different scenario without modifying the DeploymentConfiguration.cs file.

In this article you saw how to use a T4 template to generate the WMAppManifest.xml file for your app. 
You saw how a preprocessor directive can be used to change the contents of the WMAppManifest.xml file, 
in particular the application title to support different application deployment scenarios. 
The Visual Studio DTE was used to traverse the project structure to locate a property in a class; 
forming a bridge between the T4 template and your project configuration.

This approach allows you to maintain a single version of your app, 
and a single version of your WMAppManifest file. It's an approach that I have found useful, 
and I hope you find it useful too.

[Download Source Code (~40kb)](/Downloads/WPManifestGeneration.zip)