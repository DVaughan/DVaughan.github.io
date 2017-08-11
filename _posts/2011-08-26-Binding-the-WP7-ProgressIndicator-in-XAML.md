---
categories: Windows-Phone
---

Update:

Since first posting this article, a later version of the WP FCL the ProgressIndicator gained binding support. You can bind it in a page like so:

```xml
<shell:SystemTray.ProgressIndicator>

        <shell:ProgressIndicator IsIndeterminate="{Binding Busy}" 

                                 IsVisible="{Binding Busy}" 

                                 Text="{Binding Message}" />

</shell:SystemTray.ProgressIndicator>

```

 

The Mango beta of the Windows Phone 7 SDK sees the inclusion of a new way to display progress of asynchronous operations 
within the phone's system tray. This is done using the new `ProgressIndicator` class, which is a `DependencyObject` that hooks in to the native progress bar 
in the system tray, and allows you to display text message in the system tray, along with allowing you to control the progress bar that can handle both determinate and indeterminate states.

While the `ProgressIndicator` supports data-binding, the downside is that bindings need to be set up in the page code-beside; 
which is not very elegant. See the following example of a page constructor wiring up a `ProgressIndicator`:

 
```csharp
public FooView()
{
    InitializeComponent();

    DataContext = new FooViewModel();

    Loaded += (o, args) =>
    {
        var progressIndicator = SystemTray.ProgressIndicator;

        if (progressIndicator != null)
        {
            return;
        }

        progressIndicator = new ProgressIndicator();

        SystemTray.SetProgressIndicator(this, progressIndicator);

        Binding binding = new Binding("Busy") { Source = ViewModel };

        BindingOperations.SetBinding(
            progressIndicator, ProgressIndicator.IsVisibleProperty, binding);

        binding = new Binding("Busy") { Source = ViewModel };

        BindingOperations.SetBinding(
            progressIndicator, ProgressIndicator.IsIndeterminateProperty, binding);

        binding = new Binding("Message") { Source = ViewModel };

        BindingOperations.SetBinding(
            progressIndicator, ProgressIndicator.TextProperty, binding);
    };

}
```
 

While completing my latest chapter of Windows Phone 7 Unleashed, on local databases, 
I spent a few minutes writing a wrapper for the `ProgressIndicator`. The `ProgressIndicatorProxy`, as it's called, can be placed in XAML, and doesn't rely on any code-beside:

```xml
<Grid x:Name="LayoutRoot" Background="Transparent">
    <u:ProgressIndicatorProxy IsIndeterminate="{Binding Indeterminate}" 
                                Text="{Binding Message}" 
                                Value="{Binding Progress}" />
</Grid>
 ```

The element itself has no visibility; its task is to attach a `ProgressIndicator` to the system tray, and to provide bindable properties that flow through to the `ProgressIndicator` instance.

When the element's Loaded event is raised, it instantiates a `ProgressIndicator`, assigns it to the system tray, and binds its properties to the `ProgressIndicatorProxy` objects properties. 
The class is shown in the following excerpt:

```csharp
public class ProgressIndicatorProxy : FrameworkElement
{
    bool loaded;

    public ProgressIndicatorProxy()
    {
        Loaded += OnLoaded;
    }

    void OnLoaded(object sender, RoutedEventArgs e)
    {
        if (loaded)
        {
            return;
        }

        Attach();

        loaded = true;
    }

    public void Attach()
    {
        if (DesignerProperties.IsInDesignTool)
        {
            return;
        }

        var page = this.GetVisualAncestors<PhoneApplicationPage>().First();

        var progressIndicator = SystemTray.ProgressIndicator;
        if (progressIndicator != null)
        {
            return;
        }

        progressIndicator = new ProgressIndicator();

        SystemTray.SetProgressIndicator(page, progressIndicator);

        Binding binding = new Binding("IsIndeterminate") { Source = this };
        BindingOperations.SetBinding(
            progressIndicator, ProgressIndicator.IsIndeterminateProperty, binding);

        binding = new Binding("IsVisible") { Source = this };
        BindingOperations.SetBinding(
            progressIndicator, ProgressIndicator.IsVisibleProperty, binding);

        binding = new Binding("Text") { Source = this };
        BindingOperations.SetBinding(
            progressIndicator, ProgressIndicator.TextProperty, binding);

        binding = new Binding("Value") { Source = this };
        BindingOperations.SetBinding(
            progressIndicator, ProgressIndicator.ValueProperty, binding);
    }

    #region IsIndeterminate

    public static readonly DependencyProperty IsIndeterminateProperty
        = DependencyProperty.RegisterAttached(
            "IsIndeterminate",
            typeof(bool),
            typeof(ProgressIndicatorProxy), new PropertyMetadata(false));

    public bool IsIndeterminate
    {
        get
        {
            return (bool)GetValue(IsIndeterminateProperty);
        }
        set
        {
            SetValue(IsIndeterminateProperty, value);
        }
    }

    #endregion

    #region IsVisible

    public static readonly DependencyProperty IsVisibleProperty
        = DependencyProperty.RegisterAttached(
            "IsVisible",
            typeof(bool),
            typeof(ProgressIndicatorProxy), new PropertyMetadata(true));

    public bool IsVisible
    {
        get
        {
            return (bool)GetValue(IsVisibleProperty);
        }
        set
        {
            SetValue(IsVisibleProperty, value);
        }
    }

    #endregion

    #region Text

    public static readonly DependencyProperty TextProperty
        = DependencyProperty.RegisterAttached(
            "Text",
            typeof(string),
            typeof(ProgressIndicatorProxy), new PropertyMetadata(string.Empty));

    public string Text
    {
        get
        {
            return (string)GetValue(TextProperty);
        }
        set
        {
            SetValue(TextProperty, value);
        }
    }

    #endregion

    #region Value

    public static readonly DependencyProperty ValueProperty
        = DependencyProperty.RegisterAttached(
            "Value",
            typeof(double),
            typeof(ProgressIndicatorProxy), new PropertyMetadata(0.0));

    public double Value
    {
        get
        {
            return (double)GetValue(ValueProperty);
        }
        set
        {
            SetValue(ValueProperty, value);
        }
    }

    #endregion
}
```

The sample code included with this post, contains a viewmodel with three properties, as listed:

* `Indeterminate`: a Boolean that provides the `IsIndeterminate` value of the `ProgressIndicator`.
* `Progress`: a double that is the source property of the Value property of the ProgressIndicator. This takes effect when the ProgressIndicator.IsIndeterminate property is true.
* `Message`: a string value displayed via the ProgressIndicator.

The page is bound to an instance of the `MainPageViewModel`. The `ProgressIndicatorProxy` binds to the three viewmodel properties. 
In addition, a `ToggleSwitch` is used to control the indeterminate state of the `ProgressIndicator` via the `Indeterminate` property in the viewmodel, 
and a `Slider` controls the `ProgressIndicator`'s `Value` property in the same manner. See the following excerpt:

```xml
<u:ProgressIndicatorProxy IsIndeterminate="{Binding Indeterminate}" 
                            Text="{Binding Message}" 
                            Value="{Binding Progress}" />

<Grid x:Name="ContentPanel" Grid.Row="1" Margin="12,0,12,0">
    <StackPanel>
        <toolkit:ToggleSwitch 
            IsChecked="{Binding Indeterminate, Mode=TwoWay}" 
            Header="Indeterminate" />

        <Slider Value="{Binding Progress, Mode=TwoWay}"
                Maximum="1" LargeChange=".2" />
    </StackPanel>
</Grid>
```

The sample page is shown in Figure 1.

![Screenshot](/assets/images/2011-08-26-Screenshot.png)

**Figure 1.** ProgressIndicator is controlled via a XAML binding.


Note that there is no requirement to use the MVVM infrastructure located in the sample. 
And that the `ProgressIndicatorProxy` is entirely independent. 
I will, however, be releasing Calcium for Windows Phone 7 soon, which contains a cavalcade of useful components for building MVVM apps for WP7.

The custom `ProgressIndicatorProxy` provides a simple way to harness the new `ProgressIndicator` from your XAML. I hope you find it useful.

[ProgressIndicatorProxyExample.zip (767.78 kb)](/Downloads/ProgressIndicatorProxyExample.zip)