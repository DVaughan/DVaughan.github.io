For a while I've been using Dotfuscator to obfuscate my Windows Phone and UWP apps. It's a great product and PreEmptive have excellent support. 
Recently I ported a large app to Xamarin Android. I was pleased that the obfuscation process was easy to integrate into the build process. 
There's a good starter article [here](https://www.preemptive.com/blog/90-dotfuscator/xamarin-applications-and-dotfuscator/671).

The steps laid out in the article work great if you're only obfuscating the single assembly of your launchable Xamarin Android app project. 
If you have multiple projects then you may have a hiccup, as I did.

My app contains multiple projects. But, only two that I wished to be obfuscated. 
The first is the entry point assembly and the second, a referenced assembly with the bulk of my business logic.

The first indication that something was awry was when the linker was unable to bind to some missing methods in the second assembly. 
I first assumed this was due to me using InternalsVisible to expose some internal classes to the entry assembly. That wasn't it.

When I went to verify that the assemblies in the APK were correctly obfuscated, 
I discovered that only the entry assembly had been obfuscated. The second assembly was unobfuscated (gah!). 
What I soon discovered, despite copying the second assembly back to the release directory, the unobfuscated assembly was making its way into the APK. 
As it turned out, the packaging process relies on any secondary assemblies being present in the following two locations:

* \<AndroidAppProject>\obj\<Obfuscated Build Configuration>\android\assets\
* \<AndroidAppProject>\obj\<Obfuscated Build Configuration>\linksrc\

It appears that either the Xamarin tooling copies assemblies prior to the AfterBuild MSBuild target, 
or that it draws the assemblies from the obj directory of the secondary projects. 
Please note that I am making use of Xamarin's Ahead of Time compilation feature, which may have unduly thrown a spanner into the works.

You can resolve the wrong assembly issue by adding additional post-build copy statements in your Dotfuscator project; 
copying the secondary assemblies into those two directories listed above. That did the trick for me.