---
categories: XAML T4
title: XAML Resources Without String Literals.aspx
redirect_from:
 - /post/XAML-Resources-Without-String-Literals.aspx.html
 - /post/Banishing-String-Literals-from-XAML-Resource-References.aspx.html
---

## Introduction

Since my initial experimentation with generating project metadata data using T4 (Text Template Transformation Toolkit),
there have been several obvious opportunities to expand its scope. 
One such opportunity has been to use T4 to generate static properties representing XAML keys. 
This serves to reduce the reliance on string literals when referencing resources. 
I have subsequently augmented my MetadataGeneration.tt template to do just that.

![Meta Data Demo Application Screenshot](/assets/images/2009-10-03-MetaDataDemo01.png)

## x:Key Property Generation

To demonstrate, I have updated the sample application provided with my previous article, and employed a couple `ResourceDictionaries` 
to show how we can reference a 'default' dictionary using constant names, and also how we can cross reference with an auxiliary `ResourceDictionary`, 
overriding the resources using constant name values.

In the following excerpt we see a button that has its Background defined using a Resource whose key is defined as a static property in a generated class.

```xml
<Button 
  Background="{StaticResource {x:Static Keys:MainDictionaryXamlMetadata.ButtonBackgroundKey}}" 
  Margin="0,5,0,0" Content="Change" HorizontalAlignment="Left" Click="Button_ChangeClick"/>
```

This is useful, because it means if we modify the name of the background brush in the `ResourceDictionary` and forget to update references to it, 
we will be alerted at compile time, rather than at runtime.

The MetadataGeneration.tt template scours your project looking for XAML files, and then generates classes for them containing all 
`x:Key` attributes, represented as static properties. As we can see in the following excerpt, that the `ButtonBackGround` key 
is defined as a `LinearGradientBrush` in the MainDictionary.xaml.

**MainDictionary.xaml**

```xml
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <LinearGradientBrush x:Key="ButtonBackground">
        <GradientStop Color="AliceBlue" Offset="0" />
        <GradientStop Color="Yellow" Offset=".7" />
    </LinearGradientBrush>
    <SolidColorBrush x:Key="WindowForegroundBrush" Color="White"/>
</ResourceDictionary>
```

Being able to reference one `ResourceDictionary` from another is useful. If we take another `ResourceDictionary`, 
which redefines the resources of the first, we are able to do so in a safer way; expressing our intent with a dedicated property, 
and using the non-literal string key names derived from the MainDictionary.xaml.

**SecondaryDictionary.xaml**

```xml
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:Metadata="clr-namespace:CSharpDesktopClrDemo.XamlMetadata.Folder1.Metadata">
    <LinearGradientBrush x:Key="{x:Static Metadata:MainDictionaryXamlMetadata.ButtonBackgroundKey}">
        <GradientStop Color="AliceBlue" Offset="0" />
        <GradientStop Color="Blue" Offset=".7" />
    </LinearGradientBrush>
    <SolidColorBrush x:Key="{x:Static Metadata:MainDictionaryXamlMetadata.WindowForegroundBrushKey}" Color="Azure"/>
</ResourceDictionary>
```

So, we can define our resources wherever we like; in a separate assembly for example, yet we still retain compile time validation of resource key references.

**App.xaml**

```xml
<Application x:Class="DanielVaughan.MetaGen.Demo.App"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    StartupUri="Window1.xaml">
    <Application.Resources>
        <ResourceDictionary Source="pack://application:,,,/DanielVaughan.MetaGen.Demo;component/Folder1/MainDictionary.xaml"/>
        <!--<ResourceDictionary Source="pack://application:,,,/DanielVaughan.MetaGen.Demo;component/Folder1/SecondaryDictionary.xaml"/>-->
    </Application.Resources>
</Application>
```

## Implementation

To accomplish the discovery of XAML files and associated Keys, and the subsequent generation of metadata classes, 
during project traversal we must do two things: detect when the project item is a XAML file, and keep a track of the current project directory. 
Now accomplishing the first is easy. Detecting when the current project item is a project folder, on the other hand, 
turned out to be hack-worthy, as you will notice in the following excerpt.

```csharp
string processingDirectory = string.Empty;

public void ProcessProjectItem(ProjectItem projectItem,
    Dictionary<string, NamespaceBuilder> namespaceBuilders, string activeNamespace)
{
    FileCodeModel fileCodeModel = projectItem.FileCodeModel;

    if (fileCodeModel != null)
    {
        foreach (CodeElement codeElement in fileCodeModel.CodeElements)
        {
            WalkElements(codeElement, null, null, namespaceBuilders);
        }
    }
    
    string activeNamespaceCopy = activeNamespace;
    if (string.IsNullOrEmpty(activeNamespaceCopy))
    {
        if (string.IsNullOrEmpty(xamlRootNamespace))
        {
            activeNamespaceCopy = rootNamespace; 
        }
        else
        {
            activeNamespaceCopy = string.Format("{0}.{1}", 
                rootNamespace, xamlRootNamespace);
        }
    }
    
    if (projectItem.ProjectItems != null 
        && projectItem.ProjectItems.Count > 0)
    {
        /* This is a hack to determine if we have a directory.
            If you know the proper way for doing this, please let me know. */
        try
        {
            var foo = projectItem.Document;
        }
        catch (Exception ex)
        {
            string newNamespace = projectItem.Name.Replace(" ", string.Empty); 
            activeNamespaceCopy += "." + newNamespace; 
        }
    }
    
    string itemName = projectItem.Name; 
    if (generateXamlKeys && itemName.EndsWith(".xaml", true, CultureInfo.InvariantCulture))
    {    
        /* Retrieve or create the namespace builder. */
        NamespaceBuilder namespaceBuilder;

        if (!namespaceBuilders.TryGetValue(activeNamespaceCopy, out namespaceBuilder))
        {
            namespaceBuilder = new NamespaceBuilder(activeNamespaceCopy, null, 0);
            namespaceBuilders[activeNamespaceCopy] = namespaceBuilder;
        }
        
        string fileName = projectItem.get_FileNames(0);
        string text = System.IO.File.ReadAllText(fileName);
        MatchCollection matches = xClassRegex.Matches(text);                

        if (matches.Count > 0)
        {
            string xamlMetadataClassName = ConvertProjectItemNameToTypeOrMemberName(itemName.Substring(0, itemName.Length - 4));                
            var classComments = new List<string> {string.Format("/// <summary>Metadata for XAML {0}</summary>", itemName)};
            XamlBuilder xamlBuiler = new XamlBuilder(xamlMetadataClassName, classComments, 1);
            namespaceBuilder.AddChild(xamlBuiler);
            
            foreach (Match match in matches)
            {
                Group keyGroup = match.Groups["KeyName"];
                string keyName = keyGroup.Value;
                var keyComments = new List<string> {string.Format("/// <summary>Represents x:Key=\"{0}\"/></summary>", keyName)};
                xamlBuiler.AddChild(new XamlKeyBuilder(keyName, keyComments));
            }
        }
    }

    if (projectItem.ProjectItems != null)
    {
        foreach (ProjectItem childItem in projectItem.ProjectItems)
        {
            ProcessProjectItem(childItem, namespaceBuilders, activeNamespaceCopy);
        }
    }
}
```

We see that generating XAML metadata works in the same way as the class and interface metadata generation, 
in that we represent the XAML file using a `XamlBuilder`, and keys within the XAML file are represented as `XamlKeyBuilders`.

## Generating Namespaces for XAML Metadata Classes

To avoid collisions with type names and generated namespace, I offer a customizable xamlRootNamespace configuration variable. 
This variable is used to construct namespace names for generated XAML metadata classes as the following example illustrates:

If we have a XAML file called Window1.xaml. It will be represented by a class named [generatedClassPrefix]Window1[generatedXamlClassSuffix][generatedClassSuffix]

## Conclusion

We have seen how XAML Resource keys, ordinarily referenced using magic strings, can be eliminated using generated Type and File metadata.

I am still rather pleased at what one is able to achieve by combining T4 and the DTE. 
Visual Studio 2010 will see T4 move to a more visible position within the IDE. 
This, together with the new features of T4 in VS2010, will surely make it an indispensible tool.

To download the template source and demo applications, please visit the [updated T4 Metadata article on Codeproject](http://www.codeproject.com/KB/codegen/T4Metadata.aspx).