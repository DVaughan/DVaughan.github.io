---
categories: XAML
---

## Introduction
Prompted by a recent comment on the T4 Metadata Generation template article, which I released some weeks ago, I have implemented a new mechanism for concatenating property paths. This allows compile time validation of properties that exist on composite or nested members.

## Background

Previously I have demonstrated how generated metadata can be used to provide compile-time validation of binding expressions. Rather than using string literals in binding expressions, one is able to use the x:Static markup extension and a T4 generated constant to indicate the binding path; as shown in the following excerpt.

<Label Content="{Binding Path={x:Static Metadata:PersonMetadata.NamePath}}"/>
Overcoming Limitations
This approach works fine when targeting a property from a single instance in a DataContext, but what happens when we wish to target a nested instance's property? For example, and as demonstrated in the downloadable sample from the article mentioned above, if we have a ListBox populated with Person instances, and we wish to bind a label to the listbox's SelectedItem.Address.StreetAddress property, we can do so using the following XAML:

<ListBox x:Name="listBox" Background="Black">
  <ListBox.ItemTemplate>
    <DataTemplate>
      <StackPanel Orientation="Horizontal">
        <Label Content="{Binding Path={x:Static Metadata:PersonMetadata.NamePath}}"/>
      </StackPanel>
    </DataTemplate>
  </ListBox.ItemTemplate>
</ListBox>
<Label Content="{Binding ElementName=listBox, 
    Path={Demo:JoinPath 
                SelectedItem, 
                {x:Static Metadata:PersonMetadata.Address}, 
                {x:Static Metadata:AddressMetadata.StreetLine}}}"/>
Here we see a custom MarkupExtension called JoinPathExtension is used to enable the concatenation of path strings to create a PropertyPath that is used to target the nested Address instance. 
In this case, the string values of 'SelectedItem', 'Address', and 'StreetLine' combine to produce a PropertyPath 'SelectedItem.Address.StreetLine'.

You will notice, when you open the CS Window1.xaml file in the sample download, that errors are reported for the Path expressions. These don't prevent the designer from loading in either Visual Studio or Blend. They are, however, annoying.

![Error List](/assets/images/2009-11-07-ErrorList.png)

**Figure 1.** Visual Studio Xaml designer errors.

Attempting to resolve this issue I switched to using named arguments. No luck there either I'm afraid, with the x:Static expression resulting in a compile time error:

(Unknown property 'Converter' for type 'MS.Internal.Markup.MarkupExtensionParser+UnknownMarkupExtension' encountered while parsing a Markup Extension. Line x position Y)

My fellow disciple Philipp Sumi has a great post outlining the VS designer bug. 

I have experimented with a number of approaches, including (as Philipp suggests) explicit property syntax, and have settled on the one shown above.

The main parts of the JoinPathExtension are shown:

**CS:**

```csharp
/// <summary>
/// Allows a set of property path strings to be concatenates 
/// into a <see cref="PropertyPath"/> instance.
/// </summary>
[MarkupExtensionReturnType(typeof(PropertyPath))]
public class JoinPathExtension : MarkupExtension
{
  readonly List<string> members = new List<string>(); 
 
  public JoinPathExtension()
  {
    /* Intentionally left blank. */
  }
 
  public JoinPathExtension(string member0)
  {
    if (member0 == null)
    {
      throw new ArgumentNullException("member0");
    }
    members.Add(member0);
  }
 
  public JoinPathExtension(string member0, string member1)
    : this(member0)
  {
    if (member1 == null)
    {
      throw new ArgumentNullException("member1");
    }
    members.Add(member1);
  }
 
  public override object ProvideValue(IServiceProvider serviceProvider)
  {
    var path = string.Join(".", members.ToArray());
    var result = new PropertyPath(path);
    return result;
  }
 
  void SetMember(int index, string value)
  {
    if (value == null)
    {
      throw new ArgumentNullException("value");
    }
    if (members.Count < index + 1)
    {
      members.Add(value);
      return;
    }
    members[index] = value;
  }
 
  #region Named member properties
  [ConstructorArgument("member0")]
  public string Member0
  {
    get
    {
      return members[0];
    }
    set
    {
      SetMember(0, value);
    }
  }
 
  public string Member1
  {
    get
    {
      return members[1];
    }
    set
    {
      SetMember(1, value);
    }
  } 
}
```

**VB.NET:**
```vb
Imports System.Windows.Markup

Public Class JoinPathExtension
    Inherits MarkupExtension
    ' Methods
    Public Sub New()
        Me.members = New List(Of String)
    End Sub

    Public Sub New(ByVal memberList As String())
        Me.members = New List(Of String)
        If (memberList Is Nothing) Then
            Throw New ArgumentNullException("memberList")
        End If
        Me.members.AddRange(memberList)
    End Sub

    Public Sub New(ByVal member1 As String)
        Me.members = New List(Of String)
        If (member1 Is Nothing) Then
            Throw New ArgumentNullException("member1")
        End If
        Me.members.Add(member1)
    End Sub

    Public Sub New(ByVal member1 As String, ByVal member2 As String)
        Me.New(member1)
        If (member2 Is Nothing) Then
            Throw New ArgumentNullException("member2")
        End If
        Me.members.Add(member2)
    End Sub

    Public Overrides Function ProvideValue(ByVal serviceProvider As IServiceProvider) As Object
        Return New PropertyPath(String.Join(".", Me.members.ToArray), New Object(0 - 1) {})
    End Function


    ' Properties
    <ConstructorArgument("member1")> _
    Public Property Member() As String
        Get
            Return Me.members.Item(0)
        End Get
        Set(ByVal value As String)
            If (value Is Nothing) Then
                Throw New ArgumentNullException("value")
            End If
            If (Me.members.Count < 1) Then
                Me.members.Add(value)
            Else
                Me.members.Item(0) = value
            End If
        End Set
    End Property

    <ConstructorArgument("member2")> _
    Public Property Member2() As String
        Get
            Return Me.members.Item(1)
        End Get
        Set(ByVal value As String)
            If (value Is Nothing) Then
                Throw New ArgumentNullException("value")
            End If
            If (Me.members.Count < 2) Then
                Me.members.Add(value)
            Else
                Me.members.Item(1) = value
            End If
        End Set
    End Property


    ' Fields
    Private ReadOnly members As List(Of String)
End Class
```

## Conclusion

We have seen how by using a custom `MarkupExtension` we are able to concatenate generated property name constants to produce `PropertyPaths`, 
which can be consumed by `Path` binding expressions. Having the capability to join path expression adds a lot to the flexibility 
of the generated metadata approach. We are now able to fully express property paths for nested objects in binding expressions, 
without resorting to string literals; increasing dramatically the flexibility of this approach.

Download the sample code from [here](http://www.codeproject.com/KB/codegen/T4Metadata.aspx).
