Yesterday, while chatting with the talented [Jeremiah Morrill](http://jmorrill.hjtcentral.com/) and other [WPF Disciples](http://wpfdisciples.wordpress.com/) 
about some MVVM subtleties (for the full post see [here](http://groups.google.com/group/wpf-disciples/browse_thread/thread/32adf5457bb1f004)), Jeremiah briefly touched 
on the topic of providing ViewModels with the awareness of being active or inactive within a Prism based application. 
I wanted to explore this further, and decided to integrate this functionality into [Calcium](http://www.calciumsdk.net/). 
What I provide here isn't rocket science, and merely serves to illustrate one of indeed many design approaches that could be applied to accomplish the same thing.

For this I had two goals. The first, to provide the capability without coupling the ViewModel to the View. That is, without requiring the ViewModel to have a reference to the View. The second, to not depend on a base class for the functionality; forever tying the developer to my base class implementation (ViewModelBase). So, indeed, I chose an interface based approach. To be Prism-esque I have adapted Jeremiah's approach which was to implement Prism's IActiveAware interface on my base view class. I then feed an intermediary object to the ViewModel via an interface named IViewAware. The intermediary object is an instance of ActiveAwareUIElementAdapter. This class is used to provide a UIElement instance with Prisms IActiveAware interface. It does so by monitoring its Got and LostFocus events.

 

## ActiveAwareUIElementAdapter
 
```csharp
/// <summary>
/// Wraps a <see cref="UIElement"/> to provide an <see cref="IActiveAware"/>
/// implementation based on its focus state.
/// </summary>
public class ActiveAwareUIElementAdapter : IActiveAware
{
    bool active;

    public ActiveAwareUIElementAdapter(UIElement uiElement)
    {
        ArgumentValidator.AssertNotNull(uiElement, "uiElement");
        uiElement.GotFocus += OnGotFocus;
        uiElement.LostFocus += OnLostFocus;
    }

    void OnLostFocus(object sender, RoutedEventArgs e)
    {
        IsActive = false;
    }

    void OnGotFocus(object sender, RoutedEventArgs e)
    {
        IsActive = true;
    }

    public bool IsActive
    {
        get
        {
            return active;
        }
        set
        {
            if (active != value)
            {
                active = value;
            }
            OnIsActiveChanged(EventArgs.Empty);
        }
    }

    #region event IsActiveChanged

    event EventHandler isActiveChanged;

    public event EventHandler IsActiveChanged
    {
        add
        {
            isActiveChanged += value;
        }
        remove
        {
            isActiveChanged -= value;
        }
    }

    protected void OnIsActiveChanged(EventArgs e)
    {
        if (isActiveChanged != null)
        {
            isActiveChanged(this, e);
        }
    }

    #endregion
}
```

We then use this class within any `IView` `UIElement` implementation, but in particular the base `ViewControl` class. 
We instantiate the `ActiveAwareUIElement` adapter within the view's constructor, and pass it the instance of the view itself. 
The `ActiveAwareUIElement` then simply subscribes to the GotFocus and LostFocus events of the view, which is of course a UIElement.

 
## ViewControl Implementation
 
```csharp
/// <summary>
/// The base class for <see cref="IView"/>s.
/// </summary>
public class ViewControl : UserControl, IView, IActiveAware /* (not abstract for Blendability) */
{
    #region ViewModel Dependency Property

    public static DependencyProperty ViewModelProperty = DependencyProperty.Register(
        "ViewModel", typeof(IViewModel), typeof(ViewControl), new PropertyMetadata(null, OnViewModelChanged));

    static void OnViewModelChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        var viewControl = (ViewControl)d;
        viewControl.SetViewAwareAssociations((IViewModel)e.OldValue, (IViewModel)e.NewValue);
    }

    [Description("The view model for this view.")]
#if !SILVERLIGHT
    [Browsable(true)]
    [DesignerSerializationVisibility(DesignerSerializationVisibility.Visible)]
#endif
    public IViewModel ViewModel
    {
        get
        {
            return (IViewModel)GetValue(ViewModelProperty);
        }
        set
        {
            SetValue(ViewModelProperty, value);
        }
    }

    #endregion

    /// <summary>
    /// Initializes a new instance of the <see cref="ViewControl"/> class.
    /// </summary>
    public ViewControl()
    {
        Loaded += OnLoaded;
        activeAwareUIElementAdapter = new ActiveAwareUIElementAdapter(this); 
    }

    bool alreadyLoaded;

    void OnLoaded(object sender, RoutedEventArgs e)
    {
        if (!alreadyLoaded)
        {
            alreadyLoaded = true;
            OnViewLoaded(e);
        }
    }

    #region ViewLoaded event

    event EventHandler<EventArgs> viewLoaded;

    /// <summary>
    /// Occurs when the view has been loaded.
    /// </summary>
    public event EventHandler<EventArgs> ViewLoaded
    {
        add
        {
            viewLoaded += value;
        }
        remove
        {
            viewLoaded -= value;
        }
    }

    /// <summary>
    /// Closes the view.
    /// </summary>
    /// <param name="force">if set to <c>true</c> the control will be forced
    /// to close even if e.g., there is unsaved data and the user chooses 
    /// to cancel the closure.</param>
    /// <returns></returns>
    public virtual bool Close(bool force)
    {
        var viewService = ServiceLocatorSingleton.Instance.GetInstance<IViewService>();
        return viewService.CloseView(this, force);
    }

    /// <summary>
    /// Raises the <see cref="E:ViewLoaded"/> event.
    /// </summary>
    /// <param name="e">The <see cref="System.EventArgs"/> instance containing the event data.</param>
    protected void OnViewLoaded(EventArgs e)
    {
        if (viewLoaded != null)
        {
            viewLoaded(this, e);
        }
    }
    #endregion

    /// <summary>
    /// Gets a value indicating whether the control is in a designer.
    /// </summary>
    /// <value><c>true</c> if design time; otherwise, <c>false</c>.</value>
    protected bool DesignTime
    {
        get
        {
            return DesignerProperties.GetIsInDesignMode(this);
        }
    }

    #region IActiveAware and related

    void SetViewAwareAssociations(IViewModel oldViewModel, IViewModel newViewModel)
    {
        var oldViewAware = oldViewModel as IViewAware;
        var newViewAware = newViewModel as IViewAware;
        if (oldViewAware != null)
        {
            oldViewAware.DetachActiveAware();
        }

        if (newViewAware != null)
        {
            newViewAware.Attach(activeAwareUIElementAdapter);
        }
    }

    readonly ActiveAwareUIElementAdapter activeAwareUIElementAdapter;

    bool IActiveAware.IsActive
    {
        get
        {
            return activeAwareUIElementAdapter.IsActive;
        }
        set
        {
            activeAwareUIElementAdapter.IsActive = value;
        }
    }

    event EventHandler IActiveAware.IsActiveChanged
    {
        add
        {
            activeAwareUIElementAdapter.IsActiveChanged += value;
        }
        remove
        {
            activeAwareUIElementAdapter.IsActiveChanged -= value;
        }
    }

    #endregion
}
```

We see that the dependency property `ViewModel`, when changed, prompts the attachment of the `ActiveAwareUIElement` instance to the `ViewModel`. 
The mechanism for performing this is via the `IViewAware` implementation. If an `IViewModel` wishes to be aware of its view's state, in particular when it becomes active or inactive; 
without having to have a direct reference to the view, then it can implement the `IViewAware` interface.

 

## IViewAware Interface

```csharp
/// <summary>
/// Provides for advanced presentation behaviour in a <see cref="IViewModel"/>s.
/// </summary>
public interface IViewAware
{
    /// <summary>
    /// Attaches the specified active aware instance so that changes in the <see cref="IActiveAware.IsActive"/>
    /// state can be monitored.
    /// </summary>
    /// <param name="activeAware">The active aware.</param>
    void Attach(IActiveAware activeAware);

    /// <summary>
    /// Detaches the active aware instance. Changes in the <see cref="IActiveAware.IsActive"/>
    /// state will no longer be monitored.
    /// </summary>
    void DetachActiveAware();
}
The ViewModel base class implementation is provided next in full:

/// <summary>
/// A base implementation of the <see cref="IViewModel"/> interface.
/// </summary>
public abstract class ViewModelBase : IViewModel, INotifyPropertyChanged, IViewAware
{
    IActiveAware activeAwareInstance;

    protected ViewModelBase()
    {
        notifier = new PropertyChangeNotifier(this);
    }

    #region Title Property

    object title;

    [Description("The text to display on a tab.")]
#if !SILVERLIGHT
    [Browsable(true)]
    [DesignerSerializationVisibility(DesignerSerializationVisibility.Visible)]
#endif        
    public object Title
    {
        get
        {
            return title;
        }
        set
        {
            notifier.Assign("Title", ref title, value);
        }
    }

    #endregion

    #region Property Change Notification
    readonly PropertyChangeNotifier notifier;

    protected PropertyChangeNotifier Notifier
    {
        get
        {
            return notifier;
        }
    }

    public event PropertyChangedEventHandler PropertyChanged
    {
        add
        {
            notifier.PropertyChanged += value;
        }
        remove
        {
            notifier.PropertyChanged -= value;
        }
    }

    protected AssignmentResult Assign<TProperty>(
        string propertyName, ref TProperty property, TProperty newValue)
    {
        return notifier.Assign(propertyName, ref property, newValue);
    }

    #endregion

    #region Active Aware

    void IViewAware.Attach(IActiveAware activeAware)
    {
        ReplaceActiveAware(activeAware);
    }

    void IViewAware.DetachActiveAware()
    {
        ReplaceActiveAware(null);
    }

    void ReplaceActiveAware(IActiveAware activeAwareInstance)
    {
        if (this.activeAwareInstance != null)
        {
            this.activeAwareInstance.IsActiveChanged -= OnIsActiveChanged;
        }
        this.activeAwareInstance = activeAwareInstance;
        if (activeAwareInstance != null)
        {
            activeAwareInstance.IsActiveChanged += OnIsActiveChanged;
        }
    }

    bool lastActiveState;

    void OnIsActiveChanged(object sender, EventArgs e)
    {
        Notifier.NotifyChanged("Active", lastActiveState, Active);
        lastActiveState = Active;
    }

    /// <summary>
    /// Gets a value indicating whether this instance is being notified 
    /// of when it becomes active or inactive, 
    /// this may occur for example when its view gains focus or loses focus.
    /// </summary>
    /// <value><c>true</c> if monitoring the active state 
    /// of its view; otherwise, <c>false</c>.</value>
    public bool ActiveAware
    {
        get
        {
            return activeAwareInstance != null;
        }
    }

    /// <summary>
    /// Gets a value indicating whether this <see cref="ViewModelBase"/> 
    /// is active within the user interface.
    /// </summary>
    /// <value><c>true</c> if active; otherwise, <c>false</c>.</value>
    public bool Active
    {
        get
        {
            return activeAwareInstance != null ? activeAwareInstance.IsActive : false;
        }
    }

    #endregion

    public override string ToString()
    {
        return title != null ? title.ToString() : base.ToString();
    }
}
```

So there it is. Just one way to provide a ViewModel with active awareness. 
Please be aware that this code is preliminary and may be subject to change. 
The full source code will be available via the [Calcium source download](http://www.calciumsdk.net/Source.aspx) page soon.

Thanks to Kent Boogaart for his post on [MVVM Infrastructure ActiveAwareCommand](http://kentb.blogspot.com/2009/05/mvvm-infrastructure-activeawarecommand.html) 
from which the `ActiveAwareUIElementAdapter` was inspired.