The ReaderWriterLockSlim class is used to protect a resource that is read by multiple threads and written to by one thread at a time. 
The class exists in the desktop FCL, but is noticeably absent from the Silverlight FCL. To readily support both platforms, some time ago, 
I incorporated the open-source mono implementation of the `ReaderWriterLockSlim` class into the Silverlight version of my core library, 
which is downloadable from http://calcium.codeplex.com/SourceControl/list/changesets

`ReaderWriterLockSlim` is a light-weight alternative to the Monitor class, for providing for concurrency. 
I say light-weight because the Monitor class only provides for exclusive access; where only a single thread can enter, regardless of the kind of operation.

The `Monitor` class, however, has an advantage: its syntax can be simplified using the lock statement, as shown in the following code snippet:

```csharp
System.Object resourceLock = new System.Object();
System.Threading.Monitor.Enter(resourceLock);
try
{
    DoSomething();
}
finally
{
    System.Threading.Monitor.Exit(resourceLock);
}
```

Which is equivalent to the following, when using a lock statement:

```csharp
lock (x)
{
    DoSomething();
}
```

Using the lock statement means that we never get caught out forgetting to exit the lock, which could lead to a thread being blocked indefinitely.

No such baked-in infrastructure exists for the `ReaderWriterLockSlim`. 
So, I've created a number of extension methods to simulate the lock statement for the `ReaderWriterLockSlim`.

## Using Extension Methods to Simulate Lock Syntax

If you've used the `ReaderWriterLockSlim` a lot, you'll know that mismatching `Enter` and `Exit` calls can be easy to do, especially when pasting code. 
For example, in the following excerpt we see how a call to enter a write protected section of code is mismatched with a call to exit a read section:

```csharp
ReaderWriterLockSlim lockSlim = new ReaderWriterLockSlim();

try
{
    lockSlim.EnterWriteLock();
    DoSomething();
}
finally
{
    lockSlim.ExitReadLock();
}
``` 

This code will result in a `System.Threading.SynchronizationLockException` being raised.

The extension methods that have been written, allow a Func or an `Action` to be supplied, which will be performed within a try/finally block. 
The previous excerpt can be rewritten more concisely as:

```csharp
ReaderWriterLockSlim lockSlim = new ReaderWriterLockSlim();
lockSlim.PerformUsingWriteLock(() => DoSomething);
```

In the downloadable code I have included a unit test to demonstrate how the ReaderWriterLockSlim extension methods are used, (see Listing 1).

**Listing 1.** LockSlimTests Class

```csharp
[TestClass]
public class LockSlimTests : SilverlightTest
{
    readonly static List<string> sharedList = new List<string>();
 
    [TestMethod]
    public void ExtensionsShouldPerformActions()
    {
        ReaderWriterLockSlim lockSlim = new ReaderWriterLockSlim();
 
        string item1 = "test";
 
        //    Rather than this code:
        //            try
        //            {
        //                lockSlim.EnterWriteLock();
        //                sharedList.Add(item1);
        //            }
        //            finally
        //            {
        //                lockSlim.ExitWriteLock();
        //            }
        //    We can write this one liner:
        lockSlim.PerformUsingWriteLock(() => sharedList.Add(item1));
 
        //    Rather than this code:
        //            string result;
        //            try
        //            {
        //                lockSlim.EnterReadLock();
        //                result = sharedList[0];
        //            }
        //            finally
        //            {
        //                lockSlim.ExitReadLock();
        //            }
        //    We can write this one liner:
        string result = lockSlim.PerformUsingReadLock(() => sharedList[0]);
 
        Assert.AreEqual(item1, result);
 
        string item2 = "test2";
 
        //    Rather than this code:
        //            try
        //            {
        //                lockSlim.EnterUpgradeableReadLock();
        //                if (!sharedList.Contains(item2))
        //                {
        //                    try
        //                    {
        //                        lockSlim.EnterWriteLock();
        //                        sharedList.Add(item2);
        //                    }
        //                    finally
        //                    {
        //                        lockSlim.ExitWriteLock();
        //                    }
        //                }
        //            }
        //            finally
        //            {
        //                lockSlim.ExitUpgradeableReadLock();
        //            }
        //    We can write this:
        lockSlim.PerformUsingUpgradeableReadLock(() => 
            {
                if (!sharedList.Contains(item2))
                {
                    lockSlim.PerformUsingWriteLock(() => sharedList.Add(item2));
                }
            });
 
        //    Rather than this code:
        //            try
        //            {
        //                lockSlim.EnterReadLock();
        //                result = sharedList[1];
        //            }
        //            finally
        //            {
        //                lockSlim.ExitReadLock();
        //            }
        //    We can write this:
        result = lockSlim.PerformUsingReadLock(() => sharedList[1]);
 
        Assert.AreEqual(item2, result);
    }
 
}
```

The result of executing this test is shown in Figure 1.

![Unit test results](/assets/images/2010-08-14-SilverlightUnitTestResults.png)

**Figure 1.** Result of running the ReaderWriterLockSlimExtension tests.

 

The ReaderWriterLockSlimExtensions accept a simple Action or a Func to return value, and take care of calling the appropriate Enter and Exit methods, inside a try/finally block, (see Listing 2).

**Listing 2.** ReaderWriterLockSlimExtensions Class

```csharp
public static class ReaderWriterLockSlimExtensions
{
    public static void PerformUsingReadLock(this ReaderWriterLockSlim readerWriterLockSlim, Action action)
    {
        ArgumentValidator.AssertNotNull(readerWriterLockSlim, "readerWriterLockSlim");
        ArgumentValidator.AssertNotNull(action, "action");
        try
        {
            readerWriterLockSlim.EnterReadLock();
            action();
        }
        finally
        {
            readerWriterLockSlim.ExitReadLock();
        }
    }
 
    public static T PerformUsingReadLock<T>(this ReaderWriterLockSlim readerWriterLockSlim, Func<T> action)
    {
        ArgumentValidator.AssertNotNull(readerWriterLockSlim, "readerWriterLockSlim");
        ArgumentValidator.AssertNotNull(action, "action");
        try
        {
            readerWriterLockSlim.EnterReadLock();
            return action();
        }
        finally
        {
            readerWriterLockSlim.ExitReadLock();
        }
    }
 
    public static void PerformUsingWriteLock(this ReaderWriterLockSlim readerWriterLockSlim, Action action)
    {
        ArgumentValidator.AssertNotNull(readerWriterLockSlim, "readerWriterLockSlim");
        ArgumentValidator.AssertNotNull(action, "action");
        try
        {
            readerWriterLockSlim.EnterWriteLock();
            action();
        }
        finally
        {
            readerWriterLockSlim.ExitWriteLock();
        }
    }
 
    public static T PerformUsingWriteLock<T>(this ReaderWriterLockSlim readerWriterLockSlim, Func<T> action)
    {
        ArgumentValidator.AssertNotNull(readerWriterLockSlim, "readerWriterLockSlim");
        ArgumentValidator.AssertNotNull(action, "action");
        try
        {
            readerWriterLockSlim.EnterWriteLock();
            return action();
        }
        finally
        {
            readerWriterLockSlim.ExitWriteLock();
        }
    }
 
    public static void PerformUsingUpgradeableReadLock(this ReaderWriterLockSlim readerWriterLockSlim, Action action)
    {
        ArgumentValidator.AssertNotNull(readerWriterLockSlim, "readerWriterLockSlim");
        ArgumentValidator.AssertNotNull(action, "action");
        try
        {
            readerWriterLockSlim.EnterUpgradeableReadLock();
            action();
        }
        finally
        {
            readerWriterLockSlim.ExitUpgradeableReadLock();
        }
    }
 
    public static T PerformUsingUpgradeableReadLock<T>(this ReaderWriterLockSlim readerWriterLockSlim, Func<T> action)
    {
        ArgumentValidator.AssertNotNull(readerWriterLockSlim, "readerWriterLockSlim");
        ArgumentValidator.AssertNotNull(action, "action");
        try
        {
            readerWriterLockSlim.EnterUpgradeableReadLock();
            return action();
        }
        finally
        {
            readerWriterLockSlim.ExitUpgradeableReadLock();
        }
    }
}
```

The `ArgumentValidator` class is present in my base library. Calls to its `AssertNotNull` can be replaced with a null check, and if null throw an `ArgumentNullException`. 
If you'd like the code for the `ArgumentValidator` etc., you can find it in the Core class library in the source available at http://calcium.codeplex.com/SourceControl/list/changesets

## Conclusion

In this post we have seen how extension methods can be used to ensure that the `ReaderWriterLockSlim` class is correctly exited after a thread critical region. 
This avoids the problem of mismatched Enter and Exit calls, which can result in exceptions and indefinite blocking.

I hope you have enjoyed this post, and that you find the code and ideas presented within it useful.

Download code: [ReaderWriterLockSlimExtensions.zip (1.14 mb)](/Downloads/ReaderWriterSlimLockExtensions.zip)