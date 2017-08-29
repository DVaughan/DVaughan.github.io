---
categories: .NET WPF
redirect_from:
 - /post/Enforcing-Single-Instance-WPF-Applications.aspx.html
---

## Introduction
Today the [WPF Disciples](http://wpfdisciples.wordpress.com/), and in particular my good friend and fellow WPF Disciple, [Pete O'Hanlon](http://peteohanlon.wordpress.com/), 
were sitting around the proverbial campfire, [discussing how to enforce single instance WPF apps](http://groups.google.com/group/wpf-disciples/browse_thread/thread/72ebbeb4fcd90fea), 
for Pete's cool [Goldlight project](http://goldlight.codeplex.com/). By single instance WPF apps, I mean limiting an executable to only one instance in execution. This can be useful in scenarios where multiple application instances may play havoc with shared state. I took some time away from writing my book, to see if I could come up with something usable.

Building a Single Instance Application Enforcer
The singleton application model works like this:

1. User starts app1.
2. User starts app2.
3. App2 detects app1 is running.
4. App2 quits.
 

There is, however, a second part to our challenge, as Pete pointed out. What happens if we wish to pass some information from app2 to app1 before app2 quits? If, for example, the application is associated with a particular file type, and the user happens to double click on a file of that type, then we would have app2 tell app1 what file the user was trying to open.

To accomplish this we need a means to communicate between the two application instances. There are a number of approaches that could be taken, and some include:

* Named pipes
* Sending a message to the main application's window with a native API call
* MemoryMappedFile

I chose to go for the `MemoryMappedFile`, along with an `EventWaitHandle`. The consensus by the Disciples was for a `Mutex` (not an `EventWaitHandle`), 
but the `Mutex` turned out not to provide for the initial signaling that I needed. I have encapsulated the logic for the singleton application enforcement, 
into a class called `SingletonApplicationEnforcer` (see Listing 1). The class instantiates the `EventWaitHandle`, and informs the garbage collector via the `GC.KeepAlive` method, 
that it should not be garbage collected. If this is the only application that has instantiated the `EventWaitHandle` with the specified name, 
then the `createdNew` argument will be set to true. This is how we determine, if the application is the singleton application.

**Listing 1.** SingletonApplicationEnforcer Class

```csharp
/// <summary>
/// This class allows restricting the number of executables in execution, to one.
/// </summary>
public sealed class SingletonApplicationEnforcer
{
    readonly Action<IEnumerable<string>> processArgsFunc;
    readonly string applicationId;
    Thread thread;
    string argDelimiter = "_;;_";

    /// <summary>
    /// Gets or sets the string that is used to join 
    /// the string array of arguments in memory.
    /// </summary>
    /// <value>The arg delimeter.</value>
    public string ArgDelimeter
    {
        get
        {
            return argDelimiter;
        }
        set
        {
            argDelimiter = value;
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="SingletonApplicationEnforcer"/> class.
    /// </summary>
    /// <param name="processArgsFunc">A handler for processing command line args 
    /// when they are received from another application instance.</param>
    /// <param name="applicationId">The application id used 
    /// for naming the <seealso cref="EventWaitHandle"/>.</param>
    public SingletonApplicationEnforcer(Action<IEnumerable<string>> processArgsFunc, 
        string applicationId = "DisciplesRock")
    {
        if (processArgsFunc == null)
        {
            throw new ArgumentNullException("processArgsFunc");
        }
        this.processArgsFunc = processArgsFunc;
        this.applicationId = applicationId;
    }

    /// <summary>
    /// Determines if this application instance is not the singleton instance.
    /// If this application is not the singleton, then it should exit.
    /// </summary>
    /// <returns><c>true</c> if the application should shutdown, 
    /// otherwise <c>false</c>.</returns>
    public bool ShouldApplicationExit()
    {
        bool createdNew;
        string argsWaitHandleName = "ArgsWaitHandle_" + applicationId;
        string memoryFileName = "ArgFile_" + applicationId;

        EventWaitHandle argsWaitHandle = new EventWaitHandle(
            false, EventResetMode.AutoReset, argsWaitHandleName, out createdNew);

        GC.KeepAlive(argsWaitHandle);

        if (createdNew)
        {
            /* This is the main, or singleton application. 
                * A thread is created to service the MemoryMappedFile. 
                * We repeatedly examine this file each time the argsWaitHandle 
                * is Set by a non-singleton application instance. */
            thread = new Thread(() =>
                {
                    try
                    {
                        using (MemoryMappedFile file = MemoryMappedFile.CreateOrOpen(memoryFileName, 10000))
                        {
                            while (true)
                            {
                                argsWaitHandle.WaitOne();
                                using (MemoryMappedViewStream stream = file.CreateViewStream())
                                {
                                    var reader = new BinaryReader(stream);
                                    string args;
                                    try
                                    {
                                        args = reader.ReadString();
                                    }
                                    catch (Exception ex)
                                    {
                                        Debug.WriteLine("Unable to retrieve string. " + ex);
                                        continue;
                                    }
                                    string[] argsSplit = args.Split(new string[] { argDelimiter }, 
                                                                    StringSplitOptions.RemoveEmptyEntries);
                                    processArgsFunc(argsSplit);
                                }

                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine("Unable to monitor memory file. " + ex);
                    }
                });

            thread.IsBackground = true;
            thread.Start();
        }
        else
        {
            /* Non singleton application instance. 
                * Should exit, after passing command line args to singleton process, 
                * via the MemoryMappedFile. */
            using (MemoryMappedFile mmf = MemoryMappedFile.OpenExisting(memoryFileName))
            {
                using (MemoryMappedViewStream stream = mmf.CreateViewStream())
                {
                    var writer = new BinaryWriter(stream);
                    string[] args = Environment.GetCommandLineArgs();
                    string joined = string.Join(argDelimiter, args);
                    writer.Write(joined);
                }
            }
            argsWaitHandle.Set();
        }

        return !createdNew;
    }
}
```

If the process happens to be the singleton application, then a new thread is started that will block until it receives a signal (via the `argsWaitHandle`). 
This signal indicates that the `MemoryMappedFile` contains data to be read. It is non-singleton applications instances that perform this signalling, 
via the `argsWaitHandle.Set` method, after the string arguments have been written to the `MemoryMappedFile`.

## Demonstrating the SingletonApplicationEnforcer Class

The downloadable code includes two solutions, and two projects. Each use the `SingletonApplicationEnforcer` class in their respective App (App.xaml.cs) classes. 
To try out the sample, open both solutions. Start debuging the SingleApp project first, 
and then launch the SingleApp2 project. What will hopefully result is that the SingleApp2 project will detect that it is not the singleton application, 
and it will write its command line arguments to a `MemoryMappedFile`. 
The SingleApp application will detect that data has been written to the file, and present the command line arguments in its main window (see Figure 1).

![Application Screen Shot](/assets/images/2010-08-01-SingletonApplicationEnforcer.png)

**Figure 1.** The demo application consists of a single window, which displays received command line arguments.

 
The entry point for either projects is the `App` class. It is in this class that we consume the `SingletonApplicationEnforcer` class, 
to detect whether the application should be allowed to execute (see Listing 2). The `App` classes constructor uses the `SingletonApplicationEnforcer`'s `ShouldApplicationExit` method; 
which, as we saw in Listing 1, uses an `EventWaitHandle` to determine if it is the only instance in execution. 
If it isn't then the method returns true, and the application is explicitly shutdown.

**Listing 2.** App Class

```csharp
/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    readonly SingletonApplicationEnforcer enforcer = new SingletonApplicationEnforcer(DisplayArgs);

    public App()
    {
        if (enforcer.ShouldApplicationExit())
        {
            this.Shutdown();
        }
    }

    public static void DisplayArgs(IEnumerable<string> args)
    {
        foreach (var arg in args)
        {
            string message = string.Format("Received arg: {0}", arg);
            Debug.WriteLine(message);
        }
            
        var dispatcher = Current.Dispatcher;
        if (dispatcher.CheckAccess())
        {
            ShowArgs(args);
        }
        else
        {
            dispatcher.BeginInvoke(
                new Action(delegate
                {
                    ShowArgs(args);
                }));
        }
    }

    static void ShowArgs(IEnumerable<string> args)
    {
        var mainWindow = Current.MainWindow as MainWindow;
        if (mainWindow != null && args != null)
        {
            foreach (var arg in args)
            {
                mainWindow.ViewModel.Args.Add(arg);
            }
        }
    }

}
```

As usual, this application uses the MVVM pattern. The `MainWindow` has its DataContext property set to an instance of the `MainWindowViewModel` (see Listing 3).

**Listing 3.** MainWindow XAML

```xml
<Window x:Class="SingleApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Singleton Application Enforcer Example" 
        Height="350" Width="525" ResizeMode="NoResize" Background="Black">
    <StackPanel>
        <Image Source="Images/DisciplesBackground.jpg" />
        <StackPanel Margin="10">
            <TextBlock Text="Received Args:" FontSize="16" Padding="10" Foreground="White"/>
            <ListBox ItemsSource="{Binding Args}" 
                     VerticalAlignment="Stretch" Height="185" />
        </StackPanel>
    </StackPanel>
</Window>
```

The viewmodel (`MainWindowViewModel`), shown in Listing 2, exposes an `ObsertableCollection` of strings, that reflect arguments that are passed to the application, from other application instances.

**Listing 4.** MainWindowViewModel

```csharp
public class MainWindowViewModel : INotifyPropertyChanged
{
    static ObservableCollection<string> args = new ObservableCollection<string>();

    public ObservableCollection<string> Args
    {
        get
        {
            return args;
        }
    }

    public event PropertyChangedEventHandler PropertyChanged;

    protected void OnPropertyChanged(string propertyName)
    {
        var temp = PropertyChanged;
        if (temp != null)
        {
            temp(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
```

## Conclusion
In this post we have seen how a `MemoryMappedFile` can be used in conjunction with a `EventWaitHandle`, to provide for cross process communication in order to limit execution 
to a single application instance. We also saw how to communicate command line arguments to the singleton application, so that it can respond adequately to user intent.

I hope you enjoyed this post, and that you find the code and ideas presented here useful.

Download code: [SingletonEnforcementV2.zip (345.05 kb)](/Downloads/SingletonEnforcementV2.zip)
