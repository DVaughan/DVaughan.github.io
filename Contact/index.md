---
title: Daniel Vaughan - Contact
heading: Contact
layout: page
customjs:
 - Contact.js
---

<div class="col-lg-6">
<div class="contact-form-cont">
<h3>Contact Us</h3>
<form action="https://formspree.io/danielvaughan@outcoder.com" method="post">
    <input type="text" name="name" class="form-control" placeholder="Name" />
    <p class="help-block"></p>
    <input type="email" name="_replyto" id="email" class="form-control" placeholder="Email" />
    <p class="help-block"></p>
    <textarea type="text" name="MessageBody" class="form-control" placeholder="Message"></textarea>
    <input type="hidden" name="_next" value="http://danielvaughan.org/FormSubmitted/" />
    <input type="hidden" name="_subject" value="Contact" />
    <input type="hidden" name="_format" value="plain" />
    <input type="text" name="_gotcha" style="display:none" />
    <p class="help-block"></p>
    <input type="submit" value="Send" id="validate" class="btn btn-primary btn-xl" />
</form>
</div>
</div>

<h2 id='result'></h2>