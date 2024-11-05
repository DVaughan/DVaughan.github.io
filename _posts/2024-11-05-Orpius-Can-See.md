---
categories: Orpius
title: Orpius can see!
published: true
---

Orpius now supports image retrieval and analysis! 

Orpius can download images, analyze them, perform activities based on what it sees.
Combined with the scheduling capabilities of Orpius, 
it works even when you're sleeping, making for one heck of a powerful tool.

I've also added an exciting feature revealed near the end of this post (hint: it changes how you'll see things entirely).

Btw., in-case you're reading this as a repost, my name's Daniel, 
and my co-founder Katka and I are creating Orpius, an Autonomous Business Operations Platform (ABOP).

So, let's take a look.

In this first screenshot, you see I ask Orpius to examine an image on the web.

The image is supplied to the language model, 
and also passed in a message to the Orpius Console application, 
so the user can see it too.

![Example image](/assets/images/2024_11_05/Image1.png)

When I try this in ChatGPT, I see:

![ChatGPT response](/assets/images/2024_11_05/ChatGptResponse.png)

Next, I give it a more interesting thing to analyze. 
It's another image retrieved via http, but this time from a video feed capture.

![Cam view cinema](/assets/images/2024_11_05/Image2.png)

Orpius is able to leverage the analysis information across all its plugins; web search, 
web page downloading, scheduling, team management, notifications; 
and for anything we can't think of up front, it can compile and execute its own code in an isolated environment.

In the next screenshot, I ask Orpius to analyze the image at 5-minute intervals. 
I ask it to email me the analysis each time. 
You see how the schedule item shows up in the Schedule view. 
When the schedule comes around, Orpius passes the task off to an AI agent, 
which will do its thing.

Btw, Orpius runs in the cloud, so there's no need for Orpius Console to remain open. 

![Schedule item added](/assets/images/2024_11_05/Image4.png)

With Orpius you can create various schedule types: 
interval, hourly, daily, monthly, yearly; with repetition limiting and schedule expiry, 
all with time-zone awareness for team scheduling.

In this case, when the interval duration is reached, Orpius shoots me an email (shown below). 
Look, it even got the makes of the cars. Splendid! 

![Email from Orpius](/assets/images/2024_11_05/Image4_1.png)

If we wanted to, we could also update a spreadsheet with the data, 
call an external system... you name it.

Live updates are sent to all team members using the Orpius Console. 
Orpius has team support. 
In the next screenshot you see the repetition count updated in real-time.

Team members can work on activities together; sharing files and tasks. 
Team members can also be AI agents. But more on that in a future post.

![Repetitions updated](/assets/images/2024_11_05/Image5.png)

So, after I witnessed what Orpius could do with an image source, 
I got excited about the ability to hook it up to a real video feed.
I was pacing back and forth, my mind alight with the possibilities.
So, that's what I did. I introduced real time streaming protocol support.

I found an old Amcrest camera, which I last used as a baby cam for my daughter 
a few years ago, and I set to work creating the Orpius plugin 
and infrastructure to make it all happen.

In the next screenshot you see that I tell Orpius to analyze the video from the rtsp://... stream.
The camera is pointing out the window of my house.

Notice that I don't specify a password directly. Orpius has a 'secrets system' 
that parses code and API calls allowing you (the user) to define secrets 
that are never sent to the LLM service, such as OpenAI or Claude. 
Which is a big deal if you're concerned about security and privacy.

Orpius knows that it can use secret values encoded as <#=TokenKey:TokenValue%>,
the system takes care of populating the values without passing them to the LLM service.

Btw., I chose that old-school '<#=' funky syntax because its less common these days, 
and less likely to conflict with other styles.

![RTSP image capture of the front of my house](/assets/images/2024_11_05/Image6.png)

I'm chuffed about these new Orpius features. I'm also currently adding event driven support, 
where webhooks can be used to trigger workflows within Orpius. 
This feature will bring in support for movement activation for cams. 
I knew that webhooks would be an eventuality down the track,
but seeing how useful it would be with the real time streaming support, 
it motivated me to get it in place now. 
It could make for a great security/monitoring system. What do you think?

Want more info, add a comment below or visit Orpius.com. 
Feel free to reach out to me directly.

#AgenticAI #AgenticRAG #avaloniaui
