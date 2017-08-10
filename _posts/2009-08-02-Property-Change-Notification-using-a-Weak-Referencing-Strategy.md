## Features

* Desktop and Silverlight CLR compatibility
* Capability to perform assignment and raise appropriate events before and after assignment.
* Weak referenced
* Provides for both expression tree and loosely typed strings
* Uses extended EventArgs to supply before and after values
* Extended PropertyChangingEventArgs for cancellable changes
* Configurable to use caching of EventArgs to decrease heap fragmentation
* Comes with unit tests for Desktop and Silverlight CLRs

## Introduction

`INotifyPropertyChanged` is a ubiquitous part of Silverlight and WPF programming. 
It is used extensively in WPF and Silverlight to enable non-DependencyObjects to signal that a bound value is out of date. 
I've seen many approaches that have been used in order to remove the property name string requirement. 
Some have employed lambda expressions, or walking the stack, while others have used generated proxies or AOP point cuts. 
This post and the accompanying code are not so much about ridding us from the loosely typed string, although I do provide the means 
if you don't mind a performance hit. Today there is another code smell that I would like to address, and it is the use of base classes for property change notification.

In this post I will demonstrate how we are able to encapsulate two property change interface implementations (`INotifyPropertyChanged` and `INotifyPropertyChanging`) 
in a reusable class, and in a weak referencing manner to avoid any possible leakage.

Using a base class implementation for `INotifyPropertyChanged` has never sat easy with me. 
It probably goes back to early 2003 after reading Juval Lowy's landmark book Programming .NET Components. 
The principal of favouring aggregation over inheritance is a driver for creating shallow class hierarchies and maintainable components. It is a principal that offers many advantages, and one that I strongly recommend.

## Using the Library

`Calcium.ComponentModel.PropertyChangeNotifier` is the main class. You use it by creating a field in your owner class, and instanciating it within the owner's constructor. 
We apply the boiler plate code, which consists of a 'flow-through' interface implementation for either or both INotifyPropertyChanged and INotifyPropertyChanging.

An example is shown in the following excerpt.

```csharp
class MockNotifyPropertyChanged : INotifyPropertyChanged, INotifyPropertyChanging
{
    readonly PropertyChangeNotifier notifier;

    #region INotifyPropertyChanged Implementation
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
    #endregion

    #region INotifyPropertyChanging Implementation
    public event PropertyChangingEventHandler PropertyChanging
    {
        add
        {
            notifier.PropertyChanging += value;
        }
        remove
        {
            notifier.PropertyChanging -= value;
        }
    }
    #endregion

    public MockNotifyPropertyChanged()
    {
        notifier = new PropertyChangeNotifier(this);
    }

    int int1;

    public int TestPropertyAssigned
    {
        get
        {
            return int1;
        }
        set
        {
            notifier.Assign(
                "TestPropertyAssigned", ref int1, value);
        }
    }

    string string1;

    public string TestPropertyAssignedLambda
    {
        get
        {
            return string1;
        }
        set
        {
            notifier.Assign(
                (MockNotifyPropertyChanged mock) => mock.TestPropertyAssignedLambda, 
                ref string1, value);
        }
    }    
}
```

The two property examples shown, delegate the task of assigning the property to the `PropertyChangeNotifier`. This provides the `PropertyChangeNotifier` with the opportunity 
to raise the `PropertyChanging` event of the `INotifyPropertyChanging` interface, perform the assignment (or return if a handler called `Cancel()` on the `EventArgs`, 
then raise the `PropertyChangedEvent` from the `INotifyPropertyChanged` interface.

## Implementation

The following excerpt is taken from the `PropertyChangeNotifier` class. It contains both Silverlight and Desktop CLR specific sections.

```csharp
/// <summary>
/// This class provides an implementation of the <see cref="INotifyPropertyChanged"/>
/// and <see cref="INotifyPropertyChanging"/> interfaces. 
/// Extended <see cref="PropertyChangedEventArgs"/> and <see cref="PropertyChangingEventArgs"/>
/// are used to provides the old value and new value for the property. 
/// <seealso cref="PropertyChangedEventArgs{TProperty}"/>
/// <seealso cref="PropertyChangingEventArgs{TProperty}"/>
/// </summary>
#if !SILVERLIGHT
[Serializable]
#endif
public sealed class PropertyChangeNotifier : INotifyPropertyChanged, INotifyPropertyChanging
{
    readonly WeakReference ownerWeakReference;

    /// <summary>
    /// Gets the owner for testing purposes.
    /// </summary>
    /// <value>The owner.</value>
    internal object Owner
    {
        get
        {
            if (ownerWeakReference.Target != null)
            {
                return ownerWeakReference.Target;
            }
            return null;
        }
    }

    /// <summary>
    /// Initializes a new instance 
    /// of the <see cref="PropertyChangeNotifier"/> class.
    /// </summary>
    /// <param name="owner">The intended sender 
    /// of the <code>PropertyChanged</code> event.</param>
    public PropertyChangeNotifier(object owner) : this(owner, true)
    {
    }

    /// <summary>
    /// Initializes a new instance 
    /// of the <see cref="PropertyChangeNotifier"/> class.
    /// </summary>
    /// <param name="owner">The intended sender 
    /// <param name="useExtendedEventArgs">If <c>true</c> the
    /// generic <see cref="PropertyChangedEventArgs{TProperty}"/>
    /// and <see cref="PropertyChangingEventArgs{TProperty}"/> 
    /// are used when raising events. 
    /// Otherwise, the non-generic types are used, and they are cached 
    /// to decrease heap fragmentation.</param>
    /// of the <code>PropertyChanged</code> event.</param>
    public PropertyChangeNotifier(object owner, bool useExtendedEventArgs)
    {
        ArgumentValidator.AssertNotNull(owner, "owner");
        ownerWeakReference = new WeakReference(owner);
        this.useExtendedEventArgs = useExtendedEventArgs;
    }

    #region event PropertyChanged

#if !SILVERLIGHT
    [field: NonSerialized]
#endif
    event PropertyChangedEventHandler propertyChanged;

    /// <summary>
    /// Occurs when a property value changes.
    /// </summary>
    public event PropertyChangedEventHandler PropertyChanged
    {
        add
        {
            if (OwnerDisposed)
            {
                return;
            }
            propertyChanged += value;
        }
        remove
        {
            if (OwnerDisposed)
            {
                return;
            }
            propertyChanged -= value;
        }
    }

    /// <summary>
    /// Raises the <see cref="E:PropertyChanged"/> event.
    /// If the owner has been GC'd then the event will not be raised.
    /// </summary>
    /// <param name="e">The <see cref="System.ComponentModel.PropertyChangedEventArgs"/> 
    /// instance containing the event data.</param>
    void OnPropertyChanged(PropertyChangedEventArgs e)
    {
        var owner = ownerWeakReference.Target;
        if (owner != null && propertyChanged != null)
        {
            propertyChanged(owner, e);
        }
    }

    #endregion

    /// <summary>
    /// Assigns the specified newValue to the specified property
    /// and then notifies listeners that the property has changed.
    /// </summary>
    /// <typeparam name="TProperty">The type of the property.</typeparam>
    /// <param name="propertyName">Name of the property. Can not be null.</param>
    /// <param name="property">A reference to the property that is to be assigned.</param>
    /// <param name="newValue">The value to assign the property.</param>
    /// <exception cref="ArgumentNullException">
    /// Occurs if the specified propertyName is <code>null</code>.</exception>
    /// <exception cref="ArgumentException">
    /// Occurs if the specified propertyName is an empty string.</exception>
    public void Assign<TProperty>(
        string propertyName, ref TProperty property, TProperty newValue)
    {
        if (OwnerDisposed)
        {
            return;
        }

        ArgumentValidator.AssertNotNullOrEmpty(propertyName, "propertyName");
        ValidatePropertyName(propertyName);

        AssignWithNotificationAux(propertyName, ref property, newValue);
    }

    /// <summary>
    /// Slow. Not recommended.
    /// Assigns the specified newValue to the specified property
    /// and then notifies listeners that the property has changed.
    /// Assignment nor notification will occur if the specified
    /// property and newValue are equal. 
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <typeparam name="TProperty">The type of the property.</typeparam>
    /// <param name="expression">The expression that is used to derive the property name.
    /// Should not be <code>null</code>.</param>
    /// <param name="property">A reference to the property that is to be assigned.</param>
    /// <param name="newValue">The value to assign the property.</param>
    /// <exception cref="ArgumentNullException">
    /// Occurs if the specified propertyName is <code>null</code>.</exception>
    /// <exception cref="ArgumentException">
    /// Occurs if the specified propertyName is an empty string.</exception>
    public void Assign<T, TProperty>(
        Expression<Func<T, TProperty>> expression, ref TProperty property, TProperty newValue)
    {
        if (OwnerDisposed)
        {
            return;
        }

        string propertyName = GetPropertyName(expression);
        AssignWithNotificationAux(propertyName, ref property, newValue);
    }

    void AssignWithNotificationAux<TProperty>(
        string propertyName, ref TProperty property, TProperty newValue)
    {
        /* Boxing may occur here. We should consider 
         * providing some overloads for primitives. */
        if (Equals(property, newValue)) 
        {
            return;
        }

        if (useExtendedEventArgs)
        {
            var args = new PropertyChangingEventArgs<TProperty>(propertyName, property, newValue);

            OnPropertyChanging(args);
            if (args.Cancelled)
            {
                return;
            }

            var oldValue = property;
            property = newValue;
            OnPropertyChanged(new PropertyChangedEventArgs<TProperty>(
                propertyName, oldValue, newValue));
        }
        else
        {
            var args = RetrieveOrCreatePropertyChangingEventArgs(propertyName);
            OnPropertyChanging(args);

            var changedArgs = RetrieveOrCreatePropertyChangedEventArgs(propertyName);
            OnPropertyChanged(changedArgs);
        }
    }

    readonly Dictionary<string, string> expressions = new Dictionary<string, string>();

    /// <summary>
    /// Notifies listeners that the specified property has changed.
    /// </summary>
    /// <typeparam name="TProperty">The type of the property.</typeparam>
    /// <param name="propertyName">Name of the property. Can not be null.</param>
    /// <param name="oldValue">The old value before the change occured.</param>
    /// <param name="newValue">The new value after the change occured.</param>
    /// <exception cref="ArgumentNullException">
    /// Occurs if the specified propertyName is <code>null</code>.</exception>
    /// <exception cref="ArgumentException">
    /// Occurs if the specified propertyName is an empty string.</exception>
    public void NotifyChanged<TProperty>(
        string propertyName, TProperty oldValue, TProperty newValue)
    {
        if (OwnerDisposed)
        {
            return;
        }
        ArgumentValidator.AssertNotNullOrEmpty(propertyName, "propertyName");
        ValidatePropertyName(propertyName);

        if (ReferenceEquals(oldValue, newValue))
        {
            return;
        }

        var args = useExtendedEventArgs
            ? new PropertyChangedEventArgs<TProperty>(propertyName, oldValue, newValue)
            : RetrieveOrCreatePropertyChangedEventArgs(propertyName);

        OnPropertyChanged(args);
    }

    /// <summary>
    /// Slow. Not recommended.
    /// Notifies listeners that the property has changed.
    /// Notification will occur if the specified
    /// property and newValue are equal. 
    /// </summary>
    /// <param name="expression">The expression that is used to derive the property name.
    /// Should not be <code>null</code>.</param>
    /// <param name="oldValue">The old value of the property before it was changed.</param>
    /// <param name="newValue">The new value of the property after it was changed.</param>
    /// <exception cref="ArgumentNullException">
    /// Occurs if the specified propertyName is <code>null</code>.</exception>
    /// <exception cref="ArgumentException">
    /// Occurs if the specified propertyName is an empty string.</exception>
    public void NotifyChanged<T, TResult>(
        Expression<Func<T, TResult>> expression, TResult oldValue, TResult newValue)
    {
        if (OwnerDisposed)
        {
            return;
        }

        ArgumentValidator.AssertNotNull(expression, "expression");

        string name = GetPropertyName(expression);
        NotifyChanged(name, oldValue, newValue);
    }
    
    static MemberInfo GetMemberInfo<T, TResult>(Expression<Func<T, TResult>> expression)
    {
        var member = expression.Body as MemberExpression;
        if (member != null)
        {
            return member.Member;
        }

        /* TODO: Make localizable resource. */
        throw new ArgumentException("MemberExpression expected.", "expression");
    }

    #region INotifyPropertyChanging Implementation
#if !SILVERLIGHT
    [field: NonSerialized]
#endif
    event PropertyChangingEventHandler propertyChanging;

    public event PropertyChangingEventHandler PropertyChanging
    {
        add
        {
            if (OwnerDisposed)
            {
                return;
            }
            propertyChanging += value;
        }
        remove
        {
            if (OwnerDisposed)
            {
                return;
            }
            propertyChanging -= value;
        }
    }

    /// <summary>
    /// Raises the <see cref="E:PropertyChanging"/> event.
    /// If the owner has been GC'd then the event will not be raised.
    /// </summary>
    /// <param name="e">The <see cref="System.ComponentModel.PropertyChangingEventArgs"/> 
    /// instance containing the event data.</param>
    void OnPropertyChanging(PropertyChangingEventArgs e)
    {
        var owner = ownerWeakReference.Target;
        if (owner != null && propertyChanging != null)
        {
            propertyChanging(owner, e);
        }
    }
    #endregion

#if SILVERLIGHT
    readonly object expressionsLock = new object();

    string GetPropertyName<T, TResult>(Expression<Func<T, TResult>> expression)
    {
        string name;
        lock (expressionsLock)
        {
            if (!expressions.TryGetValue(expression.ToString(), out name))
            {
                if (!expressions.TryGetValue(expression.ToString(), out name))
                {
                    var memberInfo = GetMemberInfo(expression);
                    if (memberInfo == null)
                    {
                        /* TODO: Make localizable resource. */
                        throw new InvalidOperationException("MemberInfo not found.");
                    }
                    name = memberInfo.Name;
                    expressions.Add(expression.ToString(), name);
                }
            }
        }

        return name;
    }
#else
    readonly ReaderWriterLockSlim expressionsLock = new ReaderWriterLockSlim();

    string GetPropertyName<T, TResult>(Expression<Func<T, TResult>> expression)
    {
        string name;
        expressionsLock.EnterUpgradeableReadLock();
        try
        {
            if (!expressions.TryGetValue(expression.ToString(), out name))
            {
                expressionsLock.EnterWriteLock();
                try
                {
                    if (!expressions.TryGetValue(expression.ToString(), out name))
                    {
                        var memberInfo = GetMemberInfo(expression);
                        if (memberInfo == null)
                        {
                            /* TODO: Make localizable resource. */
                            throw new InvalidOperationException("MemberInfo not found.");
                        }
                        name = memberInfo.Name;
                        expressions.Add(expression.ToString(), name);
                    }
                }
                finally
                {
                    expressionsLock.ExitWriteLock();
                }
            }
        }
        finally
        {
            expressionsLock.ExitUpgradeableReadLock();
        }
        return name;
    }
#endif

    bool cleanupOccured;

    bool OwnerDisposed
    {
        get
        {
            /* We slightly improve performance here 
             * by avoiding multiple Owner property calls 
             * after the Owner has been disposed. */
            if (cleanupOccured)
            {
                return true;
            }
            var owner = Owner;
            if (owner != null)
            {
                return false;
            }
            cleanupOccured = true;
            var changedSubscribers = propertyChanged.GetInvocationList();
            foreach (var subscriber in changedSubscribers)
            {
                propertyChanged -= (PropertyChangedEventHandler)subscriber;
            }
            var changingSubscribers = propertyChanging.GetInvocationList();
            foreach (var subscriber in changingSubscribers)
            {
                propertyChanging -= (PropertyChangingEventHandler)subscriber;
            }

            /* Events should be null at this point. Nevertheless... */
            propertyChanged = null;
            propertyChanging = null;
            propertyChangedEventArgsCache.Clear();
            propertyChangingEventArgsCache.Clear();

            return true;
        }
    }

    [Conditional("DEBUG")]
    void ValidatePropertyName(string propertyName)
    {
#if !SILVERLIGHT
        var propertyDescriptor = TypeDescriptor.GetProperties(Owner)[propertyName];
        if (propertyDescriptor == null)
        {
            /* TODO: Make localizable resource. */
            throw new Exception(string.Format(
                "The property '{0}' does not exist.", propertyName));
        }
#endif
    }

    bool useExtendedEventArgs;
    readonly Dictionary<string, PropertyChangedEventArgs> propertyChangedEventArgsCache = new Dictionary<string, PropertyChangedEventArgs>();
    readonly Dictionary<string, PropertyChangingEventArgs> propertyChangingEventArgsCache = new Dictionary<string, PropertyChangingEventArgs>();

#if SILVERLIGHT
    readonly object propertyChangingEventArgsCacheLock = new object();

    PropertyChangingEventArgs RetrieveOrCreatePropertyChangingEventArgs(string propertyName)
    {
        var result = RetrieveOrCreateEventArgs(
            propertyName, 
            propertyChangingEventArgsCacheLock, 
            propertyChangingEventArgsCache, 
            x => new PropertyChangingEventArgs(x));

        return result;
    }

    readonly object propertyChangedEventArgsCacheLock = new object();

    PropertyChangedEventArgs RetrieveOrCreatePropertyChangedEventArgs(string propertyName)
    {
        var result = RetrieveOrCreateEventArgs(
            propertyName,
            propertyChangedEventArgsCacheLock,
            propertyChangedEventArgsCache,
            x => new PropertyChangedEventArgs(x));

        return result;
    }

    static TArgs RetrieveOrCreateEventArgs<TArgs>(
        string propertyName, object cacheLock, Dictionary<string, TArgs> argsCache, 
        Func<string, TArgs> createFunc)
    {
        ArgumentValidator.AssertNotNull(propertyName, "propertyName");
        TArgs result;

        lock (cacheLock)
        {
            if (argsCache.TryGetValue(propertyName, out result))
            {
                return result;
            }

            result = createFunc(propertyName);
            argsCache[propertyName] = result;
        }
        return result;
    }
#else
    readonly ReaderWriterLockSlim propertyChangedEventArgsCacheLock = new ReaderWriterLockSlim();
    
    PropertyChangedEventArgs RetrieveOrCreatePropertyChangedEventArgs(string propertyName)
    {
        ArgumentValidator.AssertNotNull(propertyName, "propertyName");
        var result = RetrieveOrCreateArgs(
            propertyName,
            propertyChangedEventArgsCache,
            propertyChangedEventArgsCacheLock,
            x => new PropertyChangedEventArgs(x));

        return result;
    }

    readonly ReaderWriterLockSlim propertyChangingEventArgsCacheLock = new ReaderWriterLockSlim();

    static TArgs RetrieveOrCreateArgs<TArgs>(string propertyName, Dictionary<string, TArgs> argsCache,
        ReaderWriterLockSlim lockSlim, Func<string, TArgs> createFunc)
    {
        ArgumentValidator.AssertNotNull(propertyName, "propertyName");
        TArgs result;
        lockSlim.EnterUpgradeableReadLock();
        try
        {
            if (argsCache.TryGetValue(propertyName, out result))
            {
                return result;
            }
            lockSlim.EnterWriteLock();
            try
            {
                if (argsCache.TryGetValue(propertyName, out result))
                {
                    return result;
                }
                result = createFunc(propertyName);
                argsCache[propertyName] = result;
                return result;
            }
            finally
            {
                lockSlim.ExitWriteLock();
            }
        }
        finally
        {
            lockSlim.ExitUpgradeableReadLock();
        }
    }

    PropertyChangingEventArgs RetrieveOrCreatePropertyChangingEventArgs(string propertyName)
    {
        ArgumentValidator.AssertNotNull(propertyName, "propertyName");
        var result = RetrieveOrCreateArgs(
            propertyName,
            propertyChangingEventArgsCache,
            propertyChangingEventArgsCacheLock,
            x => new PropertyChangingEventArgs(x));

        return result;
    }
#endif

}
```

I've extended the `PropertyChangedEventArgs` and the `PropertyChangingEventArgs` to include before and after values. The following excerpt shows the `PropertyChangedEventArgs`.

```csharp
/// <summary>
/// Provides data for the <see cref="INotifyPropertyChanged.PropertyChanged"/> event,
/// exposed via the <see cref="PropertyChangeNotifier"/>.
/// </summary>
/// <typeparam name="TProperty">The type of the property.</typeparam>
public sealed class PropertyChangedEventArgs<TProperty> : PropertyChangedEventArgs
{
    /// <summary>
    /// Gets the value of the property before it was changed.
    /// </summary>
    /// <value>The old value.</value>
    public TProperty OldValue { get; private set; }
        /// <summary>
    /// Gets the new value of the property after it was changed.
    /// </summary>
    /// <value>The new value.</value>
    public TProperty NewValue { get; private set; }
        /// <summary>
    /// Initializes a new instance 
    /// of the <see cref="PropertyChangedEventArgs{TProperty}"/> class.
    /// </summary>
    /// <param name="propertyName">Name of the property that changed.</param>
    /// <param name="oldValue">The old value before the change occured.</param>
    /// <param name="newValue">The new value after the change occured.</param>
    internal PropertyChangedEventArgs(
        string propertyName, TProperty oldValue, TProperty newValue) 
        : base(propertyName)
    {
        OldValue = oldValue;
        NewValue = newValue;
    }
}
```

`INotifyPropertyChanging` doesn't exist in Silverlight, so I've implemented it.

In order to turn of the extended `EventArgs`, pass an extra argument to the constructor. By turning of the extended `EventArgs`, 
we enable to arg caching feature. I implemented this after reading Josh Smith's nice articles on the subject.

The `PropertyChangeNotifier` retains a link to the Owner using a `WeakReference`. 
Each time a change is handled, the `PropertyChangeNotifier` checks to see if the Owner is still alive. If it isn't, the `PropertyChangeNotifier` will remove all event handlers.

## Unit Tests

The download includes various unit tests for both the Desktop and Silverlight environments. I recommend examining them, to further your understanding about how it all works.

![Desktop CLR test results.](/assets/images/2009-08-02-TestResults.gif)

**Figure 1.** Desktop CLR test results.

![Silverlight test results](/assets/images/2009-08-02-SilverlightTestResults.jpg)

**Figure 2.** Silverlight CLR test results.

 

### Future Enhancements

* Batch support
* Event Suppression

Download source code for the Desktop and Silverlight CLRs: [Core_01_01.zip (1.42 mb)](/Downloads/Core_01_01.zip)