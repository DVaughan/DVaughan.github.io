---
categories: .NET
---

Reflector is a terrific tool, no doubt. If you've ever used its export code feature, however, 
you'll notice it has a tough time interpreting calls to property accessors. Code is intermingled with get_Foo() and set_Bah(...).

Well, you can quickly replace those method calls with the following set of regular expressions.

Starting from Visual Studio 2012, Visual Studio uses the .NET frameworks regular expression API. 
So, gone are the days of having to learn VS's old idiocentric regular expressions syntax.

To replace the set_X(Y) code use the following expression in Visual Studio's Find and Replace dialog (remember to enable regular expression in the dialog):

```
set_([a-zA-Z_]+)\((.+)\)
```

Replace:

```
$1 = $2
```
 

To replace the get_X() code use the following expression in Visual Studio's Find and Replace dialog:

```
get_([a-zA-Z_]+)\(\)
```

Replace:

```
$1
```

To replace the add_X(Y) event handler hookups in Visual Studio's Find and Replace dialog:

```
add_([a-zA-Z_]+)\((.+)\)
```

Replace:

```
$1 += $2
```

Have a great day!