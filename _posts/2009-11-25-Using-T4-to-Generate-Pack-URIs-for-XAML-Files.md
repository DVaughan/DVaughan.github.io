Yesterday my fellow WPF Disciple Paul Stovell got me thinking about resolving XAML file paths.

As Paul points out, there doesn't appear to be an easy way to locate the URI for a XAML file. 
Internally, the generated .g.cs makes use of the path, as shown in the following excerpt:

```csharp
public void InitializeComponent() 
{ 
  if (_contentLoaded) 
  { 
    return; 
  } 
  _contentLoaded = true; 
  System.Uri resourceLocater = new System.Uri("/PageCollection;component/pages/page1.xaml", System.UriKind.Relative); 
  #line 1 "..\..\..\Pages\Page1.xaml" 
  System.Windows.Application.LoadComponent(this, resourceLocater); 
  #line default 
  #line hidden 
}
```

But, how can we get our hands on it? What I've done is to incorporate the generation of XAML resource pack URIs into the T4 template I did a little while ago.

To demonstrate I have created a dummy `UserControl` in a subfolder in the sample application. (See Figure 1.)

![CSharpDesktopClrDemo](/assets/images/2009-11-25-CSharpDesktopClrDemo.png)

**Figure 1.** Dummy UserControl has a pack URI generated

The resulting output from the T4 template now enables us to determine the path to the XAML file in a safe way. The following excerpt shows the generated Pack URI:

```csharp
namespace CSharpDesktopClrDemo.XamlMetadata.Folder1.Folder2.Metadata
{
    /// <summary>Metadata for XAML UserControl1.xaml</summary>
    public static class UserControl1XamlMetadata
    {
            /// <summary>Resource pack URI for XAML file.</summary>
            public const string XamlPackUri 
                 = @"/DanielVaughan.MetaGen.Demo;component/Folder1/Folder2/UserControl1.xaml";
    }
}
```

Now we have this, we can write:

```csharp
Uri uri = new Uri(CSharpDesktopClrDemo.XamlMetadata.Folder1.Folder2.Metadata
                 .UserControl1XamlMetadata.XamlPackUri, UriKind.Relative);
var control = System.Windows.Application.LoadComponent(uri) 
       as DanielVaughan.MetaGen.Demo.Folder1.Folder2.UserControl1;
```

No more magic string pack URIs!

Download the template and sample application: [MetaGen_01_04.zip (393.35 kb)](/Downloads/MetaGen_01_04.zip)
