---
title: Regex for Single-Line Property Accessors to Expression Bodied Functions
categories: .NET csharp
redirect_from:
 - /post/Transform-Single-Line-Property-Accessors-into-Expression-Body-Functions-using-a-Regular-Expression.aspx.html
---

Since C# 6.0 arrived, expression bodied functions have made for more concise properties; turning this:

```csharp
string foo;

public string Foo
{
    get
    {
        return foo;
    }
    set
    {
        foo = value;
    }
}
```

into this:


```csharp
string foo;

public string Foo
{
    get => foo;
    set => foo = value;
}
```

Resharper has a nice feature that lets you convert property accessors to expression bodied function across your project or solution. 
But if you do not have R# installed, you may find the following regular expression useful. 
Copy the following two strings to the Visual Studio find and replace dialog, and it will convert your old school property accessors to expression bodied functions.

Find:

```
(get)\s*\r?\n?{\s*\r?\n?\s*return\s(.*);\r?\n?\s*}|(set)\s*\r?\n?{\s*\r?\n?\s*(.*);\r?\n?\s*}
```

Replace:

```
$1$3 => $2$4;
```

Notice that the replace string looks a little odd. 
What's happening is that the Find regex uses pipes to define two alternates: a getter or a setter. 
As far as I know, and correct me if I'm wrong, Visual Studio does not support named groups in its Find/Replace dialog.  
So, I've used numbered groups. Fortunately, if the numbered group is not captured, it appears as an empty string in the replacement string. 
So, the same regex works for both getters and setters.

I do, however, recommend using this with caution; don't go and *replace all* in your solution with this.

Have a great day!