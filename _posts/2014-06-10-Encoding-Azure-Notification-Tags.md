---
categories: Cloud Azure
---

I'm in process of enabling some cloud services for [Surfy](http://surfybrowser.com/), the web browser app for Windows Phone. 
Part of this process has involved leveraging Azure Notification hubs. 
A notification hub allows you to send notifications to a host of different devices, including Windows Phone, Windows, 
and even Android and iOS devices. 
Also, notification hubs are rather flexible. 
They use a tag system, whereby a client app can send a list of strings along during channel registration that allows the server to selectively include or exclude the client when dispatching notifications. 
You can find out more about the tag system [here](http://msdn.microsoft.com/en-us/library/dn530749.aspx).

One thing to be mindful of when implementing your notification subsystem around Azure Notification hubs is that tags can only contain alphanumeric and the following non-alphanumeric characters: 

```
_ @ # . : - 
```

That's fine and easy to manage if you are working with a simple set of strings, but an extra encoding step is required if you wish to pass e.g. identifiers that contain illegal characters. 
My first inclination was to simply encode tags that may contain illegal characters using [Base64](http://en.wikipedia.org/wiki/Base64) encoding. 
Base64, however, doesn't quite fit the bill. It uses '+', '-', and '='. So, here's a quick and simple approach that encodes to Base64 while removing those pesky illegal characters from the mix:

```csharp
static string EncodeAsNotificationTag(string plainText)
{
    byte[] plainTextBytes = System.Text.Encoding.UTF8.GetBytes(plainText);
    string base64Encoded = Convert.ToBase64String(plainTextBytes);
    string result = base64Encoded.Replace('/', '_').Replace('+', '-').Replace('=', ':');
    return result;
}

static string DecodeNotificationTag(string tag)
{
    string base64Encoded = tag.Replace('_', '/').Replace('-', '+').Replace(':', '=');
    byte[] base64EncodedBytes = Convert.FromBase64String(base64Encoded);
    return System.Text.Encoding.UTF8.GetString(base64EncodedBytes, 0, base64EncodedBytes.Length);
}
```

Good luck with your Azure cloud enabled apps!