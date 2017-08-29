---
categories: JavaScript Knockout
redirect_from:
 - /post/Knockout-Inline-Binding-Handlers.aspx.html
---

Recently I've been working on a HTML5 single page application (SPA). 
I've been relying Knockout with Script#. Nearly all of my application logic is in C#, 
which has allowed me to reuse a lot of my previously thought out approaches to validation and so forth. 
I complement that with smatterings of JS in the form of binding handlers and so forth. I'm really pleased with this approach so far.

I've been finding myself creating Knockout binding handlers for a lot of one off cases. 
To avoid this I've taken an approach that allows you to place your init and update logic in the binding itself. 
I don't recommend using this everywhere, but under some circumstances it has proved useful, and it may prove useful for you too.

It works by creating a Knockout binding handler in the usual manner; placing it in a script file available to your page. 
The binding handler simply calls through to the bound function, allowing you to place your logic right in the data binding itself. 
The following shows the binding handler:

```javascript
ko.bindingHandlers.inline = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel)
    {
        var boundFunction = ko.utils.unwrapObservable(valueAccessor().init);

        if (boundFunction)
        {
            boundFunction(element, valueAccessor, allBindingsAccessor, viewModel);
        }
    },
    update: function(element, valueAccessor, allValuesAccessor, viewModel) {
        var boundFunction = ko.utils.unwrapObservable(valueAccessor().update);

        if (boundFunction)
        {
            boundFunction(element, valueAccessor, allValuesAccessor, viewModel);
        }
    }
};
```

The binding handler simply calls through to your init and update functions defined within your value accessor binding.

I have a page that is bound to a viewmodel that takes care of displaying a jQuery dialog. 
The dialog content itself is resolved using an external template. All of this is wired up in the data binding, as shown in the following excerpt:

```html
<div id="CustomDialogContent" 
     data-bind="inline: { init: function (element) { $(element).dialog({ autoOpen: false }); }, 
                          update: function (element) { $(element).dialog(DialogOpen() ? 'open' : 'close'); }}">
        <div data-bind="template: { name: function() { return DialogTemplate(); }, data: DialogDataContext }" class="ocDialogBody"></div>  
</div> 
```

So, there you have it, a handy little tip for reducing the number of one off binding handlers in your JS app.