When you're building apps for multiple platforms or deployment scenarios, it is important to manage your app's configuration in a way that reduces friction and allows you to plainly separate app configurations for each scenario. Having your app's package manifest file lumped in with your code can lead to silly errors or require a laborious set of steps whenever you perform an app update.

For these reasons I like to separate the entry point of my app and it's accompanying configuration by placing it into, what I'll call, a launcher project. I place the guts of my app in a secondary project. Launcher projects remain absent of all but deployment specific artifacts. Pages and so forth are placed in a secondary project.

In Visual Studio this is akin to using a shared project for the core of your application. So, why not use a shared project then, since shared projects offer greater framework flexibility? Well, shared projects don't allow linked files. If you need to link in files then you may have cause to go for a launcher project instead.

Once you have set up your two project you may find your app raising an AccessViolationException. Don't despair, there is a cure.

The cause of the AccessViolationException in this case is a missing XAML page from your launcher app. If you happen to remove MainPage.xaml, from your entry point project, such that no other .xaml pages remain, then an AccessViolationException is raised when the root frame attempts to perform a navigation. Creating a Dummy.xaml page makes the exception go away.

So there you have it: lean launcher projects supporting multiple deployment scenarios. Just remember to retain a single XAML page in your launcher project.