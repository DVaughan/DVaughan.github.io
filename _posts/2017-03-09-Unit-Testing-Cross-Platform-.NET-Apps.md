---
title: Unit Testing Cross Platform .NET Apps
categories: .NET Unit-Testing
---

I'm working on a new, soon to be released, open-source project. Without giving too much away, it's a set of libraries for UWP, WPF, and Xamarin.* apps.

Now if you're using VS 2017 to build your apps, the tooling story for cross-platform apps has become ever more unified. 
You have .NET Standard for cross-platform application logic; much less friction than PCLs in my view. 
Cross-platform Unit testing, however, is a bit of a missing piece at the moment. 
The Microsoft testing framework exists for both UWP and WPF apps, and has the same API surface. 
If you find yourself wanting to use a shared project to test an Android app though, 
you'll soon discover that you need to venture away from the Microsoft testing framework to NUnitLite, 
which has a similar but incompatible API surface.

So, how do you reuse your unit tests across platform specific test projects. Here's how I did.

Create a Shared project in your solution and reference it from each platform specific test project. 

With type aliases, we can use the same attribute names across each platform.

At the top of each unit test class add the following:

```csharp
#if __ANDROID__

using NUnit.Framework;

using TestClass = NUnit.Framework.TestFixtureAttribute;

using TestMethod = NUnit.Framework.TestAttribute;

#else

using Microsoft.VisualStudio.TestTools.UnitTesting;

#endif
```

Decorate each test class with the [TestClass] attribute and each test method with a [TestMethod] attribute. 
I chose the Microsoft attributes since I'm guessing the test infrastructure will unify towards the Windows tooling.

Fortunately, the Assert class, which is the foundation of both the Microsoft and NUnitLite testing, exists in both frameworks. 
The API surface is almost identical. There are, however, some differences. 
To avoid litering my code with pre-processor directives, I created a class named AssertX, which attempts to unify those differences. See below.

```csharp
using System;

#if __ANDROID__
using NUnit.Framework;
#else
using Microsoft.VisualStudio.TestTools.UnitTesting;
#endif

namespace Foo.Testing
{
    class AssertX
    {
        public static void IsInstanceOfType(object instance, Type type)
        {
#if __ANDROID__
            Assert.IsInstanceOfType(type, instance);
#else
            Assert.IsInstanceOfType(instance, type);
#endif
        }

    }
}
```

So there you have it, a couple tips to keep your cross-platform unit test projects [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) as a bone.