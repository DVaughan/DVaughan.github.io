---
categories: T4
---

I am rather excited to share with you something that I have been working on in my spare time for the last couple of days. 
I have used T4 to build a metadata generator for your Silverlight and Desktop CLR projects. It can be used as a replacement for static reflection (expression trees), reflection (walking the stack), and various other means for deriving the name of a property, method, or field.

There has been much discussion's around [removing the property name string code smell](http://karlshifflett.wordpress.com/2009/08/02/inotifypropertychanged-how-to-remove-the-property-name-string-code-smell/) 
from `INotifyPropertyChanged` implementations. Reflection is slow, and various techniques using reflection have been proposed, 
but have been criticized for contributing to decreased application performance. It now seems reasonable that a language extension 
for property change notification might be in order. But, as we don't have that yet, I have created the next best thing: a generator.

A couple of days ago I began exploring T4 ([Text Template Transformation Toolkit](http://en.wikipedia.org/wiki/Text_Template_Transformation_Toolkit)), 
and I'm loving it. T4, if you don't already know is versatile templating system that allows you to generate classes, sql scripts etc. from within Visual Studio. 
If you have Visual Studio 2008, then you already have T4 ready to go! To find out more about T4 visit [http://msdn.microsoft.com/en-us/library/bb126445.aspx](http://msdn.microsoft.com/en-us/library/bb126445.aspx).

## How to use it

To use MetaGen, simply include the attached MetaGen.tt file in your project. That's it!

The MetaGen.tt has a number of customizable constants to prevent name collisions in your project.

```csharp
/// <summary>
/// The modifier to use when outputting classes.
/// </summary>
const string generatedClassAccessModifier = "internal";

/// <summary>
/// The prefix to use for output class and interface names. 
/// The combination of this and <see cref="generatedClassSuffix"/> provides 
/// MetaGen with the ability to identify those classes etc., 
/// for which it should generated metadata, and to ignore MetaGen generated classes.
/// </summary>
const string generatedClassPrefix = "";

/// <summary>
/// The suffix to use for output class and interface names. 
/// The combination of this and <see cref="generatedClassSuffix"/> provides 
/// MetaGen with the ability to identify those classes etc., 
/// for which it should generated metadata, and to ignore MetaGen generated classes.
/// </summary>
const string generatedClassSuffix = "Metadata";

/// <summary>
/// The child namespace in which to place generated items.
/// If there is a class in MyNamespace namespace, 
/// the metadata class will be generated
/// in the MyNamespace.[generatedClassSuffix] namespace. 
/// This string can be null or empty, in which case a subnamesapce 
/// will not be created, and generated output will reside 
/// in the original classes namespace.
/// </summary>
const string generatedNamespace = "Metadata";

/// <summary>
/// The number of spaces to insert for a one step indent.
/// </summary>
const int tabSize = 4;
```

## Template Implementation

The template consists of a procedural portion of code that retrieves the Visual Studio `EnvDTE.DTE` instance. 
This allows us to manipulate the Visual Studio automation object model, and to retrieve file, class, 
and method information and so on. Thanks go out to [Oleg Sych](http://www.olegsych.com/) for the [T4 Toolbox](http://t4toolbox.codeplex.com/) 
which demonstrated how to retrieve the EnvDTE.DTE from the template hosting environment.

Once we object the relevant `EnvDTE.Project` we are able to process the `EnvDTE.ProjectItems` (files and directories in this case) as the following excerpt shows:

```csharp
IServiceProvider hostServiceProvider = (IServiceProvider)Host;
EnvDTE.DTE dte = (EnvDTE.DTE)hostServiceProvider.GetService(typeof(EnvDTE.DTE));
EnvDTE.ProjectItem containingProjectItem = dte.Solution.FindProjectItem(Host.TemplateFile);
Project project = containingProjectItem.ContainingProject;

/* Build the namespace representations, which contain class etc. */
Dictionary<string, NamespaceBuilder> namespaceBuilders = new Dictionary<string, NamespaceBuilder>();
foreach (ProjectItem projectItem in project.ProjectItems)
{
    ProcessProjectItem(projectItem, namespaceBuilders);
}
```

We then recursively process `EnvDTE.CodeElements` and directories in order to create an object model representing the project.

 
```csharp
public void ProcessProjectItem(ProjectItem projectItem, Dictionary<string, NamespaceBuilder> namespaceBuilders)
{
    FileCodeModel fileCodeModel = projectItem.FileCodeModel;
    
    if (fileCodeModel != null)
    {
        foreach (CodeElement codeElement in fileCodeModel.CodeElements)
        {
            WalkElements(codeElement, null, null, namespaceBuilders);
        }
    }
    
    if (projectItem.ProjectItems != null)
    {
        foreach (ProjectItem childItem in projectItem.ProjectItems)
        {
            ProcessProjectItem(childItem, namespaceBuilders);
        }
    }

}

int indent;

public void WalkElements(CodeElement codeElement, CodeElement parent, 
    BuilderBase parentContainer, Dictionary<string, NamespaceBuilder> namespaceBuilders)
{
    indent++;
    CodeElements codeElements;
    
    if (parentContainer == null)
    {
        NamespaceBuilder builder;
        string name = "global";
        if (!namespaceBuilders.TryGetValue(name, out builder))
        {
            builder = new NamespaceBuilder(name, null, 0);    
            namespaceBuilders[name] = builder;
        }
        parentContainer = builder;
    }
    
    switch(codeElement.Kind)
    {
        /* Handle namespaces */
        case vsCMElement.vsCMElementNamespace:
        {
            CodeNamespace codeNamespace = (CodeNamespace)codeElement;
            string name = codeNamespace.FullName;
            if (!string.IsNullOrEmpty(generatedNamespace) && name.EndsWith(generatedNamespace))
            {
                break;
            }                
            
            NamespaceBuilder builder;
                            
            if (!namespaceBuilders.TryGetValue(name, out builder))
            {
                builder = new NamespaceBuilder(name, null, 0);    
                namespaceBuilders[name] = builder;
            }
                            
            codeElements = codeNamespace.Members;
            foreach (CodeElement element in codeElements)
            {
                WalkElements(element, codeElement, builder, namespaceBuilders);
            }
            break;
        }
        /* Process classes */
        case vsCMElement.vsCMElementClass:
        {
            CodeClass codeClass = (CodeClass)codeElement;
            string name = codeClass.Name;
            if (string.IsNullOrEmpty(generatedNamespace) 
                && name.StartsWith(generatedClassPrefix) 
                && name.EndsWith(generatedClassSuffix))
            {
                break;
            }
            
            List<string> comments = new List<string>();
            comments.Add(string.Format("/// <summary>Metadata for class <see cref=\"{0}\"/></summary>", codeClass.FullName));
            
            BuilderBase builder;
            if (!parentContainer.Children.TryGetValue(name, out builder))
            {
                builder = new ClassBuilder(name, comments, indent);
                parentContainer.Children[name] = builder;
            }
            codeElements = codeClass.Members;
            if (codeElements != null)
            {
                foreach (CodeElement ce in codeElements)
                {
                    WalkElements(ce, codeElement, builder, namespaceBuilders);
                }
            }
            break;    
        }
        /* Process interfaces. */
        case vsCMElement.vsCMElementInterface:
        {
            CodeInterface codeInterface = (CodeInterface)codeElement;    
            string name = codeInterface.Name;
            if (name.StartsWith(generatedClassPrefix) && name.EndsWith(generatedClassSuffix))
            {
                break;
            }
            List<string> comments = new List<string>();
            string commentName = FormatTypeNameForComment(codeInterface.FullName);
            comments.Add(string.Format("/// <summary>Metadata for interface <see cref=\"{0}\"/></summary>", commentName));
            InterfaceBuilder builder = new InterfaceBuilder(name, comments, indent);
            parentContainer.AddChild(builder);
            
            codeElements = codeInterface.Members;
            if (codeElements != null)
            {
                foreach (CodeElement ce in codeElements)
                {
                    WalkElements(ce, codeElement, builder, namespaceBuilders);
                }
            }
            break;
        }
        /* Process methods */
        case  vsCMElement.vsCMElementFunction:
        {
            CodeFunction codeFunction = (CodeFunction)codeElement;
            if (codeFunction.Name == parentContainer.Name 
                || codeFunction.Name == "ToString"
                || codeFunction.Name == "Equals"
                || codeFunction.Name == "GetHashCode"
                || codeFunction.Name == "GetType"                    
                || codeFunction.Name == "MemberwiseClone"
                || codeFunction.Name == "ReferenceEquals")
            {
                break;
            }
            
            string name = codeFunction.Name.Replace('.', '_');
            List<string> comments = new List<string>();
            string commentName = FormatTypeNameForComment(codeFunction.FullName);
            comments.Add(string.Format("/// <summary>Name of method <see cref=\"{0}\"/></summary>", commentName));
            MemberBuilder builder = new MemberBuilder(name, comments, indent);
            parentContainer.AddChild(builder);
            break;
        }
        /* Process properties. */
        case vsCMElement.vsCMElementProperty:
        {
            CodeProperty codeProperty = (CodeProperty)codeElement;
            
            string name = codeProperty.Name.Replace('.', '_');
            if (name != "this")
            {
                List<string> comments = new List<string>();
                string commentName = FormatTypeNameForComment(codeProperty.FullName);
                comments.Add(string.Format("/// <summary>Name of property <see cref=\"{0}\"/></summary>", commentName));
                MemberBuilder builder = new MemberBuilder(name, comments, indent);
                parentContainer.AddChild(builder);
            }
            break;
        }
        /* Process fields. */
        case vsCMElement.vsCMElementVariable:
        {
            CodeVariable codeVariable = (CodeVariable)codeElement;    
            string name = codeVariable.Name;
            List<string> comments = new List<string>();
            string commentName = FormatTypeNameForComment(codeVariable.FullName);
            comments.Add(string.Format("/// <summary>Name of field <see cref=\"{0}\"/></summary>", commentName));
            MemberBuilder builder = new MemberBuilder(name, comments, indent);
            parentContainer.AddChild(builder);
            break;
        }
    }
    indent--;
}
```

Once this is complete we output our namespace representations to the resulting MetaGen.cs file like so:

```csharp
/* Finally, write them to the output. */
foreach (object item in namespaceBuilders.Values)
{
     WriteLine(item.ToString());
}
```

What results is a file containing various namespace blocks that include static classes representing 
our non-metadata classes and interfaces with the project. Property names, method names, and field names are represented as constants. 
Inner classes are represented as nested static classes.

I have included with this post the MetaGen.tt template file, and also a demo WPF application. 
If you have any suggestions such as ideas for other metadata information etc., please let me know.

[MetaGen.tt (14.92 kb)  (Just the T4 template)](/Downloads/MetaGen.tt)

[MetaGen.zip (60.08 kb)  (The T4 template and an demo application)](/Downloads/MetaGen.zip)

> **Update:** I've published a [more recent article on CodeProject](http://www.codeproject.com/KB/codegen/T4Metadata.aspx) with a newer enriched template and examples.

> **Note:** If you are after the latest and greatest version of this template, please procure it from the [Calcium SDK](http://calcium.codeplex.com/) (in the core project).