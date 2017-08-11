---
categories: XAML T4
---

![T4 metadata generation flow](/assets/images/2009-09-03-Header.jpg)

This article is an elaboration of my previous experimentation with T4 (Text Template Transformation Toolkit) and describes how to use T4, 
which is built into Visual Studio 2008, and the Visual Studio automation object model API, to generate member and type information 
for an entire project. Generated metadata can then be applied to such things as dispensing with string literals 
in XAML binding expressions and overcoming the `INotifyPropertyChanged` property name string code smell, 
or indeed any place you need to refer to a property, method, or field by its string name. 
There is also experimental support for obfuscation, so member names can be retrieved correctly even after obfuscation. 
I've also ported the template to VB.NET, so our VB friends can join in on the action too.

[Read on...](http://www.codeproject.com/KB/codegen/T4Metadata.aspx)