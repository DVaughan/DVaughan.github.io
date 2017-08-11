---
categories: .NET Collections
title: IEnumerable IsNullOrEmpty
---

`String.IsNullOrEmpty` is a commonly used method for determining whether a string is null or has a zero length. 
But, no such method exists in the FCL for collections. A moment ago I whipped up an extension method for `IEnumerable` types. It's not rocket science, but I thought I would post it anyway.

```csharp
public static class Extensions
{
    /// <summary>
    /// Determines whether the collection is null or contains no elements.
    /// </summary>
    /// <typeparam name="T">The IEnumerable type.</typeparam>
    /// <param name="enumerable">The enumerable, which may be null or empty.</param>
    /// <returns>
    ///     <c>true</c> if the IEnumerable is null or empty; otherwise, <c>false</c>.
    /// </returns>
    public static bool IsNullOrEmpty<T>(this IEnumerable<T> enumerable)
    {
        if (enumerable == null)
        {
            return true;
        }
        /* If this is a list, use the Count property. 
         * The Count property is O(1) while IEnumerable.Count() is O(N). */
        var collection = enumerable as ICollection<T>;
        if (collection != null)
        {
            return collection.Count < 1;
        }
        return enumerable.Any();
    }

    /// <summary>
    /// Determines whether the collection is null or contains no elements.
    /// </summary>
    /// <typeparam name="T">The IEnumerable type.</typeparam>
    /// <param name="collection">The collection, which may be null or empty.</param>
    /// <returns>
    ///     <c>true</c> if the IEnumerable is null or empty; otherwise, <c>false</c>.
    /// </returns>
    public static bool IsNullOrEmpty<T>(this ICollection<T> collection)
    {
        if (collection == null)
        {
            return true;
        }
        return collection.Count < 1;
    }
}
```

`IEnumerable.Count` is O(N), while `List.Count` is O(1), hence the test for the `IList` type.