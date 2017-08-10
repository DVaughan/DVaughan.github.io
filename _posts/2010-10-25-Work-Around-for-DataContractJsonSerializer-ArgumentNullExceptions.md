If you've tried using a DataContractJsonSerializer or a DataContractSerializer with Push Notification for the Windows Phone, 
you may have experienced an `ArgumentNullException` during deserialization. 
This can happen because the `MemoryStream` is buffered with null characters '\0' that prevent deserialization. 
A solution is to create a new array and copy all bytes except for the trailing nulls, 
as shown in the following excerpt from the downloadable sample code in my upcoming book, [Windows Phone 7 Unleashed](http://www.amazon.com/Windows-Phone-Unleashed-Daniel-Vaughan/dp/0672333481):

```csharp
using (BinaryReader reader = new BinaryReader(bodyStream))
{
	byte[] bodyBytes = reader.ReadBytes((int)bodyStream.Length);

	int lengthWithoutNulls = bodyBytes.Length;
	for (int i = bodyBytes.Length - 1; i >= 0 && bodyBytes[i] == '\0'; 
			i--, lengthWithoutNulls--)
	{
		/* Intentionally left blank. */
	}
 
	byte[] cleanedBytes = new byte[lengthWithoutNulls];
	Array.Copy(bodyBytes, cleanedBytes, lengthWithoutNulls);
 
	DataContractJsonSerializer serializer
		= new DataContractJsonSerializer(typeof(StockQuote));
 
	using (MemoryStream stream = new MemoryStream(cleanedBytes))
	{
		StockQuote = (StockQuote)serializer.ReadObject(stream);
	}
}
```

Have a great day!