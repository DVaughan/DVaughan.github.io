This week there was a short discussion on the WPF Disciples about Knockout observables and the implications of field level and owner level data bindings. 
The discussion can be found in the guts of this post.

I wanted to explore the topic further, and I decided to take a stab at implementing 
something analogous to Knockout Observables and Computed Observables in WPF.

In this article we look at implementing field level change notification in WPF, 
and how a Lambda Expression can be used to specify a composite property 
that raises change notifications automatically whenever an associated property changes.

To get started, let's first take a look at a class that illustrates how composite binding 
are ordinarily done in a viewmodel designed for XAML (see Listing 1). 
It's a simple viewmodel that contains three properties. Two properties have backing fields, while the third (FullName) 
is a composite property; combining the FirstName and LastName properties. When either of the non-composite properties change, 
change notification has to occur for the composite as well as non-composite properties.

The downside of this approach is that as the complexity of the viewmodel increases 
and dependencies creep in, you end up having to raise PropertyChanged events for multiple dependent properties. 
While this example may seem dead simple (it is), over time potential faults may creep in because of this kind of interdependence.

**Listing 1.** MainWindowViewModelTraditional Class

```csharp
class MainWindowViewModelTraditional : INotifyPropertyChanged
{
    string firstName;
        
    public string FirstName
    {
        get
        {
            return firstName;
        }
        set
        {
            if (firstName != value)
            {
                firstName = value;
                OnPropertyChanged("FirstName");
                OnPropertyChanged("FullName");
            }
        }
    }

    string lastName;

    public string LastName
    {
        get
        {
            return lastName;
        }
        set
        {
            if (lastName != value)
            {
                lastName = value;
                OnPropertyChanged("LastName");
                OnPropertyChanged("FullName");
            }
        }
    }

    public string FullName
    {
        get
        {
            return firstName + " " + lastName;
        }
    }

    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged(string propertyName)
    {
        PropertyChangedEventHandler handler = PropertyChanged;
        if (handler != null)
        {
            handler(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
```

## Taking the Knockout JS Approach

I've been using Knockout quite a bit lately and I like the flexibility and versatility that the binding expression interpreter offers. 
Knockout allows you to combine observable values in a way that allows you to forego the kind of artificial dependence seen earlier. 
For example, on a web page you can produce the same string as the FullName property seen in the last example using something like the following:

```xml
<span data-bind="text: firstName() + ' ' + lastName()"></span>
```

You can also achieve the same result using computed values in your viewmodel if you so desire.

In this article I've set out to see whether I could come up with something that emulates Knockout's field level notifications 
in observables and computed observables. I'm quite happy with the result and I believe it has potential. 
Stay tuned, because at the end of this article you will see how to create a computed property in C# like the following, which raises change notifications automatically:

```csharp
readonly ComputedValue<string> fullName;

public ComputedValue<string> FullName
{
    get
    {
        return fullName;
    }
}

public MainWindowViewModel()
{
    fullName = new ComputedValue<string>(() => FirstName.Value + " " + ToUpper(LastName.Value));
}
```

## Bridging the HTML-XAML Ravine
In WPF, when using the `INotifyPropertyChanged` approach to data binding, change notification occurs at the owner object level. 
The owner is the source property in a data binding, which is ordinarily the DataContext of your control. 
If you're using the MVVM pattern this is likely your viewmodel or a nested property. 
It is the owner object of the property that has the responsibility of raising a PropertyChanged event whenever the property changes.

Conversely, field level notification is where the source of the notification is the field itself (or in XAML, a property). 
The main advantage of field level notification is that your viewmodel does not need to contain any plumbing code for change notification. 
Field level notification isn't achievable in XAML without defining an event for each property in your viewmodel. 
(Thanks to Bill Kemph for reminding me of field level notifications using dedicated events). 
This approach is usually avoided because it adds an undue amount of plumbing code to your viewmodel. 
A wrapper layer is presented in this article, which takes care of raising property changed events for you.

Two classes exist in the downloadable code that emulate the behaviour of Knockout's observable 
and computed observable types: `ObservableValue` and `ComputedValue`. 
Both implement `INotifyPropertyChanged` and automatically raise the `PropertyChanged` event when an associated value has changed.

The ObservableValue implementation is rudimentary. 
Things get more interesting when we look at the ComputedValue implementation that allows you to specify a LINQ expression, 
which is parsed by the ComputedValue object to locate objects that implement INotifyPropertyChanged. 
When any such object changes, the computed value is recalculated. This allows you to create arbitrary composite properties 
in your viewmodel that respond to change notifications of any other associated object.

## Understanding the ObservableValue Class

An ObservableValue property is defined much like a property using the traditional approach to INPC. 
The difference is that an ObservableValue instance wraps the value, as shown in the following excerpt:

```csharp
class MainWindowViewModel
{
    readonly ObservableValue<string> firstName = new ObservableValue<string>("Alan");

    public ObservableValue<string> FirstName
    {
        get
        {
            return firstName;
        }
    }
...
}
```

To set the value, the ObservableValue.Value property is used. 
When the setter is used the PropertyChanged event is raised (see Listing 2).

**Listing 2.** ObservableValue Class

```csharp
public class ObservableValue<T> : INotifyPropertyChanged
{
    T valueField;

    public T Value
    {
        get
        {
            return valueField;
        }
        set
        {
            if (!EqualityComparer<T>.Default.Equals(valueField, value))
            {
                valueField = value;
                OnPropertyChanged("Value");
            }
        }
    }

    public ObservableValue(T value = default(T))
    {
        Value = value;
    }

    public event PropertyChangedEventHandler PropertyChanged;

    void OnPropertyChanged(string propertyName)
    {
        PropertyChangedEventHandler handler = PropertyChanged;
        if (handler != null)
        {
            handler(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
```

## Creating Composite Properties with the ComputedValue Class

Unlike `ObservableValue`, `ComputedValue` accepts a Lambda Expression that, when compiled, returns a value for the property. 
Listing 3 shows how the `ComputedValue`'s constructor uses a specified Lamdba Expression.

**Listing 3.** ComputedValue Class (Excerpt)

```csharp
public class ComputedValue<T> : INotifyPropertyChanged, IDisposable
{
...
    readonly Func<T> valueFunc;

    public T Value
    {
        get
        {
            T result = valueFunc();
            return result;
        }
    }

    public ComputedValue(Expression<Func<T>> expression)
    {
        if (expression == null)
        {
            throw new ArgumentNullException("expression");
        }

        Expression body = expression.Body;

        ProcessDependents(body);

        valueFunc = expression.Compile();
    }
...
}
```

When an instance of `ComputedValue` is created, the specified expression is parsed recursively. 
Nested `MemberExpressions` that refer to objects implementing `INotifyPropertyChanged` are identified (see Listing 4).

**Listing 4.** ProcessDependents (Excerpt)

```csharp
void ProcessDependents(Expression expression)
{
    switch (expression.NodeType)
    {
        case ExpressionType.MemberAccess:
            ProcessMemberAccessExpression((MemberExpression)expression);
            break;
        case ExpressionType.Call:
            ProcessMethodCallExpression((MethodCallExpression)expression);
            break;
...
        default:
            return;
    }
}
```

When a member expression is discovered, its owner is resolved using the `ComputedValue.GetValue` method. 
The class subscribes to the `PropertyChanged` event of the owner object. 
A `PropertyChangedEventHandler` is created and placed in a collection along with a `WeakReference` 
to the owner object (see Listing 5). When a change notification is received, the `ComputedValue` object raises its own `PropertyChanged` event.

**Listing 5.** ProcessMemberAccessExpression Method

```csharp
void ProcessMemberAccessExpression(MemberExpression expression)
{
    Expression ownerExpression = expression.Expression;
    Type ownerExpressionType = ownerExpression.Type;
                                            
    if (typeof(INotifyPropertyChanged).IsAssignableFrom(ownerExpressionType))
    {
        try
        {
            string memberName = expression.Member.Name;
            PropertyChangedEventHandler handler = delegate(object sender, PropertyChangedEventArgs args)
                {
                    if (args.PropertyName == memberName)
                    {
                        OnValueChanged();
                    }
                };

            var owner = (INotifyPropertyChanged)GetValue(ownerExpression);
            owner.PropertyChanged += handler;

            handlers[handler] = new WeakReference(owner);
        }
        catch (Exception ex)
        {
            Console.WriteLine("ComputedValue failed to resolve INotifyPropertyChanged value for property {0} {1}", 
                                expression.Member, ex);
        }
    }
}
```

Retrieving the property value from the Lambda expression is done via expression compilation (see Listing 6). 
However, the expression is not able to be compiled directly as it is just a fragment. 
A Lambda expression is constructed by converting the specified expression into a `UnaryExpression`. 
When compiled, the resulting func is called and the result returned. In most cases the result is your viewmodel. Though, it does not have to be.

**Listing 6.** GetValue Method

```csharp
object GetValue(Expression expression)
{
    UnaryExpression unaryExpression = Expression.Convert(expression, typeof(object));
    Expression<Func<object>> getterLambda = Expression.Lambda<Func<object>>(unaryExpression);
    Func<object> getter = getterLambda.Compile();

    return getter();
}
```

In .NET the target of an event may be ineligible for garbage collection while the event source remains alive. 
Therefore if we do not unsubscribe from owner objects' `PropertyChanged` events, a memory leak may ensue. 
The `ComputedValue` class implements `IDisposable` and when disposed the `ComputedValue` instance unsubscribes from all change events.

The `ComputedValue` `IDisposable` implementation loops over the items in the handlers dictionary (see Listing 7). 
If `KeyValuePair.Value` property holds a `WeakReference` to the owner of the property, where the owner has not been disposed, 
the `PropertyChanged` event is unsubscribed using the handler stored as the `KeyValuePair.Key` property.

**Listing 7.** ComputedValue IDisposable Implementation

```csharp
bool disposed;

protected virtual void Dispose(bool disposing)
{
    if (!disposed)
    {
        if (disposing)
        {
            foreach (KeyValuePair<PropertyChangedEventHandler, WeakReference> pair in handlers)
            {
                INotifyPropertyChanged target = pair.Value.Target as INotifyPropertyChanged;
                if (target != null)
                {
                    target.PropertyChanged -= pair.Key;
                }
            }

            handlers.Clear();
        }

        disposed = true;
    }
}

public void Dispose()
{
    Dispose(true);
}
```

The downloadable code contains a simple single window application that displays two `TextBox` controls. 
Each `TextBox` is bound to a viewmodel property of type `ObservableValue`. 
There is a `TextBlock` that is bound to a `ComputedValue` property, which combines the result of the two `ObservableValue` properties (see Figure 1). 

When the text in either of the `TextBoxes` is changed, the `TextBlock` containing the full name is updated.

Note how the `LastName` property is converted to upper case. This is performed despite the fact that the call is embedded within the Lambda expression of the `ComputedValue`.

![Main Window](/assets/images/2012-07-25-KnockoutStyleObservablesMainWindow.png)

**Figure 1.** Sample App.

Just to prove no funny business is taking place in the Window XAML, 
Listing 8 shows how the text properties are bound to the `Value` property of the `ObservableValue` properties and the `ComputedValue` property.

**Listing 8.** MainWindows.xaml (Excerpt)

```xml
<StackPanel Orientation="Horizontal" Margin="40">
    <StackPanel>
        <Label>First Name</Label>
        <TextBox Text="{Binding Path=FirstName.Value, UpdateSourceTrigger=PropertyChanged}" />
        <Label>Last Name</Label>
        <TextBox Text="{Binding Path=LastName.Value, UpdateSourceTrigger=PropertyChanged}" />
    </StackPanel>
    <StackPanel Margin="20,0">
        <Label>Full Name</Label>
        <TextBlock Text="{Binding Path=FullName.Value}" 
                    Style="{StaticResource FullNameStyle}" />
                
        <TextBlock>fullName = new ComputedValue&lt;string&gt;(<LineBreak />
            () => FirstName.Value + " " + ToUpper(LastName.Value));</TextBlock>
    </StackPanel>
</StackPanel>
```

The `MainWindowViewModel` code is shown in its entirety in Listing 9. The `FirstName` and `LastName` properties 
are combined in the `ComputedValue`, along with an arbitrary call to a `ToUpper` method.

**Listing 9.** MainWindowViewModel Class

```csharp
class MainWindowViewModel
{
    readonly ObservableValue<string> firstName = new ObservableValue<string>("Alan");

    public ObservableValue<string> FirstName
    {
        get
        {
            return firstName;
        }
    }

    readonly ObservableValue<string> lastName = new ObservableValue<string>("Turing");

    public ObservableValue<string> LastName
    {
        get
        {
            return lastName;
        }
    }

    readonly ComputedValue<string> fullName;

    public ComputedValue<string> FullName
    {
        get
        {
            return fullName;
        }
    }

    public MainWindowViewModel()
    {
        fullName = new ComputedValue<string>(() => FirstName.Value + " " + ToUpper(LastName.Value));
    }

    string ToUpper(string s)
    {
        return s.ToUpper();
    }
}
```

Knockout JS has some elegant features that leverage the versatility of JavaScript and help to bridge the gap between XAML and HTML. 
In this article we looked at implementing field level change notification in WPF, and how a Lambda Expression can be used 
to specify a composite property that raises change notifications automatically whenever an associated property changes.

[ObservablePrototype_2012_07_15.rar (250.68 kb)](/Downloads/ObservablePrototype_2012_07_15.rar) 