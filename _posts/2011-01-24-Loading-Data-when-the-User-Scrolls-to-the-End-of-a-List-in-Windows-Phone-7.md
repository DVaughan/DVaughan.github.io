---
categories: Windows-Phone
redirect_from:
 - /post/Scroll-Based-Data-Loading-in-Windows-Phone-7.aspx.html
 - /post/Loading-Data-when-the-User-Scrolls-to-the-End-of-a-List-in-Windows-Phone-7.aspx.html
---

Most phone users are concerned about network usage. Network traffic comes at a premium, 
and a user's perception of the quality of your app depends a lot on its responsiveness. 
When it comes to fetching data from a network service, it should be done in the most efficient manner possible. 
Making the user wait while your app downloads giant reams of data doesn't cut it. It should, instead, be done in bite-sized chunks.

To make this easy for you, I have created a `ScrollViewerMonitor` which uses an attached property to monitor a `ListBox` 
and fetch data as the user needs it. It's as simple as adding an attached property to a control which contains a `ScrollViewer`, such as a ListBox, as shown in the following example:

```xml
<ListBox ItemsSource="{Binding Items}"
         u:ScrollViewerMonitor.AtEndCommand="{Binding FetchMoreDataCommand}" />
```

Notice the `AtEndCommand`. That's an attached property that allows you to specify a command to be executed 
when the user scrolls to the end of the list. Easy huh! I'll explain in a moment how this is accomplished, but first some background.

## Background

For almost the last year, I've been building infrastructure for WP7 development. 
A lot has been going into the book I am writing, and even more is making its way into the upcoming Calcium for Windows Phone. 
I am pretty much at bursting point; wanting to get this stuff out there.

The chapter of Windows Phone 7 Unleashed, which discusses this code, demonstrates an Ebay search app that makes use of the Ebay OData feed (see Figure 1). 
It's simple, yet shows off some really nice techniques for handling asynchronous network calls.

![Ebay Scroll Page](/assets/images/2011-01-24-EbayApp.jpg)

**Figure 1.** The Ebay Seach app from Windows Phone 7 Unleashed.
 

The Ebay app isn't in the downloadable code for this post. There is, however, a simpler app that displays a list of numbers instead.

The way the `ScrollViewerMonitor` works is by retrieving the first child `ScrollViewer` control from its target (a `ListBox` in this case). 
It then listens to its VerticalOffset property for changes. When a change occurs, and the ScrollableHeight of the scrollViewer is the same as the VerticalOffset, the AtEndCommand is executed.

```csharp
public class ScrollViewerMonitor
{
    public static DependencyProperty AtEndCommandProperty
        = DependencyProperty.RegisterAttached(
            "AtEndCommand", typeof(ICommand),
            typeof(ScrollViewerMonitor),
            new PropertyMetadata(OnAtEndCommandChanged));
 
    public static ICommand GetAtEndCommand(DependencyObject obj)
    {
        return (ICommand)obj.GetValue(AtEndCommandProperty);
    }
 
    public static void SetAtEndCommand(DependencyObject obj, ICommand value)
    {
        obj.SetValue(AtEndCommandProperty, value);
    }
 
 
    public static void OnAtEndCommandChanged(
        DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        FrameworkElement element = (FrameworkElement)d;
        if (element != null)
        {
            element.Loaded -= element_Loaded;
            element.Loaded += element_Loaded;
        }
    }
 
    static void element_Loaded(object sender, RoutedEventArgs e)
    {
        FrameworkElement element = (FrameworkElement)sender;
        element.Loaded -= element_Loaded;
        ScrollViewer scrollViewer = FindChildOfType<ScrollViewer>(element);
        if (scrollViewer == null)
        {
            throw new InvalidOperationException("ScrollViewer not found.");
        }
 
        var listener = new DependencyPropertyListener();
        listener.Changed
            += delegate
            {
                bool atBottom = scrollViewer.VerticalOffset
                                    >= scrollViewer.ScrollableHeight;
 
                if (atBottom)
                {
                    var atEnd = GetAtEndCommand(element);
                    if (atEnd != null)
                    {
                        atEnd.Execute(null);
                    }                    
                }
            };
        Binding binding = new Binding("VerticalOffset") { Source = scrollViewer };
        listener.Attach(scrollViewer, binding);
    }
  
    static T FindChildOfType<T>(DependencyObject root) where T : class
    {
        var queue = new Queue<DependencyObject>();
        queue.Enqueue(root);
 
        while (queue.Count > 0)
        {
            DependencyObject current = queue.Dequeue();
            for (int i = VisualTreeHelper.GetChildrenCount(current) - 1; 0 <= i; i--)
            {
                var child = VisualTreeHelper.GetChild(current, i);
                var typedChild = child as T;
                if (typedChild != null)
                {
                    return typedChild;
                }
                queue.Enqueue(child);
            }
        }
        return null;
    }
}
```

Of course there is a little hocus pocus that goes on behind the scenes. 
The `VerticalOffset` property is a dependency property, and to monitor it for changes I've borrowed some of [Pete Blois's](http://blois.us/blog/2009/04/datatrigger-bindings-on-non.html) code, 
which allows us to track any dependency property for changes. This class is called `BindingListener` and is in the downloadable sample code.

## Sample Code

The ViewModel for the `MainPage` contains a `FetchMoreDataCommand`. When executed, this command sets a `Busy` flag, and waits a little while, 
then adds some more items to the `ObservableCollection` that the `ListBox` in the view is data-bound too.

```csharp
public class MainPageViewModel : INotifyPropertyChanged
{
    public MainPageViewModel()
    {
        AddMoreItems();
 
        fetchMoreDataCommand = new DelegateCommand(
            obj =>
                {
                    if (busy)
                    {
                        return;
                    }
                    Busy = true;
                    ThreadPool.QueueUserWorkItem(
                        delegate
                        {
                            /* This is just to demonstrate a slow operation. */
                            Thread.Sleep(3000);
                            /* We invoke back to the UI thread. 
                                * Ordinarily this would be done 
                                * by the Calcium infrastructure automatically. */
                            Deployment.Current.Dispatcher.BeginInvoke(
                                delegate
                                {
                                    AddMoreItems();
                                    Busy = false;
                                });
                        });
                    
            });
    }
 
    void AddMoreItems()
    {
        int start = items.Count;
        int end = start + 10;
        for (int i = start; i < end; i++)
        {
            items.Add("Item " + i);
        }
    }
 
    readonly DelegateCommand fetchMoreDataCommand;
 
    public ICommand FetchMoreDataCommand
    {
        get
        {
            return fetchMoreDataCommand;
        }
    }
 
    readonly ObservableCollection<string> items = new ObservableCollection<string>();
 
    public ObservableCollection<string> Items
    {
        get
        {
            return items;
        }
    }
 
    bool busy;
 
    public bool Busy
    {
        get
        {
            return busy;
        }
        set
        {
            if (busy == value)
            {
                return;
            }
            busy = value;
            OnPropertyChanged(new PropertyChangedEventArgs("Busy"));
        }
    }
 
    public event PropertyChangedEventHandler PropertyChanged;
 
    protected virtual void OnPropertyChanged(PropertyChangedEventArgs e)
    {
        var tempEvent = PropertyChanged;
        if (tempEvent != null)
        {
            tempEvent(this, e);
        }
    }
}
```

There's a lot more infrastructure provided with the book code. I tried, however, to slim everything down for this post. 
The MainPage.xaml contains a Grid with a ProgressBar, whose visbility depends on the Busy property of the viewmodel.

```xml
<Grid x:Name="ContentPanel" Grid.Row="1" Margin="12,0,12,0">
    <Grid.RowDefinitions>
        <RowDefinition Height="*" />
        <RowDefinition Height="Auto" />
    </Grid.RowDefinitions>
    <ListBox ItemsSource="{Binding Items}"
                u:ScrollViewerMonitor.AtEndCommand="{Binding FetchMoreDataCommand}">
        <ListBox.ItemTemplate>
            <DataTemplate>
                <StackPanel Orientation="Horizontal">
                    <Image Source="Images/WindowsPhoneExpertsLogo.jpg" 
                            Margin="10" />
                    <TextBlock Text="{Binding}" 
                                Style="{StaticResource PhoneTextTitle2Style}"/>                            
                </StackPanel>
            </DataTemplate>
        </ListBox.ItemTemplate>
    </ListBox>
    <Grid Grid.Row="1"
            Visibility="{Binding Busy, 
                Converter={StaticResource BooleanToVisibilityConverter}}">
        <Grid.RowDefinitions>
            <RowDefinition />
            <RowDefinition />
        </Grid.RowDefinitions>
        <TextBlock Text="Loading..." 
                    Style="{StaticResource LoadingStyle}"/>
        <ProgressBar IsIndeterminate="{Binding Busy}"
                        VerticalAlignment="Bottom"
                        Grid.Row="1" />
    </Grid>
</Grid>
```

You may be wondering why there is a databinding for `ProgressBar`'s `IsIndeterminate` property. 
This is for performance reasons, as when indeterminate the `ProgressBar` is notorious 
for consuming CPU. Check out [Jeff Wilcox's blog](http://www.jeff.wilcox.name/2010/08/performanceprogressbar/) for a solution.

Now, when the user scrolls to the bottom of the list, the `FetchMoreDataCommand` is executed, providing an opportunity to call some network service asynchronously (see Figure 2).

![Loading message is displayed when the user scrolls to the end of the list](/assets/images/2011-01-24-ScrollPage.jpg)

Figure 2: Loading message is displayed when the user scrolls to the end of the list.

I hope you enjoyed this post, and that you find the attached code useful.