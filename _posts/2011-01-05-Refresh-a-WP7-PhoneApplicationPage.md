Here is a quick a dirty way to refresh a WP7 page. We use the NavigationService to navigate to the current page. 
There's a catch though (in fact there are two but we'll get to the second in a moment), we need to make a change to the Uri, 
else the NavigationService thinks we are trying to perform fragment navigation, which is not supported, and will raise an exception. 
A work-around is to tack a query string on the end, as shown in the following example:

```csharp
void Button_Click(object sender, RoutedEventArgs e)
{
	NavigationService.Navigate(new Uri(NavigationService.Source + "?Refresh=true", UriKind.Relative));
}
```

Keep in mind that this will cause the page to be placed on the history stack, which is not desirable as the hardware back button will cause the page to refresh, again.

Now the trouble with this approach, as [Scott Cate](http://scottcate.com/) points out, is that we end up having multiple query string parameters appended. 
Here is another approach that uses a counter:

 
```csharp
static int refreshCount;
 
void Button_Click(object sender, RoutedEventArgs e)
{
	Debug.WriteLine(NavigationService.Source);
	string url = NavigationService.Source.ToString();
 
	if (!url.Contains("RefreshCount="))
	{
		if (NavigationContext.QueryString.Count < 1)
		{
			url += "?RefreshCount=" + ++refreshCount;
		}
		else
		{
			url += "&RefreshCount=" + ++refreshCount;
		}
	}
	else
	{
		url = Regex.Replace(url, @"RefreshCount=+\d", "RefreshCount=" + ++refreshCount);
	}
	NavigationService.Navigate(new Uri(url, UriKind.Relative));
}
```

I don't particularly recommend refreshing a page. It would be best to replace the datacontext for a page. But if you absolutely must, there you have it.