Like me, you may have read in various books and articles that there exists a restriction of one WorkflowRuntime instance for each App Domain. This is, in fact, not true. In an early beta release of WF such a restriction existed, and this fact has been perpetuated even though the restriction has long since been removed.

The following code sample is a simple demonstration to show that there is no problem creating multiple WorkflowRuntime instances. 

```csharp
 static void Main(string[] args)
{
	/* First instance of the workflow runtime. */
    WorkflowRuntime workflowRuntime1 = new WorkflowRuntime();

    AutoResetEvent waitHandle = new AutoResetEvent(false);
    workflowRuntime1.WorkflowCompleted 
		+= ((sender, e) => Console.WriteLine("Workflow 1 completed."));
    workflowRuntime1.WorkflowTerminated 
		+= ((sender, e) => Console.WriteLine(e.Exception.Message));

	{% raw %}var parameters = new Dictionary<string, object> {{"Identifier", "Workflow 1"}};{% endraw %}
	WorkflowInstance instance1 = workflowRuntime1.CreateWorkflow(
		typeof(MultiRuntime.Workflow1), parameters);
    instance1.Start();

	/* Second instance of the workflow runtime. */
	WorkflowRuntime workflowRuntime2 = new WorkflowRuntime();

	workflowRuntime2.WorkflowCompleted += delegate
	{
		Console.WriteLine("Workflow 2 completed.");
		waitHandle.Set();
	};
	workflowRuntime2.WorkflowTerminated += delegate(
		object sender, WorkflowTerminatedEventArgs e)
	{
		Console.WriteLine(e.Exception.Message);
		waitHandle.Set();
	};

	parameters = new Dictionary<string, object> { { "Identifier", "Workflow 2" } };
	WorkflowInstance instance2 = workflowRuntime2.CreateWorkflow(
		typeof(MultiRuntime.Workflow1), parameters);
	instance2.Start();


    waitHandle.WaitOne();
    Console.ReadKey();

	workflowRuntime1.Dispose();
	workflowRuntime2.Dispose();
}
```

The Workflow1 class contains a code activity that writes a message to console and a delay activity that pauses for five seconds.

And the result:

![Console Window showing output](/assets/images/2008-05-18-Console.jpg)

Download the sample code: [MultiRuntime.zip (27.55 kb)](/Downloads/MultiRuntime.zip)