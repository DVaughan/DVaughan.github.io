---
title: Creating a Toc Addin for Markdown Monster
categories: .NET Markdown-Monster
redirect_from:
 - /post/Creating-a-TOC-Addin-for-Markdown-Monster-using-NET-and-Visual-Studio.aspx.html
---

I've been using [Markdown Monster](https://markdownmonster.west-wind.com/) for a few days and I'm smitten. It's a great tool. 
It was created by none other than [Rick Strahl](https://weblog.west-wind.com/). 
Rick has been contributing to the developer community for many years. I recall reading Rick's blog more than a decade a go. The guy's a legend.

Anyhow, today I was finishing up a large markdown document, when I decided it really needed a table of contents. 
Now, I'm fairly new to markdown and after searching for a while for a way to generate a TOC, I realized, to my disappointment, 
that without jumping through a few hoops, it wasn't going to be easy. So I decided to roll my own TOC generator using Markdown Monster's addin model.

Creating a bare-bones addin was a piece of cake. I downloaded the Markdown Monster Visual Studio Extension 
using Visual Studio's Extension and Updates dialog, restarted Visual Studio, and I was good to go.

Within a minute I had the debugger stepping through the addin while Markdown Monster was running. Too easy.

The addin reads each line of your markdown file, looking for headings. It then generates the TOC based on the depth of each heading.

The addin places the TOC between 'hidden' markers, like so:

```
[//]: # (TOC Begin)
```

TOC is placed here.

```
[//]: # (TOC End)
```

By placing the TOC between the markers, it is able to regenerate, without the user manually replacing the TOC.

Anyway, I've published the project over on GitHub.

I'm pleased I won't have to manually create a TOC for my document and then check it for broken links.

BTW, if the TOC links are not scrolling for you, remove the base element from the head element of the page.

Have a great day!